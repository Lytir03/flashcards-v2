import Link from "next/link";
import { BookOpen, ChevronRight, Flame, Sparkles } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DECK_COLOR_CLASSES } from "@/lib/deck-colors";
import type { DeckColor } from "../decks/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardedUser();

  const today = new Date().toISOString().slice(0, 10);

  // One query, grouped in JS. A per-deck count query would be N round trips
  // for a page that is mostly empty on a normal day.
  const { data: due } = await supabase
    .from("card_states")
    .select("deck_id, decks(id, name, color)")
    .eq("user_id", user.id)
    .lte("due_on", today)
    .neq("state", "suspended");

  const byDeck = new Map<string, { name: string; color: DeckColor; count: number }>();
  for (const row of due ?? []) {
    const deck = row.decks;
    if (!deck) continue;
    const entry =
      byDeck.get(deck.id) ?? { name: deck.name, color: deck.color as DeckColor, count: 0 };
    entry.count += 1;
    byDeck.set(deck.id, entry);
  }

  const decksDue = [...byDeck.entries()].sort((a, b) => b[1].count - a[1].count);
  const total = due?.length ?? 0;

  const { count: deckCount } = await supabase
    .from("decks")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Hi {profile?.display_name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm opacity-60">
            {total > 0
              ? `${total} ${total === 1 ? "card" : "cards"} due today.`
              : "Nothing due today."}
          </p>
        </div>

        {!!profile?.current_streak && (
          <div className="flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2 text-gold-dark dark:text-gold">
            <Flame className="size-5" fill="currentColor" />
            <span className="text-lg font-extrabold">{profile.current_streak}</span>
            <span className="text-sm font-semibold opacity-80">day streak</span>
          </div>
        )}
      </div>

      {deckCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <BookOpen className="mx-auto size-10 text-brand" strokeWidth={1.5} />
          <p className="mt-3 text-sm opacity-70">
            No decks yet. A deck is one subject or course.
          </p>
          <Link href="/decks" className="mt-4 inline-block">
            <Button>Create your first deck</Button>
          </Link>
        </div>
      ) : decksDue.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {decksDue.map(([deckId, deck]) => {
            const colors = DECK_COLOR_CLASSES[deck.color] ?? DECK_COLOR_CLASSES.slate;
            return (
              <Link key={deckId} href={`/decks/${deckId}/review`}>
                <Card interactive className="flex items-center gap-4">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${colors.light} ${colors.text} font-extrabold`}
                  >
                    {deck.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{deck.name}</span>
                    <span className="text-sm opacity-60">{deck.count} due</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 opacity-40" />
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <Sparkles className="mx-auto size-10 text-brand" strokeWidth={1.5} />
          <p className="mt-3 text-sm opacity-70">
            Everything reviewed. Come back tomorrow, or{" "}
            <Link href="/decks" className="font-semibold text-brand-dark underline dark:text-brand">
              add material
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
