"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Math as MathText } from "@/components/ui/math";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

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
      <div className="space-y-2">
        <ProgressBar value={secondsPerQuestion * 1000 - remainingMs} max={secondsPerQuestion * 1000} />
        <div className="flex items-center justify-between text-xs font-semibold opacity-60">
          <span>
            Question {currentIndex + 1} / {questions.length}
          </span>
          <span>{opponentName} has answered {opponentAnswered}</span>
          <span>{Math.ceil(remainingMs / 1000)}s</span>
        </div>
      </div>

      <Card className="min-h-40 p-6 sm:p-8">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-purple-dark dark:text-purple">Choose the best answer</p>
        <MathText className="block text-xl font-bold leading-relaxed">{question.question}</MathText>
      </Card>

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
                "rounded-2xl border-2 border-b-4 px-4 py-4 text-left text-sm font-bold transition disabled:cursor-default " +
                (isCorrectChoice
                  ? "border-brand bg-brand-light text-brand-dark dark:bg-brand/10 dark:text-brand"
                  : isMyWrongPick
                    ? "border-danger bg-danger/10 text-danger"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800") +
                (!answered ? " hover:-translate-y-0.5 hover:border-accent/50" : " opacity-70")
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
