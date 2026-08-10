"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Math as MathText } from "@/components/ui/math";

export type Question = {
  id: string;
  position: number;
  question: string;
  choices: string[];
};

type Feedback = { isCorrect: boolean; correctIndex: number };

/**
 * Both players compute the current question from wall-clock time against
 * `startedAt`, independently — no server push, no shared "current question"
 * state. That's what makes a page refresh or a slow network recover for
 * free, and it's consistent with "no WebSocket server to host": the only
 * thing actually pushed between the two browsers is Realtime rows, not
 * pacing.
 */
export function ChallengeRoom({
  challengeId,
  startedAt,
  secondsPerQuestion,
  questions,
  opponentName,
  opponentAnswered,
}: {
  challengeId: string;
  startedAt: string;
  secondsPerQuestion: number;
  questions: Question[];
  opponentName: string;
  opponentAnswered: number;
}) {
  const startedAtMs = useState(() => new Date(startedAt).getTime())[0];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(secondsPerQuestion * 1000);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [selections, setSelections] = useState<Record<number, number | null>>({});
  const answeredRef = useRef<Set<number>>(new Set());

  async function submit(index: number, selectedIndex: number | null, responseMs: number) {
    if (answeredRef.current.has(index)) return;
    answeredRef.current.add(index);
    setSelections((prev) => ({ ...prev, [index]: selectedIndex }));

    const question = questions[index];
    const response = await fetch(`/api/challenges/${challengeId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: question.id,
        selected_index: selectedIndex,
        response_ms: Math.round(responseMs),
      }),
    });
    const data = await response.json().catch(() => null);
    if (data?.ok) {
      setFeedback((prev) => ({ ...prev, [index]: { isCorrect: data.isCorrect, correctIndex: data.correctIndex } }));
    }
  }

  useEffect(() => {
    const questionMs = secondsPerQuestion * 1000;

    const tick = () => {
      const elapsed = Date.now() - startedAtMs;
      const index = Math.floor(elapsed / questionMs);
      setCurrentIndex(Math.min(index, questions.length));
      setRemainingMs(Math.max(0, questionMs - (elapsed - index * questionMs)));

      // Auto-submit a timeout for any question whose window has fully
      // passed without a manual answer, so the request count still reaches
      // question_count * 2 even if the player never clicks.
      for (let i = 0; i < Math.min(index, questions.length); i++) {
        if (!answeredRef.current.has(i)) {
          void submit(i, null, questionMs);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAtMs, secondsPerQuestion, questions.length]);

  const mySelection = selections[currentIndex];
  const answered = mySelection !== undefined;

  const choose = useCallback(
    (choiceIndex: number) => {
      if (answered) return;
      const questionShownAt = startedAtMs + currentIndex * secondsPerQuestion * 1000;
      void submit(currentIndex, choiceIndex, Date.now() - questionShownAt);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answered, currentIndex, startedAtMs, secondsPerQuestion],
  );

  if (currentIndex >= questions.length) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm opacity-60">Finishing up…</p>
      </div>
    );
  }

  const question = questions[currentIndex];
  const myFeedback = feedback[currentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span>{opponentName} has answered {opponentAnswered}</span>
        <span>{Math.ceil(remainingMs / 1000)}s</span>
      </div>

      <div className="min-h-32 rounded-lg border border-black/10 p-6 dark:border-white/10">
        <MathText className="block text-lg">{question.question}</MathText>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.choices.map((choice, index) => {
          const isCorrectChoice = myFeedback && index === myFeedback.correctIndex;
          const isMyWrongPick = answered && index === mySelection && myFeedback && !myFeedback.isCorrect;

          return (
            <button
              key={index}
              onClick={() => choose(index)}
              disabled={answered}
              className={
                "rounded-md border px-3 py-3 text-left text-sm disabled:cursor-default " +
                (isCorrectChoice
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : isMyWrongPick
                    ? "border-red-500/60 bg-red-500/10"
                    : "border-black/15 dark:border-white/15") +
                (!answered ? " hover:bg-black/5 dark:hover:bg-white/5" : " opacity-70")
              }
            >
              <MathText>{choice}</MathText>
            </button>
          );
        })}
      </div>

      {answered && (
        <p className="text-center text-sm opacity-60">
          {mySelection === null
            ? "Time's up."
            : myFeedback
              ? myFeedback.isCorrect
                ? "Correct."
                : "Not quite."
              : "Answer recorded."}{" "}
          Waiting for the timer…
        </p>
      )}
    </div>
  );
}
