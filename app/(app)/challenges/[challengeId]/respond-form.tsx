"use client";

import { useState } from "react";
import { FormError } from "@/components/ui/form";

export function RespondForm({
  challengeId,
  challengerName,
  deckName,
  onResolved,
}: {
  challengeId: string;
  challengerName: string;
  deckName: string;
  onResolved: (result: { status: string; started_at: string | null }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/challenges/${challengeId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) return setError(data.error ?? "Something went wrong.");
    onResolved(data);
  }

  return (
    <div className="space-y-4 rounded-lg border border-black/10 p-6 text-center dark:border-white/10">
      <p className="text-sm">
        <span className="font-medium">{challengerName}</span> challenged you
        on <span className="opacity-70">{deckName}</span>.
      </p>

      <FormError message={error} />

      <div className="flex justify-center gap-3">
        <button
          onClick={() => respond("decline")}
          disabled={busy}
          className="rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-600 disabled:opacity-50 hover:bg-red-500/10"
        >
          Decline
        </button>
        <button
          onClick={() => respond("accept")}
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
