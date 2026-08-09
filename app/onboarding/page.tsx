import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Almost there</h1>
      <p className="mt-1 mb-6 text-sm opacity-60">
        Your name shows on leaderboards. Your username is how friends challenge
        you.
      </p>

      <OnboardingForm
        defaultDisplayName={profile?.display_name ?? ""}
        defaultUsername={suggestedUsername}
      />
    </main>
  );
}
