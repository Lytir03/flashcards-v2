import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { ChallengeView } from "./challenge-view";

export const dynamic = "force-dynamic";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const { supabase, user } = await requireOnboardedUser();

  const { data: challenge } = await supabase
    .from("challenges")
    .select(
      `id, deck_id, status, started_at, seconds_per_question, question_count, winner_id,
       challenger_id, opponent_id,
       decks(name),
       challenger:profiles!challenges_challenger_id_fkey(id, display_name, is_bot, bot_skill_level),
       opponent:profiles!challenges_opponent_id_fkey(id, display_name, is_bot, bot_skill_level)`,
    )
    .eq("id", challengeId)
    .single();

  // RLS already scopes this to participants, so a null row here means either
  // the challenge doesn't exist or the caller isn't part of it — same result.
  if (!challenge || !challenge.challenger || !challenge.opponent) notFound();

  // Only the six columns the 0008 migration grants to `authenticated` come
  // back here — correct_index is never fetchable by this client, at any
  // status, so there is nothing extra to filter out before it reaches props.
  const { data: questions } = await supabase
    .from("challenge_questions")
    .select("id, position, question, choices")
    .eq("challenge_id", challengeId)
    .order("position");

  const { data: results } =
    challenge.status === "completed"
      ? await supabase.from("challenge_results").select("user_id, score, correct_count, total_time_ms, outcome").eq("challenge_id", challengeId)
      : { data: null };

  return (
    <ChallengeView
      challengeId={challenge.id}
      deckId={challenge.deck_id}
      deckName={challenge.decks?.name ?? "Deck"}
      currentUserId={user.id}
      challenger={challenge.challenger}
      opponent={challenge.opponent}
      initialStatus={challenge.status}
      initialStartedAt={challenge.started_at}
      initialWinnerId={challenge.winner_id}
      secondsPerQuestion={challenge.seconds_per_question}
      questionCount={challenge.question_count}
      questions={(questions ?? []).map((q) => ({
        id: q.id,
        position: q.position,
        question: q.question,
        choices: q.choices as string[],
      }))}
      initialResults={results ?? []}
    />
  );
}
