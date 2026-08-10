"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

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

  return (
    <div className="space-y-3">
      {status === "running" && (
        <div className="space-y-1">
          <ProgressBar value={current} max={total || 1} />
          <p className="text-xs opacity-60">
            Reading page {current + 1}
            {total ? ` of ${total}` : ""}…
          </p>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      {status !== "running" && (
        <div className="flex flex-wrap gap-2">
          {(alreadyDone === 0 || status === "error" || current < total) && (
            <Button onClick={() => run()}>
              {alreadyDone > 0 || status === "error"
                ? `Resume from page ${Math.max(current, alreadyDone) + 1}`
                : "Read the pages properly"}
            </Button>
          )}

          {alreadyDone > 0 && (
            <Button variant="ghost" onClick={startOver}>
              Read again from page 1
            </Button>
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
