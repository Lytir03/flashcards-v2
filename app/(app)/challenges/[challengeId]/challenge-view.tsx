"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RespondForm } from "./respond-form";
import { ChallengeRoom, type Question } from "./challenge-room";
import { ChallengeResults, type ResultRow } from "./challenge-results";

export type Participant = {
  id: string;
  display_name: string;
  is_bot: boolean;
  bot_skill_level: string | null;
};

type Status = "pending" | "active" | "completed" | "declined" | "expired";

/**
 * Owns the single Realtime channel for this challenge and all status
 * branching. page.tsx is a server component and can't react to a Realtime
 * event on its own — so unlike the review session (which never changes
 * status mid-render), this whole screen has to live in local state seeded
 * from the server's initial fetch, not a static server-computed branch.
 */
export function ChallengeView({
  challengeId,
  deckId,
  deckName,
  currentUserId,
  challenger,
  opponent,
  initialStatus,
  initialStartedAt,
  initialWinnerId,
  secondsPerQuestion,
  questionCount,
  questions,
  initialResults,
}: {
  challengeId: string;
  deckId: string;
  deckName: string;
  currentUserId: string;
  challenger: Participant;
  opponent: Participant;
  initialStatus: string;
  initialStartedAt: string | null;
  initialWinnerId: string | null;
  secondsPerQuestion: number;
  questionCount: number;
  questions: Question[];
  initialResults: ResultRow[];
}) {
  const [status, setStatus] = useState<Status>(initialStatus as Status);
  const [startedAt, setStartedAt] = useState(initialStartedAt);
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [results, setResults] = useState<ResultRow[]>(initialResults);
  const [opponentAnswered, setOpponentAnswered] = useState(0);

  const opponentOf = currentUserId === challenger.id ? opponent : challenger;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`challenge:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_answers",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          if (payload.new.user_id !== currentUserId) {
            setOpponentAnswered((n) => n + 1);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challengeId}`,
        },
        async (payload) => {
          const next = payload.new as {
            status: Status;
            started_at: string | null;
            winner_id: string | null;
          };
          setStatus(next.status);
          setStartedAt(next.started_at);
          setWinnerId(next.winner_id);

          if (next.status === "completed") {
            const { data } = await supabase
              .from("challenge_results")
              .select("user_id, score, correct_count, total_time_ms, outcome")
              .eq("challenge_id", challengeId);
            if (data) setResults(data);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, currentUserId]);

  if (status === "pending") {
    if (currentUserId === opponent.id) {
      return (
        <RespondForm
          challengeId={challengeId}
          challengerName={challenger.display_name}
          deckName={deckName}
          onResolved={(next) => {
            setStatus(next.status as Status);
            setStartedAt(next.started_at);
          }}
        />
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
        <Hourglass className="mx-auto size-8 text-brand" strokeWidth={1.5} />
        <p className="mt-3 text-sm opacity-70">
          Waiting for {opponentOf.display_name} to respond…
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return <p className="py-8 text-center text-sm opacity-60">{opponentOf.display_name} declined this challenge.</p>;
  }

  if (status === "expired") {
    return <p className="py-8 text-center text-sm opacity-60">This challenge expired before it was answered.</p>;
  }

  if (status === "active") {
    if (!startedAt) return null; // transient: UPDATE payload hasn't landed with started_at yet
    return (
      <ChallengeRoom
        challengeId={challengeId}
        startedAt={startedAt}
        secondsPerQuestion={secondsPerQuestion}
        questions={questions}
        opponentName={opponentOf.display_name}
        opponentAnswered={opponentAnswered}
      />
    );
  }

  return (
    <ChallengeResults
      results={results}
      currentUserId={currentUserId}
      challenger={challenger}
      opponent={opponent}
      winnerId={winnerId}
      deckId={deckId}
    />
  );
}
