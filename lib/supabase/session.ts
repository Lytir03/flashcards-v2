import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Routes reachable without a session. Everything else redirects to /login.
 *
 * `/api/cron` and `/api/admin` are here on purpose: both are called with no
 * browser session at all (pg_cron's net.http_post for the reminder job; a
 * one-off curl for bot seeding), only an Authorization bearer header the
 * route handler checks itself. Without this, the redirect below fires before
 * that check ever runs and the request silently 307s to /login instead of
 * reaching the handler.
 */
const PUBLIC_PREFIXES = ["/login", "/signup", "/callback", "/auth", "/api/cron", "/api/admin"];

/**
 * Refreshes the Supabase auth token and rewrites the cookies onto the
 * response. Called from proxy.ts on every matched request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser(), not getSession(): it revalidates the token against the auth
  // server. getSession() trusts the cookie, which the client can edit.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
