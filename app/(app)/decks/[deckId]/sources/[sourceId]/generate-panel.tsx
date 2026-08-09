"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GeneratePanel({
  sourceId,
  deckId,
  draftCount,
}: {
  sourceId: string;
  deckId: string;
  draftCount: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [created, setCreated] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Chunk by chunk, loop in the browser — same reasoning as the vision pass.
  async function run() {
    setRunning(true);
    setError(null);
    setCreated(0);

    let chunk = 0;
    let total = Number.MAX_SAFE_INTEGER;
    let made = 0;

    while (chunk < total) {
      const response = await fetch(`/api/sources/${sourceId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Generation failed.");
        setRunning(false);
        return;
      }

      total = data.totalChunks;
      made += data.created ?? 0;
      setCreated(made);
      setProgress({ done: chunk + 1, total });

      if (data.done) break;
      chunk += 1;
    }

    setRunning(false);
    router.push(`/decks/${deckId}/sources/${sourceId}/cards`);
  }

  return (
    <div className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {running ? "Writing cards…" : "Generate flashcards"}
        </button>

        {draftCount > 0 && (
          <a
            href={`/decks/${deckId}/sources/${sourceId}/cards`}
            className="text-sm underline opacity-70 hover:opacity-100"
          >
            {draftCount} drafts waiting for review
          </a>
        )}
      </div>

      {progress && (
        <p className="text-xs opacity-60">
          Passage {progress.done} of {progress.total} · {created} cards so far
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs opacity-50">
        Cards arrive as drafts. Nothing is scheduled for review until you
        approve it, and each card records the page it came from.
      </p>
    </div>
  );
}
