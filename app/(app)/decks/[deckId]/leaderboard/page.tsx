import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const RANK_BADGE = [
  "bg-gold/20 text-gold-dark dark:text-gold", // 1st
  "bg-black/10 text-slate-600 dark:bg-white/10 dark:text-slate-300", // 2nd
  "bg-amber-500/15 text-amber-700 dark:text-amber-400", // 3rd
];

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
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Weekly leaderboard</h1>
        <p className="mt-1 text-sm opacity-60">Human matches this week, ranked by total score.</p>
      </div>

      {rows && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <Card key={row.user_id} className="flex items-center gap-4">
              <span
                className={
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold " +
                  (RANK_BADGE[index] ?? "bg-black/5 opacity-50 dark:bg-white/10")
                }
              >
                {index === 0 ? <Trophy className="size-4" fill="currentColor" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 font-bold">{row.display_name}</span>
              <span className="shrink-0 text-sm opacity-60">
                {row.total_score} pts · {row.wins}/{row.matches_played} won
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-sm opacity-60">No matches on this deck this week yet.</p>
      )}
    </div>
  );
}
