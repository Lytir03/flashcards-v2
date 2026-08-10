import Link from "next/link";
import { Swords } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function opponentLabel(
  displayName: string | null,
  isBot: boolean,
  skill: string | null,
) {
  return isBot ? `${displayName} 🤖 ${skill}` : (displayName ?? "Someone");
}

function ChallengeRow({
  href,
  headline,
  deckName,
  cta,
}: {
  href: string;
  headline: React.ReactNode;
  deckName?: string | null;
  cta?: string;
}) {
  return (
    <Link href={href}>
      <Card interactive className="flex items-center justify-between gap-4">
        <span>
          {headline}
          {deckName && <span className="opacity-70"> on {deckName}</span>}
        </span>
        {cta && <span className="shrink-0 text-sm font-bold text-brand-dark dark:text-brand">{cta}</span>}
      </Card>
    </Link>
  );
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
          <h1 className="text-3xl font-extrabold tracking-tight">Challenges</h1>
          <p className="mt-1 text-sm opacity-60">Quiz duels on a shared deck.</p>
        </div>
        <Link href="/challenges/new">
          <Button>New challenge</Button>
        </Link>
      </div>

      {invitesToMe.length > 0 && (
        <section>
          <h2 className="text-sm font-bold opacity-70">Invites</h2>
          <div className="mt-2 space-y-2">
            {invitesToMe.map((c) => (
              <ChallengeRow
                key={c.id}
                href={`/challenges/${c.id}`}
                deckName={c.decks?.name}
                cta="Respond"
                headline={
                  <>
                    <span className="font-bold">
                      {opponentLabel(c.challenger?.display_name ?? null, c.challenger?.is_bot ?? false, c.challenger?.bot_skill_level ?? null)}
                    </span>{" "}
                    challenged you
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-bold opacity-70">Active</h2>
          <div className="mt-2 space-y-2">
            {active.map((c) => {
              const opponent = c.challenger_id === user.id ? c.opponent : c.challenger;
              return (
                <ChallengeRow
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  deckName={c.decks?.name}
                  cta="Jump back in"
                  headline={
                    <>
                      vs{" "}
                      <span className="font-bold">
                        {opponentLabel(opponent?.display_name ?? null, opponent?.is_bot ?? false, opponent?.bot_skill_level ?? null)}
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {waitingOnOthers.length > 0 && (
        <section>
          <h2 className="text-sm font-bold opacity-70">Waiting on others</h2>
          <div className="mt-2 space-y-2">
            {waitingOnOthers.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-4">
                <span>
                  <span className="font-bold">
                    {opponentLabel(c.opponent?.display_name ?? null, c.opponent?.is_bot ?? false, c.opponent?.bot_skill_level ?? null)}
                  </span>{" "}
                  hasn&apos;t responded yet
                  {c.decks?.name && <span className="opacity-70"> · {c.decks.name}</span>}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-bold opacity-70">Recent</h2>
          <div className="mt-2 space-y-2">
            {recent.map((c) => {
              const opponent = c.challenger_id === user.id ? c.opponent : c.challenger;
              return (
                <ChallengeRow
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  deckName={c.decks?.name}
                  cta="Results"
                  headline={
                    <>
                      vs{" "}
                      <span className="font-bold">
                        {opponentLabel(opponent?.display_name ?? null, opponent?.is_bot ?? false, opponent?.bot_skill_level ?? null)}
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <Swords className="mx-auto size-10 text-brand" strokeWidth={1.5} />
          <p className="mt-3 text-sm opacity-70">
            No challenges yet. Start one from a public deck.
          </p>
        </div>
      )}
    </div>
  );
}
