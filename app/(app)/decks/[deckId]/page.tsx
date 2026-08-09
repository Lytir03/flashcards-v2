import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { Math } from "@/components/ui/math";
import { deleteDeck, setDeckVisibility } from "../actions";
import { EditDeckForm } from "./edit-deck-form";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const { supabase, user } = await requireOnboardedUser();

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  // RLS returns no row for a deck you cannot see, so this covers both
  // "does not exist" and "not yours" without leaking which one it is.
  if (!deck) notFound();

  const isOwner = deck.owner_id === user.id;

  const { data: sources } = await supabase
    .from("sources")
    .select("id, filename, status, char_count, created_at")
    .eq("deck_id", deck.id)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  const { count: dueCount } = await supabase
    .from("card_states")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("deck_id", deck.id)
    .lte("due_on", today)
    .neq("state", "suspended");

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, question, answer, topic, source_page_number")
    .eq("deck_id", deck.id)
    .eq("status", "approved")
    .order("topic", { nullsFirst: false })
    .limit(200);

  const { count: draftCount } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deck.id)
    .eq("status", "draft");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{deck.name}</h1>
        {deck.description && (
          <p className="mt-1 text-sm opacity-60">{deck.description}</p>
        )}
        <p className="mt-2 text-sm opacity-50">
          {deck.card_count} approved cards · {deck.visibility}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {dueCount ? (
            <Link
              href={`/decks/${deck.id}/review`}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Review {dueCount} due
            </Link>
          ) : (
            <span className="text-sm opacity-50">Nothing due today.</span>
          )}

          {deck.card_count > 0 && (
            <Link
              href={`/decks/${deck.id}/review?mode=practice`}
              className="rounded-md border border-black/20 px-4 py-2 text-sm dark:border-white/20"
            >
              Practice
            </Link>
          )}

          {draftCount ? (
            <span className="text-sm opacity-60">
              {draftCount} drafts awaiting review
            </span>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Material</h2>
          {isOwner && (
            <Link
              href={`/decks/${deck.id}/upload`}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Add file
            </Link>
          )}
        </div>

        {sources && sources.length > 0 ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {sources.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/decks/${deck.id}/sources/${source.id}`}
                  className="flex items-baseline justify-between gap-4 py-3 hover:opacity-70"
                >
                  <span className="truncate text-sm">{source.filename}</span>
                  <span
                    className={
                      "shrink-0 text-xs " +
                      (source.status === "failed"
                        ? "text-red-500"
                        : "opacity-50")
                    }
                  >
                    {source.status}
                    {source.char_count
                      ? ` · ${source.char_count.toLocaleString()} chars`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-black/20 p-8 text-center text-sm opacity-60 dark:border-white/20">
            No material yet. Upload lecture slides or notes to generate cards
            from.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Cards</h2>

        {cards && cards.length > 0 ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {cards.map((card) => (
              <li key={card.id} className="py-3">
                <Math className="block text-sm font-medium">
                  {card.question}
                </Math>
                <Math className="mt-1 block text-sm opacity-60">
                  {card.answer}
                </Math>
                {(card.topic || card.source_page_number) && (
                  <p className="mt-1 text-xs opacity-40">
                    {card.topic}
                    {card.topic && card.source_page_number ? " · " : ""}
                    {card.source_page_number
                      ? `page ${card.source_page_number}`
                      : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-black/20 p-8 text-center text-sm opacity-60 dark:border-white/20">
            No approved cards yet.
          </p>
        )}
      </section>

      {isOwner && (
        <div className="space-y-6 border-t border-black/10 pt-6 dark:border-white/10">
          <EditDeckForm
            deckId={deck.id}
            name={deck.name}
            description={deck.description ?? ""}
          />

          <form action={setDeckVisibility} className="flex items-center gap-3">
            <input type="hidden" name="deck_id" value={deck.id} />
            <input
              type="hidden"
              name="visibility"
              value={deck.visibility === "public" ? "private" : "public"}
            />
            <button
              type="submit"
              className="text-sm underline opacity-70 hover:opacity-100"
            >
              {deck.visibility === "public"
                ? "Make private"
                : "Make public (lets others study and challenge you on it)"}
            </button>
          </form>

          <form action={deleteDeck}>
            <input type="hidden" name="deck_id" value={deck.id} />
            <button
              type="submit"
              className="text-sm text-red-600 underline hover:opacity-80"
            >
              Delete deck and all its cards
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
