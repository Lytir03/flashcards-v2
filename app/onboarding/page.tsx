import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { DeckIllustration } from "@/components/ui/deck-illustration";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const { user, profile } = await requireUser();
  if (profile?.onboarded_at) redirect("/dashboard");

  const suggestedUsername = (user.email ?? "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-brand/10" />
      <div className="absolute -bottom-24 -right-20 size-80 rounded-full bg-accent/10" />
      <section className="relative w-full max-w-md rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-800 sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand text-white shadow-[0_4px_0_#46a302]">
            <Sparkles className="size-6" strokeWidth={3} />
          </span>
          <DeckIllustration className="h-16 w-16" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-brand">One last step</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Make this space yours.</h1>
        <p className="mb-7 mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Your name appears on leaderboards. Friends will use your username to challenge you.
        </p>

        <OnboardingForm
          defaultDisplayName={profile?.display_name ?? ""}
          defaultUsername={suggestedUsername}
        />
      </section>
    </main>
  );
}
