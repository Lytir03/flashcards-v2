"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Meh, Trophy, X, Zap } from "lucide-react";
import { Math } from "@/components/ui/math";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RATINGS, type Rating } from "@/lib/srs/sm2";

export type ReviewCard = {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  source_id: string | null;
  source_page_number: number | null;
};

const LABELS: Record<Rating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const VARIANTS: Record<Rating, ButtonVariant> = {
  again: "danger",
  hard: "gold",
  good: "primary",
  easy: "secondary",
};

const ICONS: Record<Rating, typeof X> = {
  again: X,
  hard: Meh,
  good: Check,
  easy: Zap,
};

const KEYS: Record<string, Rating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

export function ReviewSession({
  cards,
  deckId,
  practice = false,
}: {
  cards: ReviewCard[];
  deckId: string;
  practice?: boolean;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewCard[]>(cards);
  const [revealed, setRevealed] = useState(false);
  const [showSlide, setShowSlide] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());

  const card = queue[0];

  const answer = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcard_id: card.id,
          rating,
          duration_ms: Date.now() - shownAt,
          mode: practice ? "practice" : "scheduled",
        }),
      });
      const data = await response.json().catch(() => ({}));

      setQueue((previous) => {
        const [head, ...rest] = previous;
        // "Again" sends the card to the back of today's queue rather than to
        // tomorrow. Forgetting something and not being asked again for a day
        // teaches nothing.
        return data.againInSession ? [...rest, head] : rest;
      });

      if (!data.againInSession) setDone((n) => n + 1);
      setRevealed(false);
      setShowSlide(false);
      setShownAt(Date.now());
      setBusy(false);
    },
    [card, busy, shownAt, practice],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (revealed && KEYS[event.key]) {
        event.preventDefault();
        void answer(KEYS[event.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, answer]);

  if (!card) {
    return (
      <div className="space-y-4 py-16 text-center">
        <Trophy className="mx-auto size-14 text-gold" fill="currentColor" strokeWidth={1} />
        <p className="text-2xl font-extrabold">Done for today!</p>
        <p className="text-sm opacity-60">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <Link href={`/decks/${deckId}`} onClick={() => router.refresh()}>
          <Button size="lg">Back to the deck</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <ProgressBar value={done} max={cards.length} />
        <div className="flex items-center justify-between text-xs opacity-60">
          <span>
            {queue.length} left
            {practice && " · practice, the schedule is not affected"}
          </span>
          {card.topic && (
            <span className="rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand-dark dark:bg-brand/10 dark:text-brand">
              {card.topic}
            </span>
          )}
        </div>
      </div>

      <Card className="min-h-48 p-8">
        <Math className="block text-lg">{card.question}</Math>

        {revealed && (
          <>
            <hr className="my-4 border-black/10 dark:border-white/10" />
            <Math className="block opacity-90">{card.answer}</Math>

            {card.source_id && card.source_page_number && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSlide((v) => !v)}
                  className="text-xs underline opacity-60 hover:opacity-100"
                >
                  {showSlide
                    ? "Hide the slide"
                    : `Check against page ${card.source_page_number}`}
                </button>
                {showSlide && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/sources/${card.source_id}/page-image?page=${card.source_page_number}`}
                    alt={`Page ${card.source_page_number}`}
                    className="mt-3 w-full rounded border border-black/10 dark:border-white/10"
                  />
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((rating, index) => {
            const Icon = ICONS[rating];
            return (
              <Button
                key={rating}
                variant={VARIANTS[rating]}
                onClick={() => answer(rating)}
                disabled={busy}
                className="flex flex-col items-center gap-0.5"
              >
                <Icon className="size-4" />
                {LABELS[rating]}
                <span className="block text-[10px] opacity-70">{index + 1}</span>
              </Button>
            );
          })}
        </div>
      ) : (
        <Button size="lg" fullWidth onClick={() => setRevealed(true)}>
          Show answer
          <span className="ml-2 opacity-70">space</span>
        </Button>
      )}
    </div>
  );
}
