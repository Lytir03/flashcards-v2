"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type RegisterState =
  | { ok: true; sourceId: string }
  | { ok: false; error: string };

const ALLOWED_MIME = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

const schema = z.object({
  deck_id: z.uuid(),
  filename: z.string().trim().min(1).max(255),
  storage_path: z.string().trim().min(1),
  mime_type: z.enum(ALLOWED_MIME),
  size_bytes: z.coerce.number().int().positive().max(25 * 1024 * 1024),
});

/**
 * Records a file that the browser has already pushed to Storage.
 *
 * The upload itself deliberately does NOT pass through Next.js: Vercel caps a
 * serverless request body at 4.5 MB, and a slide deck blows past that. The
 * browser talks to Supabase Storage directly — the Storage RLS policy pins
 * writes to the user's own folder — and this action only records the result.
 */
export async function registerSource(
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    deck_id: formData.get("deck_id"),
    filename: formData.get("filename"),
    storage_path: formData.get("storage_path"),
    mime_type: formData.get("mime_type"),
    size_bytes: formData.get("size_bytes"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // The path is client-supplied, so confirm it really is this user's folder
  // before trusting it. Storage RLS blocks the write itself, but nothing stops
  // a crafted request from pointing this row at someone else's object.
  if (!parsed.data.storage_path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Invalid storage path." };
  }

  // Confirms deck ownership: RLS lets a user read public decks belonging to
  // others, and we do not want sources attached to those.
  const { data: deck } = await supabase
    .from("decks")
    .select("id")
    .eq("id", parsed.data.deck_id)
    .eq("owner_id", user.id)
    .single();
  if (!deck) return { ok: false, error: "Deck not found." };

  const { data: source, error } = await supabase
    .from("sources")
    .insert({
      deck_id: parsed.data.deck_id,
      owner_id: user.id,
      filename: parsed.data.filename,
      storage_path: parsed.data.storage_path,
      mime_type: parsed.data.mime_type,
      size_bytes: parsed.data.size_bytes,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (error || !source) {
    return { ok: false, error: error?.message ?? "Could not save the file." };
  }

  revalidatePath(`/decks/${parsed.data.deck_id}`);
  return { ok: true, sourceId: source.id };
}

export async function deleteSource(formData: FormData) {
  const sourceId = String(formData.get("source_id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: source } = await supabase
    .from("sources")
    .select("storage_path")
    .eq("id", sourceId)
    .eq("owner_id", user.id)
    .single();

  if (source) {
    // Storage first: if the row went first and this failed, the object would
    // be orphaned with nothing left pointing at it.
    await supabase.storage.from("materials").remove([source.storage_path]);
    await supabase.from("sources").delete().eq("id", sourceId);
  }

  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}
