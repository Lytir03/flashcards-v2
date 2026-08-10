"use client";

import { useActionState, useState } from "react";
import { FormError, Input, Label, SubmitButton } from "@/components/ui/form";
import { saveSettings, type SettingsState } from "./actions";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function SettingsForm({
  displayName,
  courseOfStudy,
  timezone,
  reminderHour,
  dailyEmailEnabled,
}: {
  displayName: string;
  courseOfStudy: string;
  timezone: string;
  reminderHour: number;
  dailyEmailEnabled: boolean;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    saveSettings,
    undefined,
  );
  const [zone, setZone] = useState(timezone);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <form action={formAction} className="max-w-sm space-y-5">
      <div>
        <Label htmlFor="display_name">Name</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName} required />
      </div>

      <div>
        <Label htmlFor="course_of_study">Course of study</Label>
        <Input
          id="course_of_study"
          name="course_of_study"
          defaultValue={courseOfStudy}
        />
      </div>

      <fieldset className="space-y-3 border-t border-black/10 pt-5 dark:border-white/10">
        <legend className="sr-only">Reminders</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="daily_email_enabled"
            defaultChecked={dailyEmailEnabled}
            className="size-4 accent-brand"
          />
          Email me when cards are due
        </label>

        <div>
          <Label htmlFor="reminder_hour">Time</Label>
          <select
            id="reminder_hour"
            name="reminder_hour"
            defaultValue={reminderHour}
            className="mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/15"
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            required
          />
          {browserZone && browserZone !== zone && (
            <button
              type="button"
              onClick={() => setZone(browserZone)}
              className="mt-1 text-xs font-semibold text-brand-dark underline hover:opacity-80 dark:text-brand"
            >
              Use {browserZone}, from this device
            </button>
          )}
        </div>
      </fieldset>

      <FormError message={state?.error} />
      {state?.saved && <p className="text-sm font-semibold text-brand-dark dark:text-brand">Saved.</p>}

      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
