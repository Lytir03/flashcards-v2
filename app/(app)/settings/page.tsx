import { requireOnboardedUser } from "@/lib/auth";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { profile } = await requireOnboardedUser();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Make it yours</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">Settings</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Tune your profile and choose when you want a gentle reminder.
        </p>
      </div>

      <div className="max-w-xl rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <SettingsForm
          displayName={profile?.display_name ?? ""}
          courseOfStudy={profile?.course_of_study ?? ""}
          timezone={profile?.timezone ?? "Europe/Rome"}
          reminderHour={profile?.reminder_hour ?? 8}
          dailyEmailEnabled={profile?.daily_email_enabled ?? true}
        />
      </div>
    </div>
  );
}
