import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardedUser();

  const today = new Date().toISOString().slice(0, 10);

  // One query, grouped in JS. A per-deck count query would be N round trips
  // for a page that is mostly empty on a normal day.
  const { data: due } = await supabase
    .from("card_states")
    .select("deck_id, decks(id, name)")
    .eq("user_id", user.id)
    .lte("due_on", today)
    .neq("state", "suspended");

  const byDeck = new Map<string, { name: string; count: number }>();
  for (const row of due ?? []) {
    const deck = row.decks;
    if (!deck) continue;
    const entry = byDeck.get(deck.id) ?? { name: deck.name, count: 0 };
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
      <div>
        <h1 className="text-2xl font-semibold">
          Hi {profile?.display_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm opacity-60">
          {total > 0
            ? `${total} ${total === 1 ? "card" : "cards"} due today.`
            : "Nothing due today."}
          {profile?.current_streak ? ` · ${profile.current_streak}-day streak` : ""}
        </p>
      </div>

      {deckCount === 0 ? (
        <div className="rounded-lg border border-dashed border-black/20 p-8 text-center dark:border-white/20">
          <p className="text-sm opacity-70">
            No decks yet. A deck is one subject or course.
          </p>
          <Link
            href="/decks"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Create your first deck
          </Link>
        </div>
      ) : decksDue.length > 0 ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {decksDue.map(([deckId, deck]) => (
            <li key={deckId}>
              <Link
                href={`/decks/${deckId}/review`}
                className="flex items-center justify-between py-4 hover:opacity-70"
              >
                <span className="font-medium">{deck.name}</span>
                <span className="text-sm opacity-50">{deck.count} due</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-black/20 p-8 text-center text-sm opacity-60 dark:border-white/20">
          Everything reviewed. Come back tomorrow, or{" "}
          <Link href="/decks" className="underline">
            add material
          </Link>
          .
        </p>
      )}
    </div>
  );
}
