/**
 * Detects the silent corruption that PDF text extraction produces on
 * mathematical documents.
 *
 * The failure this catches, seen on a real optimization lecture:
 *
 *   original   L(x, λ, μ) = f(x) + Σ λᵢgᵢ(x)   with  gᵢ(x) ≤ 0,  X ⊆ ℝⁿ
 *   extracted  L(x, , ) = f (x) + Σ i gi (x)   with  gi (x) 0,   X Rn
 *
 * Every Greek letter, the ≤ and the ⊆ are gone, and "defined" arrived as
 * "de ned". Nothing about that output announces itself as broken, which is
 * precisely why it needs detecting: a language model reading `gi (x) 0` will
 * happily supply an `=` and produce a confident, wrong flashcard.
 */

export type QualityAssessment = {
  suspect: boolean;
  reasons: string[];
  signals: {
    mathMarkers: number;
    greekLetters: number;
    ligatureGaps: number;
    danglingRelations: number;
  };
};

const MATH_MARKERS = /[∑∫∏√∈∉⊆⊂∪∩→←↔≡≈∀∃∂∇±×·]/g;
const GREEK = /[Ͱ-Ͽἀ-῿]/g;

/**
 * fi/fl/ff ligature losses leave a real word split by a space: "defined" ->
 * "de ned", "first" -> " rst", "field" -> " eld", "infinite" -> "in nite".
 * Matching the orphaned tails is far more reliable than trying to spot the
 * truncated heads.
 */
const LIGATURE_GAPS =
  /\b(?:[a-z]{2,})\s(?:ned|nition|nitions|nite|nitely|rst|eld|elds|ow|ows|oor|cient|cients|cation|ort|orts|ux)\b/gi;

/** "gᵢ(x) ≤ 0," losing its relation leaves "gi (x) 0," — term, space, bare number. */
const DANGLING_RELATIONS = /(?:\)|\b[a-z])\s+[0-9]+\s*[,.]/g;

/** Below this, a page has no usable text layer at all. */
const MIN_CHARS_PER_PAGE = 40;

export function assessExtraction(
  text: string,
  pageCount: number | null,
): QualityAssessment {
  const mathMarkers = (text.match(MATH_MARKERS) ?? []).length;
  const greekLetters = (text.match(GREEK) ?? []).length;
  const ligatureGaps = (text.match(LIGATURE_GAPS) ?? []).length;
  const danglingRelations = (text.match(DANGLING_RELATIONS) ?? []).length;

  const reasons: string[] = [];
  const mathematical = mathMarkers >= 3;

  const perPage =
    pageCount && pageCount > 0 ? text.length / pageCount : text.length;
  if (perPage < MIN_CHARS_PER_PAGE) {
    reasons.push(
      "Almost no text came out. The pages are probably images — a scan, or slides exported as pictures.",
    );
  }

  // The strongest single signal. Real mathematical writing is full of Greek;
  // maths symbols with zero Greek means the Greek was dropped, not absent.
  if (mathematical && greekLetters === 0) {
    reasons.push(
      "Mathematical notation is present but not one Greek letter came through, so they were dropped rather than absent.",
    );
  }

  if (ligatureGaps >= 2) {
    reasons.push(
      `${ligatureGaps} words look split by lost ligatures — "defined" arriving as "de ned" and similar.`,
    );
  }

  if (mathematical && danglingRelations >= 2) {
    reasons.push(
      "Expressions have numbers sitting beside terms with no operator between them, which is what a dropped ≤ or ≥ looks like.",
    );
  }

  return {
    suspect: reasons.length > 0,
    reasons,
    signals: { mathMarkers, greekLetters, ligatureGaps, danglingRelations },
  };
}

// -----------------------------------------------------------------------------
// Checks on what the VISION model produced.
//
// A vision pass fixes the extractor's problems and introduces its own. On the
// duality slide, qwen2.5vl:7b recovered every Greek letter and every subscript,
// then still dropped the ≤ in `g_i(x) ≤ 0`, read every comma as a semicolon,
// and invented a `+` on ℝ^p — turning unrestricted equality multipliers into
// non-negative ones. Trusting the vision output blindly just moves the silent
// corruption one step downstream.
// -----------------------------------------------------------------------------

export type TranscriptionCheck = { suspect: boolean; reasons: string[] };

/** "g_i(x) \quad 0" — a term, filler, then a number, with no relation. */
const BARE_RELATION = /\)\s*(?:\\quad|\\qquad|\\,|\\;|\\:|\s)+-?\d/g;
/** "1; 2; \cdots; m" — lecture notes separate with commas, not semicolons. */
const SEMICOLON_LISTS = /\d\s*;\s*(?:\d|\\c?dots|\\ldots)/g;
/** "L(x; \lambda; \mu)" — same misread, inside an argument list. */
const SEMICOLON_ARGS = /\([^()]*;[^()]*\)/g;

export function assessTranscription(text: string): TranscriptionCheck {
  const reasons: string[] = [];

  const bare = (text.match(BARE_RELATION) ?? []).length;
  const semicolons =
    (text.match(SEMICOLON_LISTS) ?? []).length +
    (text.match(SEMICOLON_ARGS) ?? []).length;

  if (bare > 0) {
    reasons.push(
      `${bare} expression(s) have a number next to a term with no relation between them — a dropped ≤ or ≥.`,
    );
  }
  if (semicolons >= 2) {
    reasons.push(
      "Semicolons appear where lecture notes use commas, so the model is misreading commas.",
    );
  }
  if (text.includes("[?]")) {
    reasons.push(
      "The model marked at least one symbol unreadable — check those spots against the slide.",
    );
  }

  return { suspect: reasons.length > 0, reasons };
}
