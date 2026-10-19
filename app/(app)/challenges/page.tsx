import Link from "next/link";
import { ArrowRight, Plus, Swords, Trophy } from "lucide-react";
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
        <span className="text-sm font-semibold">
          {headline}
          {deckName && <span className="opacity-70"> on {deckName}</span>}
        </span>
        {cta && (
          <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-accent-dark dark:text-accent">
            {cta} <ArrowRight className="size-4" />
          </span>
        )}
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
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#8b5cf6] to-purple p-6 text-white shadow-[0_8px_0_#a568cc] sm:p-8">
        <div className="absolute -right-8 -top-14 size-44 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Friendly competition</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Challenges</h1>
            <p className="mt-2 text-sm font-semibold text-white/80">Turn a shared deck into a quick-fire quiz duel.</p>
          </div>
          <span className="hidden size-20 place-items-center rounded-3xl bg-white/15 sm:grid">
            <Trophy className="size-11" strokeWidth={2.5} />
          </span>
        </div>
        <Link href="/challenges/new" className="relative mt-6 inline-block">
          <Button>
            <Plus className="size-4" strokeWidth={3} /> New challenge
          </Button>
        </Link>
      </div>

      {invitesToMe.length > 0 && (
        <section>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-danger">Invites</h2>
          <div className="mt-3 space-y-3">
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
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-brand-dark dark:text-brand">Active</h2>
          <div className="mt-3 space-y-3">
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
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-gold-dark dark:text-gold">Waiting on others</h2>
          <div className="mt-3 space-y-3">
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
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Recent</h2>
          <div className="mt-3 space-y-3">
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
        <div className="rounded-[2rem] border-2 border-dashed border-purple/50 bg-purple/5 p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-purple text-white shadow-[0_5px_0_#a568cc]">
            <Swords className="size-9" strokeWidth={2.5} />
          </span>
          <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            No challenges yet. Start one from a public deck.
          </p>
        </div>
      )}
    </div>
  );
}
