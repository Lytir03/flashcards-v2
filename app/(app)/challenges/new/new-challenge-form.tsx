"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError, Input, Label } from "@/components/ui/form";

type Deck = { id: string; name: string; card_count: number };
type Bot = { username: string; display_name: string; bot_skill_level: string | null };

export function NewChallengeForm({ decks, bots }: { decks: Deck[]; bots: Bot[] }) {
  const router = useRouter();
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [opponentUsername, setOpponentUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!deckId) return setError("Pick a deck.");
    if (!opponentUsername.trim()) return setError("Enter a username.");

    setBusy(true);
    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck_id: deckId, opponent_username: opponentUsername }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) return setError(data.error ?? "Could not create the challenge.");
    router.push(`/challenges/${data.id}`);
  }

  if (decks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/20 p-8 text-center text-sm opacity-60 dark:border-white/20">
        No public deck has enough approved cards yet. Make a deck public and
        approve at least 7 cards to challenge someone on it.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="deck_id">Deck</Label>
        <select
          id="deck_id"
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name} ({deck.card_count} cards)
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="opponent_username">Opponent&apos;s username</Label>
        <Input
          id="opponent_username"
          value={opponentUsername}
          onChange={(event) => setOpponentUsername(event.target.value)}
          placeholder="e.g. flash_falcon"
          required
        />
      </div>

      {bots.length > 0 && (
        <div>
          <p className="text-sm font-medium opacity-80">Or practice against a bot</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bots.map((bot) => (
              <button
                key={bot.username}
                type="button"
                onClick={() => setOpponentUsername(bot.username)}
                className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                {bot.display_name} · {bot.bot_skill_level}
              </button>
            ))}
          </div>
        </div>
      )}

      <FormError message={error} />

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {busy ? "Sending…" : "Send challenge"}
      </button>
    </form>
  );
}
