import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const { supabase } = await requireOnboardedUser();

  const { data: deck } = await supabase.from("decks").select("id, name").eq("id", deckId).single();
  if (!deck) notFound();

  // weekly_leaderboard already excludes any match involving a bot — bots are
  // for practice, not ranking (see 0010_bots.sql).
  const { data: rows } = await supabase
    .from("weekly_leaderboard")
    .select("user_id, display_name, total_score, matches_played, wins")
    .eq("deck_id", deckId)
    .order("total_score", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/decks/${deckId}`} className="text-sm opacity-60 hover:opacity-100">
          ← {deck.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Weekly leaderboard</h1>
        <p className="mt-1 text-sm opacity-60">Human matches this week, ranked by total score.</p>
      </div>

      {rows && rows.length > 0 ? (
        <ol className="divide-y divide-black/10 dark:divide-white/10">
          {rows.map((row, index) => (
            <li key={row.user_id} className="flex items-baseline justify-between gap-4 py-4">
              <span>
                <span className="mr-2 text-sm opacity-40">{index + 1}</span>
                <span className="font-medium">{row.display_name}</span>
              </span>
              <span className="shrink-0 text-sm opacity-50">
                {row.total_score} pts · {row.wins}/{row.matches_played} won
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-8 text-sm opacity-60">
          No matches on this deck this week yet.
        </p>
      )}
    </div>
  );
}
