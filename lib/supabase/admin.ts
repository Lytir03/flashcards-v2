import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Service-role client. BYPASSES RLS — every row in the database is readable
 * and writable through it.
 *
 * Only for writes the user must not be able to forge:
 *   - SM-2 recomputation in /api/reviews
 *   - challenge scoring in /api/challenges/[id]/answer
 *   - the daily reminder job
 *
 * Always check the caller's identity with the regular server client first,
 * then use this to write. The `server-only` import makes the build fail if
 * this file is ever pulled into a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv().supabaseSecretKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
