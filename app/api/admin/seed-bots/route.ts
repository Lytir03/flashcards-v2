import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BotSkillLevel } from "@/lib/challenge/bot";

export const maxDuration = 60;

/**
 * The fixed practice-bot roster (see docs on Slice 6 for why: random
 * matchmaking needs a user pool this app doesn't have). Run once per
 * environment — this route is idempotent, so re-running it is harmless.
 */
const ROSTER: { username: string; displayName: string; skill: BotSkillLevel }[] = [
  { username: "rookie_rex", displayName: "Rex", skill: "novice" },
  { username: "quiz_otter", displayName: "Otter", skill: "casual" },
  { username: "flash_falcon", displayName: "Falcon", skill: "sharp" },
  { username: "brainy_fox", displayName: "Fox", skill: "ace" },
];

/**
 * Bots need a real auth.users row for the profiles FK to hold, so they're
 * created through the admin API rather than a SQL migration (GoTrue's
 * required columns — encrypted_password, confirmation tokens, etc. — aren't
 * a stable thing to hand-write in SQL). No password is set: these accounts
 * are not sign-in-able by anyone, on purpose.
 *
 * Gated the same way as the reminders cron — a shared secret, checked first,
 * since this is the other route in the app that writes rows on behalf of
 * users who aren't the caller.
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
  const created: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];

  for (const bot of ROSTER) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", bot.username)
      .maybeSingle();

    if (existing) {
      skipped.push(bot.username);
      continue;
    }

    const { data: userResult, error: createError } = await supabase.auth.admin.createUser({
      email: `${bot.username}@bots.flashcards.internal`,
      email_confirm: true,
      user_metadata: { full_name: bot.displayName },
    });

    if (createError || !userResult?.user) {
      failures.push(`${bot.username}: ${createError?.message ?? "no user returned"}`);
      continue;
    }

    // The 0001 trigger already created a bare profile row on signup; fill it in.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: bot.username,
        display_name: bot.displayName,
        is_bot: true,
        bot_skill_level: bot.skill,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", userResult.user.id);

    if (updateError) {
      failures.push(`${bot.username}: ${updateError.message}`);
      continue;
    }

    created.push(bot.username);
  }

  return NextResponse.json({ ok: true, created, skipped, failures });
}
