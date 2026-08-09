import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { NewDeckForm } from "./new-deck-form";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const { supabase, user } = await requireOnboardedUser();

  const { data: decks, error } = await supabase
    .from("decks")
    .select("id, name, description, color, visibility, card_count, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Decks</h1>
          <p className="mt-1 text-sm opacity-60">One deck per subject.</p>
        </div>
        <NewDeckForm />
      </div>

      {error && <p className="text-sm text-red-500">{error.message}</p>}

      {decks && decks.length > 0 ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                href={`/decks/${deck.id}`}
                className="flex items-baseline justify-between gap-4 py-4 hover:opacity-70"
              >
                <div>
                  <span className="font-medium">{deck.name}</span>
                  {deck.description && (
                    <p className="mt-0.5 text-sm opacity-60">
                      {deck.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm opacity-50">
                  {deck.card_count} cards
                  {deck.visibility === "public" && " · public"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <p className="py-8 text-sm opacity-60">
            No decks yet. Create one to get started.
          </p>
        )
      )}
    </div>
  );
}
