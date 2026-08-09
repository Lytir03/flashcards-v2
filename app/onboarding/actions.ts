"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | undefined;

const schema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name is too long."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      "Username: 3–20 characters, lowercase letters, numbers and underscore only.",
    ),
  course_of_study: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username"),
    course_of_study: formData.get("course_of_study"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      username: parsed.data.username,
      course_of_study: parsed.data.course_of_study || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation. The only unique column here is username.
    if (error.code === "23505") return { error: "That username is taken." };
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
