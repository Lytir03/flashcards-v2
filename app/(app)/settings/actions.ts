"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; saved?: boolean } | undefined;

const schema = z.object({
  display_name: z.string().trim().min(2).max(60),
  course_of_study: z.string().trim().max(120).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(64),
  reminder_hour: z.coerce.number().int().min(0).max(23),
  daily_email_enabled: z.coerce.boolean(),
});

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = schema.safeParse({
    display_name: formData.get("display_name"),
    course_of_study: formData.get("course_of_study"),
    timezone: formData.get("timezone"),
    reminder_hour: formData.get("reminder_hour"),
    daily_email_enabled: formData.get("daily_email_enabled") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // A timezone the browser reported but the server cannot resolve would make
  // the reminder cron fall back for this user every hour, silently.
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: parsed.data.timezone });
  } catch {
    return { error: "That timezone is not recognised." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      course_of_study: parsed.data.course_of_study || null,
      timezone: parsed.data.timezone,
      reminder_hour: parsed.data.reminder_hour,
      daily_email_enabled: parsed.data.daily_email_enabled,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { saved: true };
}
