"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <Button variant="ghost" onClick={retry} disabled={busy}>
      {busy ? "Trying again…" : "Try again"}
    </Button>
  );
}
