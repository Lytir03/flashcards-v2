import "server-only";
import { assessExtraction, type QualityAssessment } from "./quality";

export type ExtractionResult =
  | {
      ok: true;
      text: string;
      /** Per page, so it can be compared against the vision pass page by page. */
      pages: string[] | null;
      charCount: number;
      pageCount: number | null;
      quality: QualityAssessment;
    }
  | { ok: false; reason: string };

/**
 * Collapses the whitespace soup that PDF text layers produce: a line break
 * after every visual line, stray form feeds, runs of spaces from justified
 * text. Left alone, this wastes a large share of the model's context on
 * formatting noise.
 */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = normalise(new TextDecoder().decode(bytes));
    if (text.length < 200) {
      return { ok: false, reason: "The file is empty or too short to use." };
    }
    return {
      ok: true,
      text,
      pages: null,
      charCount: text.length,
      pageCount: null,
      quality: assessExtraction(text, null),
    };
  }

  if (mimeType !== "application/pdf") {
    return { ok: false, reason: `Unsupported file type: ${mimeType}` };
  }

  const { getDocumentProxy, extractText: unpdfExtract } = await import("unpdf");

  try {
    const pdf = await getDocumentProxy(bytes);
    // mergePages: false — the per-page split is what makes the later
    // page-by-page comparison against the vision transcription possible.
    const result = await unpdfExtract(pdf, { mergePages: false });
    const pageCount = result.totalPages;
    const pages = (
      Array.isArray(result.text) ? result.text : [result.text]
    ).map(normalise);
    const text = pages.join("\n\n");

    // A poor result is NOT an error any more. A scanned PDF or a LaTeX deck
    // that lost its Greek letters is exactly what the vision pass is for, so
    // the text is kept, flagged, and the caller decides what to do with it.
    return {
      ok: true,
      text,
      pages,
      charCount: text.length,
      pageCount,
      quality: assessExtraction(text, pageCount),
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? `Could not read the PDF: ${error.message}`
          : "Could not read the PDF.",
    };
  }
}
