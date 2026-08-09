import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RATINGS, schedule, type CardState } from "@/lib/srs/sm2";

const body = z.object({
  flashcard_id: z.uuid(),
  rating: z.enum(RATINGS),
  duration_ms: z.coerce.number().int().min(0).max(600_000).optional(),
  mode: z.enum(["scheduled", "practice"]).default("scheduled"),
});

/**
 * Records one answer: recomputes the card's SM-2 state and appends to the log.
 *
 * The recomputation happens here rather than in the browser so there is a
 * single implementation of the schedule, the one covered by sm2.test.ts. It
 * runs under the user's own RLS rather than the service key: the only thing a
 * user could distort by writing card_states directly is their own revision
 * schedule, which is not a threat worth code.
 */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }
  const { flashcard_id, rating, duration_ms, mode } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: state } = await supabase
    .from("card_states")
    .select("*")
    .eq("user_id", user.id)
    .eq("flashcard_id", flashcard_id)
    .single();

  if (!state) {
    return NextResponse.json(
      { error: "This card is not in your review queue." },
      { status: 404 },
    );
  }

  const current: CardState = {
    easeFactor: Number(state.ease_factor),
    intervalDays: state.interval_days,
    repetitions: state.repetitions,
    lapses: state.lapses,
    state: state.state as CardState["state"],
  };

  const next = schedule(current, rating);

  // Practice deliberately leaves card_states alone. Recalling something two
  // hours after last seeing it says nothing about whether you will remember it
  // in three weeks, and letting it extend the interval would mean that
  // studying extra makes the schedule worse.
  if (mode === "scheduled") {
    const { error: updateError } = await supabase
      .from("card_states")
      .update({
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        state: next.state,
        due_on: next.dueOn,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", state.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Append-only history. Keeps before and after so a scheduling change can be
  // audited, or SM-2 replayed over past answers if the algorithm is tuned.
  await supabase.from("review_logs").insert({
    user_id: user.id,
    flashcard_id,
    deck_id: state.deck_id,
    rating,
    mode,
    // In practice mode nothing moved, so the "new" values are the old ones.
    prev_interval: current.intervalDays,
    new_interval: mode === "scheduled" ? next.intervalDays : current.intervalDays,
    prev_ease: current.easeFactor,
    new_ease: mode === "scheduled" ? next.easeFactor : current.easeFactor,
    duration_ms: duration_ms ?? null,
  });

  // Practice counts towards the streak. It is still studying, and refusing to
  // credit it would push people to burn their due cards just to keep a number.
  await touchStreak(supabase, user.id);

  return NextResponse.json({
    ok: true,
    mode,
    intervalDays: mode === "scheduled" ? next.intervalDays : current.intervalDays,
    dueOn: mode === "scheduled" ? next.dueOn : state.due_on,
    // Interval 0 means the card stays in this session. In practice there is no
    // schedule to consult, so "again" alone decides.
    againInSession:
      mode === "scheduled" ? next.intervalDays === 0 : rating === "again",
  });
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Extends the streak on the first review of a new day. */
async function touchStreak(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_studied_on")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const today = new Date().toISOString().slice(0, 10);
  if (profile.last_studied_on === today) return;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const current =
    profile.last_studied_on === yesterday ? profile.current_streak + 1 : 1;

  await supabase
    .from("profiles")
    .update({
      current_streak: current,
      longest_streak: Math.max(current, profile.longest_streak),
      last_studied_on: today,
    })
    .eq("id", userId);
}
