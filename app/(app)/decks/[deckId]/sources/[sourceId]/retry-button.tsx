"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryExtractButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/sources/${sourceId}/extract`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={retry}
      disabled={busy}
      className="rounded-md border border-black/20 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
    >
      {busy ? "Trying again…" : "Try again"}
    </button>
  );
}
