"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CardState = { error?: string } | undefined;

const cardSchema = z.object({
  id: z.uuid(),
  question: z.string().trim().min(1, "The question cannot be empty.").max(2000),
  answer: z.string().trim().min(1, "The answer cannot be empty.").max(4000),
  topic: z.string().trim().max(60).optional().or(z.literal("")),
});

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Saves edits and approves in one step — the common path during review. */
export async function saveAndApprove(
  _prev: CardState,
  formData: FormData,
): Promise<CardState> {
  const parsed = cardSchema.safeParse({
    id: formData.get("id"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    topic: formData.get("topic"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await currentUser();

  const { error } = await supabase
    .from("flashcards")
    .update({
      question: parsed.data.question,
      answer: parsed.data.answer,
      topic: parsed.data.topic || null,
      status: "approved",
    })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(String(formData.get("return_to") ?? "/decks"));
  return {};
}

export async function discardCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await currentUser();

  await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath(String(formData.get("return_to") ?? "/decks"));
}

/** Approves every draft from this file, flagged pages included. */
export async function approveAll(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const { supabase, user } = await currentUser();

  await supabase
    .from("flashcards")
    .update({ status: "approved" })
    .eq("source_id", sourceId)
    .eq("owner_id", user.id)
    .eq("status", "draft");

  revalidatePath(String(formData.get("return_to") ?? "/decks"));
}

/**
 * Approves only what nothing has flagged: skips cards with no established page
 * and cards from pages where the two readings disagreed. Kept alongside
 * approveAll so the flags remain usable when you do want to triage.
 */
export async function approveUnflagged(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const { supabase, user } = await currentUser();

  const { data: flagged } = await supabase
    .from("source_pages")
    .select("page_number")
    .eq("source_id", sourceId)
    .not("conflicts", "is", null);

  const flaggedPages = (flagged ?? []).map((p) => p.page_number);

  let query = supabase
    .from("flashcards")
    .update({ status: "approved" })
    .eq("source_id", sourceId)
    .eq("owner_id", user.id)
    .eq("status", "draft")
    .not("source_page_number", "is", null);

  if (flaggedPages.length > 0) {
    query = query.not(
      "source_page_number",
      "in",
      `(${flaggedPages.join(",")})`,
    );
  }

  await query;

  revalidatePath(String(formData.get("return_to") ?? "/decks"));
}
