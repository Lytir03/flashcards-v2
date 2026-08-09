const PAGE_MARKER = /<!--\s*page\s+(\d+)\s*-->/g;

export type Chunk = {
  text: string;
  firstPage: number | null;
  lastPage: number | null;
};

const TARGET_CHARS = 8000;

/**
 * Splits extracted text into chunks the model can handle in one call.
 *
 * Pages are the natural seam for lecture material — a slide is already one
 * coherent thought — so chunks never cut a page in half. The page markers are
 * left IN the text: the model is asked to tag each card with the page it came
 * from, and it can only do that if it can still see where pages begin.
 *
 * Text uploads (.txt/.md) have no markers, so they fall back to paragraph
 * splitting with no page provenance.
 */
export function chunkForGeneration(text: string): Chunk[] {
  const markers = [...text.matchAll(PAGE_MARKER)];

  if (markers.length === 0) {
    return splitByParagraph(text).map((t) => ({
      text: t,
      firstPage: null,
      lastPage: null,
    }));
  }

  type Page = { number: number; text: string };
  const pages: Page[] = markers.map((match, index) => {
    const start = match.index!;
    const end = index + 1 < markers.length ? markers[index + 1].index! : text.length;
    return { number: Number(match[1]), text: text.slice(start, end).trim() };
  });

  const chunks: Chunk[] = [];
  let current: Page[] = [];
  let size = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push({
      text: current.map((p) => p.text).join("\n\n"),
      firstPage: current[0].number,
      lastPage: current[current.length - 1].number,
    });
    current = [];
    size = 0;
  };

  for (const page of pages) {
    // A single oversized page still goes out on its own rather than being cut.
    if (size > 0 && size + page.text.length > TARGET_CHARS) flush();
    current.push(page);
    size += page.text.length;
  }
  flush();

  return chunks;
}

function splitByParagraph(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if (buffer && buffer.length + paragraph.length > TARGET_CHARS) {
      out.push(buffer.trim());
      buffer = "";
    }
    buffer += paragraph + "\n\n";
  }
  if (buffer.trim()) out.push(buffer.trim());

  return out.length > 0 ? out : [text];
}
