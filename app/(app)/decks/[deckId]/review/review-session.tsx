"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Math } from "@/components/ui/math";
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
      <div className="space-y-4 py-12 text-center">
        <p className="text-lg font-medium">Done for today.</p>
        <p className="text-sm opacity-60">
          {done} {done === 1 ? "card" : "cards"} reviewed.
        </p>
        <Link
          href={`/decks/${deckId}`}
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          onClick={() => router.refresh()}
        >
          Back to the deck
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>
          {queue.length} left
          {practice && " · practice, the schedule is not affected"}
        </span>
        {card.topic && <span>{card.topic}</span>}
      </div>

      <div className="min-h-48 rounded-lg border border-black/10 p-6 dark:border-white/10">
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
      </div>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((rating, index) => (
            <button
              key={rating}
              onClick={() => answer(rating)}
              disabled={busy}
              className="rounded-md border border-black/15 px-3 py-3 text-sm disabled:opacity-50 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              {LABELS[rating]}
              <span className="mt-0.5 block text-[10px] opacity-40">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Show answer
          <span className="ml-2 opacity-50">space</span>
        </button>
      )}
    </div>
  );
}
