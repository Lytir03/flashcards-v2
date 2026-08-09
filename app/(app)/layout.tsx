import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Review" },
  { href: "/decks", label: "Decks" },
  { href: "/challenges", label: "Challenges" },
  { href: "/settings", label: "Settings" },
];

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
    <div className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/10">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4 text-sm">
          <Link href="/dashboard" className="font-semibold">
            Flashcards
          </Link>

          <div className="flex gap-4">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="opacity-70 hover:opacity-100">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="opacity-60">{profile?.display_name}</span>
            <form action={signOut}>
              <button type="submit" className="opacity-60 hover:opacity-100">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
