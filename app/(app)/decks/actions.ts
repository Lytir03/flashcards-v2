"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DECK_COLORS } from "./constants";

export type DeckState = { error?: string } | undefined;

const deckSchema = z.object({
  name: z.string().trim().min(1, "Give the deck a name.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  color: z.enum(DECK_COLORS).default("slate"),
});

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDeck(
  _prev: DeckState,
  formData: FormData,
): Promise<DeckState> {
  const parsed = deckSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    color: formData.get("color") ?? "slate",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await currentUser();

  const { error } = await supabase.from("decks").insert({
    owner_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    color: parsed.data.color,
  });

  if (error) return { error: error.message };

  revalidatePath("/decks");
  revalidatePath("/dashboard");
  return {};
}

export async function renameDeck(
  _prev: DeckState,
  formData: FormData,
): Promise<DeckState> {
  const id = String(formData.get("deck_id") ?? "");
  const parsed = deckSchema
    .pick({ name: true, description: true })
    .safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await currentUser();

  // The owner_id filter is belt-and-braces: RLS already blocks writes to
  // someone else's deck. Keeping it here means a future RLS mistake degrades
  // to "nothing updates" rather than "anyone edits anything".
  const { error } = await supabase
    .from("decks")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/decks");
  revalidatePath(`/decks/${id}`);
  return {};
}

export async function setDeckVisibility(formData: FormData) {
  const id = String(formData.get("deck_id") ?? "");
  const visibility =
    formData.get("visibility") === "public" ? "public" : "private";

  const { supabase, user } = await currentUser();
  await supabase
    .from("decks")
    .update({ visibility })
    .eq("id", id)
    .eq("owner_id", user.id);

  revalidatePath(`/decks/${id}`);
}

export async function deleteDeck(formData: FormData) {
  const id = String(formData.get("deck_id") ?? "");

  const { supabase, user } = await currentUser();
  await supabase.from("decks").delete().eq("id", id).eq("owner_id", user.id);

  revalidatePath("/decks");
  revalidatePath("/dashboard");
  redirect("/decks");
}
