import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function
 * from `middleware` to `proxy`. A leftover middleware.ts is silently IGNORED
 * at build time — no error — which would leave every protected route publicly
 * reachable. So this file must keep this exact name and export.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
