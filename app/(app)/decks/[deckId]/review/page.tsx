import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { ReviewSession, type ReviewCard } from "./review-session";

export const dynamic = "force-dynamic";

const SESSION_LIMIT = 40;

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { deckId } = await params;
  const { mode } = await searchParams;
  const practice = mode === "practice";

  const { supabase, user } = await requireOnboardedUser();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", deckId)
    .single();

  if (!deck) notFound();

  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("card_states")
    .select(
      "flashcard_id, due_on, last_reviewed_at, flashcards(id, question, answer, topic, source_id, source_page_number)",
    )
    .eq("user_id", user.id)
    .eq("deck_id", deckId)
    .neq("state", "suspended")
    .limit(SESSION_LIMIT);

  query = practice
    ? // Least recently seen first: more useful than random, and it means
      // repeated practice sessions work through the deck instead of
      // re-showing the same handful.
      query.order("last_reviewed_at", { nullsFirst: true })
    : query.lte("due_on", today).order("due_on");

  const { data: rows } = await query;

  const cards: ReviewCard[] = (rows ?? [])
    .map((row) => row.flashcards)
    .filter((card): card is ReviewCard => card !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">
          {deck.name}
          {practice && <span className="ml-2 text-sm opacity-50">practice</span>}
        </h1>
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          Leave
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="space-y-4 py-12 text-center">
          <p className="text-sm opacity-60">
            {practice
              ? "This deck has no approved cards yet."
              : "Nothing due in this deck today."}
          </p>
          {!practice && (
            <Link
              href={`/decks/${deck.id}/review?mode=practice`}
              className="inline-block rounded-md border border-black/20 px-4 py-2 text-sm dark:border-white/20"
            >
              Practice anyway
            </Link>
          )}
        </div>
      ) : (
        <ReviewSession cards={cards} deckId={deck.id} practice={practice} />
      )}
    </div>
  );
}
