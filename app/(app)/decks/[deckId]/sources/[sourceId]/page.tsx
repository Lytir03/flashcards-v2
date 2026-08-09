import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { deleteSource } from "../actions";
import { RetryExtractButton } from "./retry-button";
import { TranscribePanel } from "./transcribe-panel";
import { GeneratePanel } from "./generate-panel";

export const dynamic = "force-dynamic";

const PREVIEW_CHARS = 4000;

export default async function SourcePage({
  params,
}: {
  params: Promise<{ deckId: string; sourceId: string }>;
}) {
  const { deckId, sourceId } = await params;
  const { supabase } = await requireOnboardedUser();

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .eq("deck_id", deckId)
    .single();

  if (!source) notFound();

  // A row exists per page from plain extraction; "done" means the vision
  // column is filled.
  const { count: pagesDone } = await supabase
    .from("source_pages")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .not("text", "is", null);

  const { count: draftCount } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("source_id", sourceId)
    .eq("status", "draft");

  const { data: flaggedPages } = await supabase
    .from("source_pages")
    .select("page_number, conflicts")
    .eq("source_id", sourceId)
    .not("conflicts", "is", null)
    .order("page_number");

  const text = source.extracted_text ?? "";
  const truncated = text.length > PREVIEW_CHARS;
  const isPdf = source.mime_type === "application/pdf";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/decks/${deckId}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← Back to deck
        </Link>
        <h1 className="mt-2 text-2xl font-semibold break-all">
          {source.filename}
        </h1>
        <p className="mt-1 text-sm opacity-60">
          {source.status}
          {source.extraction_method === "vision" && " · read visually"}
          {source.page_count ? ` · ${source.page_count} pages` : ""}
          {source.char_count
            ? ` · ${source.char_count.toLocaleString()} characters`
            : ""}
        </p>
      </div>

      {source.status === "failed" && (
        <div className="space-y-3 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
          <p className="text-sm text-red-500">{source.error_message}</p>
          <RetryExtractButton sourceId={source.id} />
        </div>
      )}

      {source.quality_note && isPdf && (
        <div className="space-y-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div>
            <h2 className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {source.extraction_method === "vision"
                ? "The transcription still looks off"
                : "This text came out damaged"}
            </h2>
            <p className="mt-1 text-sm opacity-80">{source.quality_note}</p>
            <p className="mt-2 text-sm opacity-70">
              {source.extraction_method === "vision"
                ? "Reading the pages recovered the notation, but the model still slipped. Check those spots against the slides, or switch AI_PROVIDER to anthropic and read again — a stronger model makes far fewer of these mistakes."
                : "Generating cards from this would produce confident, wrong answers — a missing ≤ or a vanished λ still reads like ordinary text to a language model."}
            </p>
          </div>

          <TranscribePanel
            sourceId={source.id}
            pageCount={source.page_count}
            alreadyDone={pagesDone ?? 0}
          />
        </div>
      )}

      {flaggedPages && flaggedPages.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <h2 className="text-sm font-medium text-amber-600 dark:text-amber-400">
            The two readings of this file disagree
          </h2>
          <p className="mt-1 text-sm opacity-70">
            The text layer and the vision model read these pages differently.
            Neither knows the right answer — but they fail in opposite
            directions, so a disagreement is worth a look before any card is
            approved.
          </p>

          <ul className="mt-3 space-y-3">
            {flaggedPages.map((page) => (
              <li key={page.page_number} className="text-sm">
                <span className="font-medium">Page {page.page_number}</span>
                <ul className="mt-1 space-y-1 opacity-80">
                  {(page.conflicts as { kind: string; detail: string }[]).map(
                    (conflict, index) => (
                      <li key={index}>· {conflict.detail}</li>
                    ),
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {source.status === "extracted" && (
        <>
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <h2 className="mb-2 text-sm font-medium opacity-70">
              Extracted text{truncated && " (first 4,000 characters)"}
            </h2>
            <pre className="max-h-96 overflow-auto text-xs leading-relaxed whitespace-pre-wrap opacity-80">
              {text.slice(0, PREVIEW_CHARS)}
            </pre>
          </div>

          {!source.quality_note && isPdf && source.extraction_method === "text" && (
            <details className="text-sm opacity-60">
              <summary className="cursor-pointer">
                Formulas look wrong to you?
              </summary>
              <div className="mt-3">
                <TranscribePanel
                  sourceId={source.id}
                  pageCount={source.page_count}
                  alreadyDone={pagesDone ?? 0}
                />
              </div>
            </details>
          )}

          <GeneratePanel
            sourceId={source.id}
            deckId={deckId}
            draftCount={draftCount ?? 0}
          />
        </>
      )}

      <form
        action={deleteSource}
        className="border-t border-black/10 pt-6 dark:border-white/10"
      >
        <input type="hidden" name="source_id" value={source.id} />
        <input type="hidden" name="deck_id" value={deckId} />
        <button
          type="submit"
          className="text-sm text-red-600 underline hover:opacity-80"
        >
          Delete this file
        </button>
      </form>
    </div>
  );
}
