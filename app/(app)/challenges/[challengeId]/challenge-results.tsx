import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  won,
}: {
  participant: Participant;
  result: ResultRow | undefined;
  isMe: boolean;
  won: boolean;
}) {
  return (
    <Card className={won ? "ring-2 ring-brand" : ""}>
      <p className="flex items-center gap-1.5 text-sm font-bold">
        {won && <Trophy className="size-4 text-gold" fill="currentColor" />}
        {isMe ? "You" : participant.display_name}
        {participant.is_bot && ` 🤖 ${participant.bot_skill_level}`}
      </p>
      {result ? (
        <>
          <p className="mt-2 text-2xl font-extrabold">{result.score}</p>
          <p className="text-xs opacity-60">
            {result.correct_count} correct · {Math.round(result.total_time_ms / 1000)}s total
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm opacity-60">…</p>
      )}
    </Card>
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
      {winnerId && results.length > 0 && (
        <Trophy className="mx-auto size-12 text-gold" fill="currentColor" strokeWidth={1} />
      )}
      <p className="text-center text-2xl font-extrabold">{headline}</p>

      <div className="grid grid-cols-2 gap-4">
        <Row
          participant={challenger}
          result={challengerResult}
          isMe={challenger.id === currentUserId}
          won={winnerId === challenger.id}
        />
        <Row
          participant={opponent}
          result={opponentResult}
          isMe={opponent.id === currentUserId}
          won={winnerId === opponent.id}
        />
      </div>

      <div className="flex justify-center gap-4 text-sm font-semibold">
        <Link href="/challenges" className="text-brand-dark underline hover:opacity-80 dark:text-brand">
          Back to challenges
        </Link>
        <Link
          href={`/decks/${deckId}/leaderboard`}
          className="text-brand-dark underline hover:opacity-80 dark:text-brand"
        >
          View leaderboard
        </Link>
      </div>
    </div>
  );
}
