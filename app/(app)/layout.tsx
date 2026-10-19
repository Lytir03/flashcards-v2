import Link from "next/link";
import { Suspense } from "react";
import { Flame, LogOut, Sparkles } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/app/nav-links";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The onboarding gate lives here, not in proxy.ts: proxy runs on every
  // request including static assets, and adding a profile lookup there would
  // cost a DB roundtrip per asset.
  const { profile } = await requireOnboardedUser();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r-2 bg-white/80 px-5 py-6 backdrop-blur-xl dark:bg-[#1c2027]/90 md:flex md:flex-col">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 text-2xl font-black tracking-tight text-brand"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white shadow-[0_4px_0_#46a302]">
            <Sparkles className="size-6" strokeWidth={3} />
          </span>
          Flashcards
        </Link>

        <nav className="mt-10" aria-label="Main navigation">
          <Suspense fallback={<div className="h-60" />}>
            <NavLinks />
          </Suspense>
        </nav>

        <div className="mt-auto rounded-2xl border-2 bg-slate-50 p-3 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple/20 font-black text-purple-dark dark:text-purple">
              {profile?.display_name?.charAt(0).toUpperCase() ?? "?"}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {profile?.display_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 bg-white/90 px-5 py-3 backdrop-blur-xl dark:bg-[#1c2027]/95 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-black text-brand">
          <span className="grid size-8 place-items-center rounded-xl bg-brand text-white">
            <Sparkles className="size-5" strokeWidth={3} />
          </span>
          Flashcards
        </Link>
        <div className="flex items-center gap-3">
          {!!profile?.current_streak && (
            <span className="flex items-center gap-1 font-extrabold text-gold-dark dark:text-gold">
              <Flame className="size-5" fill="currentColor" />
              {profile.current_streak}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-xl p-2 text-slate-400 hover:bg-danger/10 hover:text-danger"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-8 pb-28 sm:px-8 md:py-10 md:pb-12 lg:px-12">
        {children}
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 bg-white/95 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:bg-[#1c2027]/95 md:hidden"
      >
        <Suspense fallback={<div className="h-14" />}>
          <NavLinks compact />
        </Suspense>
      </nav>
    </div>
  );
}
