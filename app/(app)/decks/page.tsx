import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { DeckIllustration } from "@/components/ui/deck-illustration";
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-dark dark:text-purple">Your library</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight">Decks</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">One colourful home for every subject.</p>
        </div>
        <NewDeckForm />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error.message}</p>}

      {decks && decks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => {
            const colors = DECK_COLOR_CLASSES[deck.color as DeckColor] ?? DECK_COLOR_CLASSES.slate;
            return (
              <Link key={deck.id} href={`/decks/${deck.id}`}>
                <Card interactive className="flex min-h-36 flex-col items-start gap-5">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${colors.light} ${colors.text} text-xl font-black`}
                  >
                    {deck.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 w-full flex-1">
                    <span className="block truncate text-lg font-black">{deck.name}</span>
                    {deck.description && (
                      <span className="mt-0.5 block truncate text-sm opacity-60">
                        {deck.description}
                      </span>
                    )}
                    <span className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
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
            <DeckIllustration className="mx-auto h-16 w-16" />
            <p className="mt-3 text-sm opacity-70">No decks yet. Create one to get started.</p>
          </div>
        )
      )}
    </div>
  );
}
