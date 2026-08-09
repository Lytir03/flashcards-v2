import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { reminderEmail, type DeckDue } from "@/lib/email/reminder";

export const maxDuration = 60;

/** Kept small so one run always finishes inside the function limit. */
const BATCH = 40;

/** The user's local hour right now, from their stored timezone. */
function localHour(timezone: string): number {
  try {
    return Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    );
  } catch {
    // An invalid timezone should not silently exclude someone from reminders
    // forever; fall back to the project default rather than skipping them.
    return Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Rome",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    );
  }
}

/**
 * Sends the daily reminder to everyone whose local reminder hour is now.
 *
 * Runs hourly, not daily: people pick a time, and a single daily run could only
 * ever honour one timezone. The hourly sweep is what makes reminder_hour mean
 * anything.
 *
 * Uses the service-role client — there is no user session behind a cron — and
 * is the one place in the app that reads other people's rows, which is why the
 * shared secret is checked before anything else happens.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("id, display_name, timezone, reminder_hour, current_streak, last_reminded_on")
    .eq("daily_email_enabled", true)
    .or(`last_reminded_on.is.null,last_reminded_on.lt.${today}`)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dueNow = (candidates ?? [])
    .filter((profile) => localHour(profile.timezone) === profile.reminder_hour)
    .slice(0, BATCH);

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const profile of dueNow) {
    const { data: cards } = await supabase
      .from("card_states")
      .select("deck_id, decks(name)")
      .eq("user_id", profile.id)
      .lte("due_on", today)
      .neq("state", "suspended");

    if (!cards || cards.length === 0) {
      // Nothing to say. No "you have 0 cards" email — and no marking as
      // reminded either, so if they approve cards later today they still get
      // one at the next hourly sweep.
      skipped += 1;
      continue;
    }

    const byDeck = new Map<string, DeckDue>();
    for (const card of cards) {
      const name = card.decks?.name ?? "Untitled";
      const entry = byDeck.get(name) ?? { name, count: 0 };
      entry.count += 1;
      byDeck.set(name, entry);
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) {
      skipped += 1;
      continue;
    }

    const message = reminderEmail({
      name: profile.display_name?.split(" ")[0] ?? "there",
      total: cards.length,
      decks: [...byDeck.values()].sort((a, b) => b.count - a.count),
      streak: profile.current_streak,
      siteUrl: publicEnv.siteUrl,
    });

    const result = await sendEmail({ to: email, ...message });

    if (result.ok) {
      // Marked only after a successful send, so a provider outage means a
      // retry next hour rather than a silently skipped day.
      await supabase
        .from("profiles")
        .update({ last_reminded_on: today })
        .eq("id", profile.id);
      sent += 1;
    } else {
      failures.push(result.error);
    }
  }

  return NextResponse.json({
    ok: true,
    considered: candidates?.length ?? 0,
    dueNow: dueNow.length,
    sent,
    skipped,
    failures: failures.slice(0, 5),
  });
}
