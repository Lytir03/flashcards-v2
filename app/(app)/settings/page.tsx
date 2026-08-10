import { requireOnboardedUser } from "@/lib/auth";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await requireOnboardedUser();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>

      <SettingsForm
        displayName={profile?.display_name ?? ""}
        courseOfStudy={profile?.course_of_study ?? ""}
        timezone={profile?.timezone ?? "Europe/Rome"}
        reminderHour={profile?.reminder_hour ?? 8}
        dailyEmailEnabled={profile?.daily_email_enabled ?? true}
      />
    </div>
  );
}
