import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Supabase client for Server Components, Server Actions and route handlers.
 * Acts as the signed-in user, so RLS applies. Must be created per request —
 * never hoist it to a module-level constant, or one user's session leaks
 * into another's request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Safe to ignore: proxy.ts
            // refreshes the session on every request.
          }
        },
      },
    },
  );
}
