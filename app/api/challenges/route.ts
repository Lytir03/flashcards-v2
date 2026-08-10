import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/ai/provider";

export const maxDuration = 60;

const QUESTION_COUNT = 7;
const SECONDS_PER_QUESTION = 15;

const body = z.object({
  deck_id: z.uuid(),
  opponent_username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "Not a valid username."),
});

/** Fisher–Yates. Used both to pick cards and to shuffle each question's choices. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Creates a challenge: picks random approved cards from a public deck,
 * generates distractors in ONE model call, and freezes everything into
 * challenge_questions so both players see an identical quiz even if the
 * source flashcards are edited later.
 *
 * Auth pattern matches /api/reviews, not requireOnboardedUser() — this is a
 * JSON API and must return 401, not redirect.
 */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { deck_id, opponent_username } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name, visibility")
    .eq("id", deck_id)
    .single();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }
  if (deck.visibility !== "public") {
    return NextResponse.json(
      { error: "Only public decks can be challenged." },
      { status: 422 },
    );
  }

  const { data: opponent } = await supabase
    .from("profiles")
    .select("id, username, is_bot")
    .eq("username", opponent_username)
    .maybeSingle();

  if (!opponent) {
    return NextResponse.json({ error: "No user with that username." }, { status: 404 });
  }
  if (opponent.id === user.id) {
    return NextResponse.json({ error: "You can't challenge yourself." }, { status: 400 });
  }

  // Dedupe guard: stops accidental double-invites and adds a little friction
  // against farming a bot with repeated matches.
  const { data: existingChallenge } = await supabase
    .from("challenges")
    .select("id")
    .eq("challenger_id", user.id)
    .eq("opponent_id", opponent.id)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingChallenge) {
    return NextResponse.json(
      { error: "You already have an open challenge with this player.", id: existingChallenge.id },
      { status: 409 },
    );
  }

  const { data: candidateCards } = await supabase
    .from("flashcards")
    .select("id, question, answer")
    .eq("deck_id", deck_id)
    .eq("status", "approved");

  if (!candidateCards || candidateCards.length < QUESTION_COUNT) {
    return NextResponse.json(
      {
        error: `This deck only has ${candidateCards?.length ?? 0} approved cards; a challenge needs ${QUESTION_COUNT}.`,
      },
      { status: 422 },
    );
  }

  const picked = shuffle(candidateCards).slice(0, QUESTION_COUNT);

  // Slow/unreliable step first, DB writes after: if this fails, nothing has
  // been written yet, so there is no half-created challenge to clean up.
  const provider = getProvider();
  const distractorResult = await provider.generateDistractors(
    picked.map((card, index) => ({ index, question: card.question, answer: card.answer })),
  );

  if (!distractorResult.ok) {
    return NextResponse.json({ error: distractorResult.error }, { status: 502 });
  }

  const distractorsByIndex = new Map(distractorResult.items.map((item) => [item.index, item]));

  type QuestionRow = {
    flashcard_id: string;
    position: number;
    question: string;
    choices: string[];
    correct_index: number;
  };

  const questions = picked
    .map((card, index): QuestionRow | null => {
      const item = distractorsByIndex.get(index);
      if (!item) return null;

      const shuffledChoices = shuffle([
        { text: card.answer, correct: true },
        ...item.distractors.map((text) => ({ text, correct: false })),
      ]);

      return {
        flashcard_id: card.id,
        position: index,
        question: card.question,
        choices: shuffledChoices.map((c) => c.text),
        correct_index: shuffledChoices.findIndex((c) => c.correct),
      };
    })
    .filter((q): q is QuestionRow => q !== null);

  if (questions.length !== picked.length) {
    return NextResponse.json(
      { error: "The model did not return distractors for every question." },
      { status: 502 },
    );
  }

  // Bots always accept instantly — there's no second human to prompt, so the
  // whole invite/accept step is skipped for them.
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: challenge, error: challengeError } = await admin
    .from("challenges")
    .insert({
      deck_id,
      challenger_id: user.id,
      opponent_id: opponent.id,
      question_count: QUESTION_COUNT,
      seconds_per_question: SECONDS_PER_QUESTION,
      status: opponent.is_bot ? "active" : "pending",
      started_at: opponent.is_bot ? now : null,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: challengeError?.message ?? "Could not create the challenge." },
      { status: 500 },
    );
  }

  const { error: questionsError } = await admin.from("challenge_questions").insert(
    questions.map((q) => ({ ...q, challenge_id: challenge.id })),
  );

  if (questionsError) {
    // Compensating delete: no cross-table transaction exists over two
    // PostgREST calls, and this narrow, fast window doesn't justify the
    // codebase's first Postgres RPC function.
    await admin.from("challenges").delete().eq("id", challenge.id);
    return NextResponse.json({ error: questionsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: challenge.id }, { status: 201 });
}
