import { requireOnboardedUser } from "@/lib/auth";
import { NewChallengeForm } from "./new-challenge-form";

export const dynamic = "force-dynamic";

const QUESTION_COUNT = 7;

export default async function NewChallengePage() {
  const { supabase } = await requireOnboardedUser();

  // Any public deck with enough approved cards to fill a match — not just
  // the caller's own, since RLS already lets everyone read a public deck.
  const { data: decks } = await supabase
    .from("decks")
    .select("id, name, card_count")
    .eq("visibility", "public")
    .gte("card_count", QUESTION_COUNT)
    .order("name");

  const { data: bots } = await supabase
    .from("profiles")
    .select("username, display_name, bot_skill_level")
    .eq("is_bot", true)
    .not("username", "is", null)
    .order("bot_skill_level");

  return (
    <div className="max-w-xl space-y-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-dark dark:text-purple">Pick your rival</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">New challenge</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          A {QUESTION_COUNT}-question quiz on a shared deck.
        </p>
      </div>

      <div className="rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <NewChallengeForm
          decks={decks ?? []}
          bots={(bots ?? []).filter((b): b is typeof b & { username: string } => b.username !== null)}
        />
      </div>
    </div>
  );
}
