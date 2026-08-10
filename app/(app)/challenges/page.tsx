import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function opponentLabel(
  displayName: string | null,
  isBot: boolean,
  skill: string | null,
) {
  return isBot ? `${displayName} 🤖 ${skill}` : displayName ?? "Someone";
}

export default async function ChallengesPage() {
  const { supabase, user } = await requireOnboardedUser();

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      `id, status, created_at, challenger_id, opponent_id,
       decks(name),
       challenger:profiles!challenges_challenger_id_fkey(display_name, is_bot, bot_skill_level),
       opponent:profiles!challenges_opponent_id_fkey(display_name, is_bot, bot_skill_level)`,
    )
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = challenges ?? [];
  const invitesToMe = rows.filter((c) => c.status === "pending" && c.opponent_id === user.id);
  const waitingOnOthers = rows.filter((c) => c.status === "pending" && c.challenger_id === user.id);
  const active = rows.filter((c) => c.status === "active");
  const recent = rows.filter((c) => c.status === "completed").slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Challenges</h1>
          <p className="mt-1 text-sm opacity-60">Quiz duels on a shared deck.</p>
        </div>
        <Link
          href="/challenges/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          New challenge
        </Link>
      </div>

      {invitesToMe.length > 0 && (
        <section>
          <h2 className="text-sm font-medium opacity-70">Invites</h2>
          <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
            {invitesToMe.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.id}`}
                  className="flex items-baseline justify-between gap-4 py-4 hover:opacity-70"
                >
                  <span>
                    <span className="font-medium">
                      {opponentLabel(c.challenger?.display_name ?? null, c.challenger?.is_bot ?? false, c.challenger?.bot_skill_level ?? null)}
                    </span>{" "}
                    challenged you on <span className="opacity-70">{c.decks?.name}</span>
                  </span>
                  <span className="shrink-0 text-sm opacity-50">Respond</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-medium opacity-70">Active</h2>
          <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
            {active.map((c) => {
              const opponent = c.challenger_id === user.id ? c.opponent : c.challenger;
              return (
                <li key={c.id}>
                  <Link
                    href={`/challenges/${c.id}`}
                    className="flex items-baseline justify-between gap-4 py-4 hover:opacity-70"
                  >
                    <span>
                      vs{" "}
                      <span className="font-medium">
                        {opponentLabel(opponent?.display_name ?? null, opponent?.is_bot ?? false, opponent?.bot_skill_level ?? null)}
                      </span>{" "}
                      on <span className="opacity-70">{c.decks?.name}</span>
                    </span>
                    <span className="shrink-0 text-sm opacity-50">Jump back in</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {waitingOnOthers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium opacity-70">Waiting on others</h2>
          <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
            {waitingOnOthers.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-4 py-4">
                <span>
                  <span className="font-medium">
                    {opponentLabel(c.opponent?.display_name ?? null, c.opponent?.is_bot ?? false, c.opponent?.bot_skill_level ?? null)}
                  </span>{" "}
                  hasn&apos;t responded yet · <span className="opacity-70">{c.decks?.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-medium opacity-70">Recent</h2>
          <ul className="mt-2 divide-y divide-black/10 dark:divide-white/10">
            {recent.map((c) => {
              const opponent = c.challenger_id === user.id ? c.opponent : c.challenger;
              return (
                <li key={c.id}>
                  <Link
                    href={`/challenges/${c.id}`}
                    className="flex items-baseline justify-between gap-4 py-4 hover:opacity-70"
                  >
                    <span>
                      vs{" "}
                      <span className="font-medium">
                        {opponentLabel(opponent?.display_name ?? null, opponent?.is_bot ?? false, opponent?.bot_skill_level ?? null)}
                      </span>{" "}
                      on <span className="opacity-70">{c.decks?.name}</span>
                    </span>
                    <span className="shrink-0 text-sm opacity-50">Results</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rows.length === 0 && (
        <p className="py-8 text-sm opacity-60">
          No challenges yet. Start one from a public deck.
        </p>
      )}
    </div>
  );
}
