import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Flame, Sparkles } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeckIllustration } from "@/components/ui/deck-illustration";
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
    <div className="space-y-9">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-[#328cf5] to-[#695cf6] p-6 text-white shadow-[0_8px_0_#168cc5] sm:p-8">
        <div className="absolute -right-10 -top-12 size-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-28 size-40 rounded-full bg-purple/25" />

        <div className="relative max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] backdrop-blur">
              Today&apos;s mission
            </span>
            {!!profile?.current_streak && (
              <span className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-black text-white shadow-[0_3px_0_#d89000]">
                <Flame className="size-4" fill="currentColor" />
                {profile.current_streak} day streak
              </span>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {total > 0
              ? `You have ${total} ${total === 1 ? "card" : "cards"} ready.`
              : `You're all caught up, ${profile?.display_name?.split(" ")[0]}!`}
          </h1>
          <p className="mt-3 max-w-xl text-sm font-semibold text-white/80 sm:text-base">
            {total > 0
              ? "A quick review now will keep those ideas fresh for longer."
              : "Nice work. Explore a deck or add fresh material while your momentum is strong."}
          </p>

          {total > 0 && decksDue[0] && (
            <Link
              href={`/decks/${decksDue[0][0]}/review`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border-b-4 border-brand-dark bg-brand px-6 py-3 font-black uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Start review <ArrowRight className="size-5" strokeWidth={3} />
            </Link>
          )}
        </div>
      </section>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Keep moving</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {decksDue.length > 0 ? "Choose your next deck" : "Your study space"}
          </h2>
        </div>
        <Link href="/decks" className="hidden text-sm font-extrabold text-accent-dark hover:underline dark:text-accent sm:block">
          See all decks
        </Link>
      </div>

      {deckCount === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-white/5">
          <DeckIllustration className="mx-auto h-16 w-16" />
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            No decks yet. A deck is one subject or course.
          </p>
          <Link href="/decks" className="mt-4 inline-block">
            <Button>Create your first deck</Button>
          </Link>
        </div>
      ) : decksDue.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {decksDue.map(([deckId, deck]) => {
            const colors = DECK_COLOR_CLASSES[deck.color] ?? DECK_COLOR_CLASSES.slate;
            return (
              <Link key={deckId} href={`/decks/${deckId}/review`}>
                <Card interactive className="flex items-center gap-4 p-5">
                  <span
                    className={`flex size-13 shrink-0 items-center justify-center rounded-2xl ${colors.light} ${colors.text} text-xl font-black`}
                  >
                    {deck.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{deck.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-slate-400">
                      <BookOpen className="size-4" /> {deck.count} due
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 opacity-40" />
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border-2 border-dashed border-brand/35 bg-brand-light/45 p-10 text-center dark:bg-brand/5">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-[0_5px_0_#46a302]">
            <Sparkles className="size-9" strokeWidth={2.5} />
          </span>
          <p className="mt-5 text-sm font-semibold text-slate-600 dark:text-slate-300">
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
