import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAnswer, matchOutcome } from "@/lib/challenge/scoring";
import { botAnswer, botWrongIndex, type BotSkillLevel } from "@/lib/challenge/bot";

const body = z.object({
  question_id: z.uuid(),
  selected_index: z.number().int().min(0).max(3).nullable(),
  response_ms: z.number().int().min(0),
});

const DUPLICATE_KEY = "23505";

/**
 * Scores one answer and, if that was the last one outstanding, finalises the
 * match. This is the only place a challenge's outcome is decided — nothing
 * here is ever taken from the request body except which question and which
 * choice, per the trust model in docs/01-architecture.md.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answer." }, { status: 400 });
  }
  const { question_id, selected_index, response_ms } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, challenger_id, opponent_id, deck_id, status, question_count, seconds_per_question")
    .eq("id", id)
    .single();

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }
  if (user.id !== challenge.challenger_id && user.id !== challenge.opponent_id) {
    return NextResponse.json({ error: "You're not in this challenge." }, { status: 403 });
  }
  if (challenge.status !== "active") {
    return NextResponse.json({ error: "This challenge isn't active." }, { status: 409 });
  }

  const admin = createAdminClient();

  // correct_index is not readable by the session client at all (see
  // 0008_challenge_security.sql) — only the admin client can score an answer.
  const { data: question } = await admin
    .from("challenge_questions")
    .select("id, challenge_id, correct_index")
    .eq("id", question_id)
    .single();

  if (!question || question.challenge_id !== id) {
    return NextResponse.json({ error: "Question not found in this challenge." }, { status: 403 });
  }

  async function recordAnswer(
    userId: string,
    selectedIndex: number | null,
    responseMs: number,
  ): Promise<{ isCorrect: boolean; points: number }> {
    const isCorrect = selectedIndex !== null && selectedIndex === question!.correct_index;
    const points = scoreAnswer({
      isCorrect,
      responseMs,
      secondsPerQuestion: challenge!.seconds_per_question,
    });

    const { error } = await admin.from("challenge_answers").insert({
      challenge_id: id,
      question_id,
      user_id: userId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
      response_ms: responseMs,
      points,
    });

    // A retried request must not let a client resubmit chasing a better
    // response_ms — return the already-computed values instead of erroring.
    if (error && error.code === DUPLICATE_KEY) {
      const { data: existing } = await admin
        .from("challenge_answers")
        .select("is_correct, points")
        .eq("question_id", question_id)
        .eq("user_id", userId)
        .single();
      if (existing) return { isCorrect: existing.is_correct, points: existing.points };
    }

    return { isCorrect, points };
  }

  const { isCorrect, points } = await recordAnswer(user.id, selected_index, response_ms);

  // Bots can't drive their own browser timer — the free-tier constraint (no
  // background workers, no sub-hourly cron) means nothing runs independently
  // while a human is mid-quiz. So a bot's answer is synthesised here,
  // immediately after the human's own, using the server's own RNG — a human
  // can never dictate whether "the bot" gets a question right.
  const otherUserId = user.id === challenge.challenger_id ? challenge.opponent_id : challenge.challenger_id;

  if (otherUserId) {
    const { data: opponentProfile } = await admin
      .from("profiles")
      .select("is_bot, bot_skill_level")
      .eq("id", otherUserId)
      .single();

    if (opponentProfile?.is_bot && opponentProfile.bot_skill_level) {
      const { data: botExisting } = await admin
        .from("challenge_answers")
        .select("id")
        .eq("question_id", question_id)
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (!botExisting) {
        const decision = botAnswer(
          opponentProfile.bot_skill_level as BotSkillLevel,
          challenge.seconds_per_question,
        );
        const botSelectedIndex = decision.isCorrect
          ? question.correct_index
          : botWrongIndex(question.correct_index);

        await recordAnswer(otherUserId, botSelectedIndex, decision.responseMs);
      }
    }
  }

  const { count } = await admin
    .from("challenge_answers")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", id);

  const allAnswered = (count ?? 0) === challenge.question_count * 2;

  if (allAnswered) {
    const { data: allAnswers } = await admin
      .from("challenge_answers")
      .select("user_id, points, is_correct, response_ms")
      .eq("challenge_id", id);

    const totals = new Map<string, { score: number; correct: number; timeMs: number }>();
    for (const row of allAnswers ?? []) {
      const t = totals.get(row.user_id) ?? { score: 0, correct: 0, timeMs: 0 };
      t.score += row.points;
      t.correct += row.is_correct ? 1 : 0;
      t.timeMs += row.response_ms;
      totals.set(row.user_id, t);
    }

    const challengerTotal = totals.get(challenge.challenger_id) ?? { score: 0, correct: 0, timeMs: 0 };
    const opponentTotal = totals.get(challenge.opponent_id!) ?? { score: 0, correct: 0, timeMs: 0 };
    const outcome = matchOutcome(challengerTotal.score, opponentTotal.score);
    const winnerId =
      outcome.a === "win" ? challenge.challenger_id : outcome.b === "win" ? challenge.opponent_id : null;

    // The WHERE status='active' clause IS the compare-and-swap: Postgres
    // serializes concurrent updates to the same row, so only the request
    // (challenger's or opponent's last answer, whichever commits first) that
    // still finds status='active' gets a non-empty result back and proceeds
    // to write results. The other returns without writing — both browsers
    // still learn the outcome the same way, via the challenges Realtime
    // UPDATE, so it doesn't matter which one "won" this race.
    const { data: finalized } = await admin
      .from("challenges")
      .update({ status: "completed", completed_at: new Date().toISOString(), winner_id: winnerId })
      .eq("id", id)
      .eq("status", "active")
      .select("id")
      .single();

    if (finalized) {
      await admin.from("challenge_results").insert([
        {
          challenge_id: id,
          user_id: challenge.challenger_id,
          deck_id: challenge.deck_id,
          score: challengerTotal.score,
          correct_count: challengerTotal.correct,
          total_time_ms: challengerTotal.timeMs,
          outcome: outcome.a,
        },
        {
          challenge_id: id,
          user_id: challenge.opponent_id!,
          deck_id: challenge.deck_id,
          score: opponentTotal.score,
          correct_count: opponentTotal.correct,
          total_time_ms: opponentTotal.timeMs,
          outcome: outcome.b,
        },
      ]);
    }
  }

  return NextResponse.json({
    ok: true,
    isCorrect,
    points,
    correctIndex: question.correct_index,
    completed: allAnswered,
  });
}
