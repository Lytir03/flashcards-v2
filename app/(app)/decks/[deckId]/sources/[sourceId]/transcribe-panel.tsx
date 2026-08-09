"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "running" | "error" | "done";

export function TranscribePanel({
  sourceId,
  pageCount,
  alreadyDone,
}: {
  sourceId: string;
  pageCount: number | null;
  alreadyDone: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState(alreadyDone);
  const [total, setTotal] = useState(pageCount ?? 0);
  const [error, setError] = useState<string | null>(null);

  async function startOver() {
    await fetch(`/api/sources/${sourceId}/transcribe`, { method: "DELETE" });
    setCurrent(0);
    await run(0);
  }

  // One request per page. The loop lives in the browser so no single server
  // call has to survive a whole document, and progress is visible instead of
  // being a spinner that might mean anything.
  async function run(from = alreadyDone) {
    setStatus("running");
    setError(null);

    let page = from + 1;
    let pages = total || Number.MAX_SAFE_INTEGER;

    while (page <= pages) {
      const response = await fetch(`/api/sources/${sourceId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? `Page ${page} failed.`);
        setStatus("error");
        return;
      }

      pages = data.totalPages;
      setTotal(data.totalPages);
      setCurrent(page);

      if (data.done) {
        setStatus("done");
        router.refresh();
        return;
      }
      page += 1;
    }

    setStatus("done");
    router.refresh();
  }

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {status === "running" && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full bg-slate-900 transition-all dark:bg-slate-100"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs opacity-60">
            Reading page {current + 1}
            {total ? ` of ${total}` : ""}…
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {status !== "running" && (
        <div className="flex flex-wrap gap-2">
          {(alreadyDone === 0 || status === "error" || current < total) && (
            <button
              onClick={() => run()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {alreadyDone > 0 || status === "error"
                ? `Resume from page ${Math.max(current, alreadyDone) + 1}`
                : "Read the pages properly"}
            </button>
          )}

          {alreadyDone > 0 && (
            <button
              onClick={startOver}
              className="rounded-md border border-black/20 px-4 py-2 text-sm dark:border-white/20"
            >
              Read again from page 1
            </button>
          )}
        </div>
      )}

      <p className="text-xs opacity-50">
        Renders each page and has a vision model read it, formulas included.
        Slower than plain extraction — a few seconds per page — but it sees
        what you see.
      </p>
    </div>
  );
}
