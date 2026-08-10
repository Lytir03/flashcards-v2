import Link from "next/link";
import type { Participant } from "./challenge-view";

export type ResultRow = {
  user_id: string;
  score: number;
  correct_count: number;
  total_time_ms: number;
  outcome: string;
};

function Row({
  participant,
  result,
  isMe,
}: {
  participant: Participant;
  result: ResultRow | undefined;
  isMe: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm font-medium">
        {isMe ? "You" : participant.display_name}
        {participant.is_bot && ` 🤖 ${participant.bot_skill_level}`}
      </p>
      {result ? (
        <>
          <p className="mt-2 text-2xl font-semibold">{result.score}</p>
          <p className="text-xs opacity-60">
            {result.correct_count} correct · {Math.round(result.total_time_ms / 1000)}s total
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm opacity-60">…</p>
      )}
    </div>
  );
}

export function ChallengeResults({
  results,
  currentUserId,
  challenger,
  opponent,
  winnerId,
  deckId,
}: {
  results: ResultRow[];
  currentUserId: string;
  challenger: Participant;
  opponent: Participant;
  winnerId: string | null;
  deckId: string;
}) {
  const byUser = new Map(results.map((r) => [r.user_id, r]));
  const challengerResult = byUser.get(challenger.id);
  const opponentResult = byUser.get(opponent.id);

  const headline =
    results.length === 0
      ? "Loading results…"
      : winnerId === null
        ? "It's a draw."
        : winnerId === currentUserId
          ? "You won!"
          : `${winnerId === challenger.id ? challenger.display_name : opponent.display_name} won.`;

  return (
    <div className="space-y-6">
      <p className="text-center text-lg font-medium">{headline}</p>

      <div className="grid grid-cols-2 gap-4">
        <Row participant={challenger} result={challengerResult} isMe={challenger.id === currentUserId} />
        <Row participant={opponent} result={opponentResult} isMe={opponent.id === currentUserId} />
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link href="/challenges" className="underline opacity-70 hover:opacity-100">
          Back to challenges
        </Link>
        <Link href={`/decks/${deckId}/leaderboard`} className="underline opacity-70 hover:opacity-100">
          View leaderboard
        </Link>
      </div>
    </div>
  );
}
