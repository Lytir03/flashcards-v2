"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { FormError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className="space-y-4 p-8 text-center">
      <Swords className="mx-auto size-10 text-brand" strokeWidth={1.5} />
      <p className="text-sm">
        <span className="font-bold">{challengerName}</span> challenged you on{" "}
        <span className="opacity-70">{deckName}</span>.
      </p>

      <FormError message={error} />

      <div className="flex justify-center gap-3">
        <Button variant="ghost" onClick={() => respond("decline")} disabled={busy}>
          Decline
        </Button>
        <Button onClick={() => respond("accept")} disabled={busy}>
          Accept
        </Button>
      </div>
    </Card>
  );
}
