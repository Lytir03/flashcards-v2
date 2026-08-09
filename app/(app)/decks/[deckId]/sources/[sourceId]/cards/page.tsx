import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { approveAll, approveUnflagged } from "./actions";
import { CardEditor, type DraftCard } from "./card-editor";

export const dynamic = "force-dynamic";

export default async function ReviewCardsPage({
  params,
}: {
  params: Promise<{ deckId: string; sourceId: string }>;
}) {
  const { deckId, sourceId } = await params;
  const { supabase } = await requireOnboardedUser();
  const returnTo = `/decks/${deckId}/sources/${sourceId}/cards`;

  const { data: source } = await supabase
    .from("sources")
    .select("id, filename")
    .eq("id", sourceId)
    .eq("deck_id", deckId)
    .single();

  if (!source) notFound();

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, question, answer, topic, source_page_number")
    .eq("source_id", sourceId)
    .eq("status", "draft")
    .order("source_page_number", { nullsFirst: false });

  const { data: flagged } = await supabase
    .from("source_pages")
    .select("page_number")
    .eq("source_id", sourceId)
    .not("conflicts", "is", null);

  const disputedPages = new Set((flagged ?? []).map((p) => p.page_number));
  const drafts: DraftCard[] = cards ?? [];

  const disputedCount = drafts.filter(
    (c) => c.source_page_number !== null && disputedPages.has(c.source_page_number),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/decks/${deckId}/sources/${sourceId}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← {source.filename}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Review cards</h1>
        <p className="mt-1 text-sm opacity-60">
          {drafts.length === 0
            ? "Nothing waiting for review."
            : `${drafts.length} drafts. Nothing enters the review queue until you approve it.`}
        </p>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-3 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <form action={approveAll}>
              <input type="hidden" name="source_id" value={sourceId} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Approve all {drafts.length}
              </button>
            </form>

            {disputedCount > 0 && (
              <form action={approveUnflagged}>
                <input type="hidden" name="source_id" value={sourceId} />
                <input type="hidden" name="return_to" value={returnTo} />
                <button
                  type="submit"
                  className="rounded-md border border-black/20 px-4 py-2 dark:border-white/20"
                >
                  Approve only the {drafts.length - disputedCount} unflagged
                </button>
              </form>
            )}
          </div>

          {disputedCount > 0 && (
            <p className="opacity-60">
              {disputedCount} of these come from pages where the two readings
              disagreed.
            </p>
          )}
        </div>
      )}

      <ul className="space-y-4">
        {drafts.map((card) => (
          <CardEditor
            key={card.id}
            card={card}
            sourceId={sourceId}
            returnTo={returnTo}
            pageDisputed={
              card.source_page_number !== null &&
              disputedPages.has(card.source_page_number)
            }
          />
        ))}
      </ul>
    </div>
  );
}
