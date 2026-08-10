import Link from "next/link";
import { Layers } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { DECK_COLOR_CLASSES } from "@/lib/deck-colors";
import type { DeckColor } from "./constants";
import { NewDeckForm } from "./new-deck-form";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const { supabase, user } = await requireOnboardedUser();

  const { data: decks, error } = await supabase
    .from("decks")
    .select("id, name, description, color, visibility, card_count, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Decks</h1>
          <p className="mt-1 text-sm opacity-60">One deck per subject.</p>
        </div>
        <NewDeckForm />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error.message}</p>}

      {decks && decks.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => {
            const colors = DECK_COLOR_CLASSES[deck.color as DeckColor] ?? DECK_COLOR_CLASSES.slate;
            return (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <Card interactive className="flex items-start gap-4">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${colors.light} ${colors.text} font-extrabold`}
                  >
                    {deck.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{deck.name}</span>
                    {deck.description && (
                      <span className="mt-0.5 block truncate text-sm opacity-60">
                        {deck.description}
                      </span>
                    )}
                    <span className="mt-1 flex items-center gap-2 text-xs opacity-50">
                      {deck.card_count} cards
                      {deck.visibility === "public" && (
                        <span className="rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand-dark dark:bg-brand/10 dark:text-brand">
                          public
                        </span>
                      )}
                    </span>
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
            <Layers className="mx-auto size-10 text-brand" strokeWidth={1.5} />
            <p className="mt-3 text-sm opacity-70">No decks yet. Create one to get started.</p>
          </div>
        )
      )}
    </div>
  );
}
