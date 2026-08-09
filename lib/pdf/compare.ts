/**
 * Cross-checks the two extractions of the same page against each other.
 *
 * The value here comes from the two pipelines failing in OPPOSITE directions:
 *
 *   text layer   drops symbols it cannot map, but never invents one — it is
 *                mechanical, it reads the font's ToUnicode table or nothing
 *   vision model invents symbols that complete a familiar pattern, but rarely
 *                drops one — it is a guesser, and guessers fill gaps
 *
 * So neither can be trusted alone, but their disagreement is informative
 * without either of them knowing the right answer. No model upgrade removes
 * the need for this; a better model only makes the disagreements rarer.
 */

export type Conflict = {
  kind: "decoration" | "possible-invention" | "possible-omission";
  detail: string;
};

const LATEX_COMMAND = /\\[a-zA-Z]+/g;
const NON_WORD = /[^a-zA-Z]+/g;

/** Structural words that carry no content, plus LaTeX leftovers. */
const STOP = new Set([
  "the", "and", "for", "are", "was", "were", "this", "that", "with", "from",
  "have", "has", "will", "would", "referred", "problem", "page", "text",
  "diagram", "begin", "end", "equation", "align", "quad", "qquad", "left",
  "right", "frac", "sum", "prod", "mathbb", "cdots", "ldots", "dots", "tag",
  "min", "max", "subject", "where", "such", "then", "when", "each", "which",
]);

function stripLatex(input: string): string {
  return (
    input
      // Environment names go first, braces included. Otherwise `\begin{aligned}`
      // loses the `\begin` but leaves "aligned" behind as a content word, and
      // the check reports the LaTeX scaffolding as invented prose.
      .replace(/\\(?:begin|end)\s*\{[^}]*\}/g, " ")
      .replace(LATEX_COMMAND, " ")
      .replace(/[${}\\&^_]/g, " ")
  );
}

/**
 * The text layer loses fi/fl/ff ligatures outright — "defined" arrives as
 * "de ned", missing the "fi" entirely. Folding those pairs out of both sides
 * stops that known difference from being reported as a disagreement.
 */
function ligatureFold(word: string): string {
  return word.replace(/fi|fl|ff/g, "");
}

function contentWords(input: string): Set<string> {
  return new Set(
    stripLatex(input)
      .split(NON_WORD)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 5 && !STOP.has(w)),
  );
}

function squash(input: string): string {
  return ligatureFold(stripLatex(input).toLowerCase().replace(/\s+/g, ""));
}

/**
 * Words that repeat across most pages are the running header/footer — on a
 * Beamer deck, something like "Introduction to Nonlinear Optimization ·
 * Lecture slides · Duality" stamped on every slide.
 *
 * The text layer picks that boilerplate up; the vision model sensibly skips it
 * as furniture. Without this, every page reports the same phantom omission and
 * the genuine ones — "farkas", "lemma" — drown in it. A checker that cries
 * wolf on all ten pages gets ignored by page three, which costs more than
 * having no checker at all.
 */
export function findBoilerplate(pagesTextLayer: string[]): Set<string> {
  if (pagesTextLayer.length < 3) return new Set();

  const counts = new Map<string, number>();
  for (const page of pagesTextLayer) {
    for (const word of contentWords(page)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  const threshold = Math.max(3, Math.ceil(pagesTextLayer.length * 0.6));
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= threshold)
      .map(([word]) => word),
  );
}

export function compareExtractions(
  textLayer: string,
  vision: string,
  boilerplate: Set<string> = new Set(),
): Conflict[] {
  const conflicts: Conflict[] = [];
  if (!textLayer.trim() || !vision.trim()) return conflicts;

  // --- Set decorations: ℝ^n against ℝ^n_+ ------------------------------------
  // '+' is plain ASCII and always survives a text layer, so whether it sits
  // next to a set symbol is trustworthy evidence even when every Greek letter
  // around it was lost. Comparing total '+' counts would be useless — sums
  // contain plenty. What matters is whether THIS set carries the sign.
  const seen = new Set<string>();
  for (const match of vision.matchAll(
    /\\?(?:mathbb\{R\}|R|ℝ)\s*\^\{?([a-z0-9]+)\}?\s*_\{?\+\}?/g,
  )) {
    const exponent = match[1];
    if (seen.has(exponent)) continue;
    seen.add(exponent);

    // The same set reads "Rm" or "Rp" in the text layer, with the subscript
    // landing close by — frequently on the following line.
    const occurrences = [
      ...textLayer.matchAll(new RegExp(`R\\s*${exponent}([\\s\\S]{0,4})`, "g")),
    ];

    if (occurrences.length > 0 && !occurrences.some((o) => o[1].includes("+"))) {
      conflicts.push({
        kind: "decoration",
        detail: `The transcription writes R^${exponent} with a "+" subscript, but no "+" follows R^${exponent} anywhere on the page. Non-negativity was probably added — on equality-constraint multipliers that would be wrong.`,
      });
    }
  }

  // --- Vocabulary ------------------------------------------------------------
  const layerSquashed = squash(textLayer);
  const visionSquashed = squash(vision);

  const invented = [...contentWords(vision)].filter(
    (w) => !layerSquashed.includes(ligatureFold(w)),
  );
  if (invented.length > 0) {
    conflicts.push({
      kind: "possible-invention",
      detail: `In the transcription but not on the page: ${invented.slice(0, 8).join(", ")}.`,
    });
  }

  const dropped = [...contentWords(textLayer)].filter(
    (w) => !boilerplate.has(w) && !visionSquashed.includes(ligatureFold(w)),
  );
  if (dropped.length > 0) {
    conflicts.push({
      kind: "possible-omission",
      detail: `On the page but missing from the transcription: ${dropped.slice(0, 8).join(", ")}.`,
    });
  }

  return conflicts;
}
