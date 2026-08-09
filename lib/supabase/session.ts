import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Routes reachable without a session. Everything else redirects to /login.
 *
 * `/api/cron` is here on purpose: it is called by Supabase pg_cron via
 * net.http_post, which carries no browser session cookie, only the
 * Authorization bearer header the route handler checks against CRON_SECRET.
 * Without this, the redirect below fires before that check ever runs and the
 * reminder job silently 307s to /login instead of sending mail.
 */
const PUBLIC_PREFIXES = ["/login", "/signup", "/callback", "/auth", "/api/cron"];

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
