import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ action: z.enum(["accept", "decline"]) });

/**
 * The opponent responds to a pending invite. Accept and decline share every
 * guard (must be the opponent, must still be pending, must not be expired),
 * so they're one route rather than two.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, opponent_id, status, expires_at")
    .eq("id", id)
    .single();

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }
  if (challenge.opponent_id !== user.id) {
    return NextResponse.json({ error: "This challenge isn't addressed to you." }, { status: 403 });
  }

  const admin = createAdminClient();

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    if (challenge.status === "pending") {
      await admin
        .from("challenges")
        .update({ status: "expired" })
        .eq("id", id)
        .eq("status", "pending");
    }
    return NextResponse.json({ error: "This challenge has expired." }, { status: 410 });
  }

  if (challenge.status !== "pending") {
    return NextResponse.json({ error: "This challenge was already resolved." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const update =
    parsed.data.action === "accept"
      ? { status: "active" as const, started_at: now }
      : { status: "declined" as const };

  // Conditional update guards a double-click race: only the request that
  // still finds status='pending' actually changes anything.
  const { data: updated } = await admin
    .from("challenges")
    .update(update)
    .eq("id", id)
    .eq("status", "pending")
    .select("status, started_at")
    .single();

  if (!updated) {
    return NextResponse.json({ error: "This challenge was already resolved." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: updated.status, started_at: updated.started_at });
}
