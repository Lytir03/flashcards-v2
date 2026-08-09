import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Loads the signed-in user and their profile, or redirects to /login.
 *
 * proxy.ts already blocks anonymous requests, but this is not redundant:
 * proxy runs before the request reaches the route, and a bug in the matcher
 * would silently expose a page. Route-level checks are the ones that actually
 * guard data access.
 */
export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

/** As above, plus a completed onboarding. */
export async function requireOnboardedUser() {
  const ctx = await requireUser();
  if (!ctx.profile?.onboarded_at) redirect("/onboarding");
  return ctx;
}
