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
    <div className="max-w-sm space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">New challenge</h1>
        <p className="mt-1 text-sm opacity-60">
          A {QUESTION_COUNT}-question quiz on a shared deck.
        </p>
      </div>

      <NewChallengeForm
        decks={decks ?? []}
        bots={(bots ?? []).filter((b): b is typeof b & { username: string } => b.username !== null)}
      />
    </div>
  );
}
