import "server-only";

/**
 * Renders one PDF page to PNG for the vision model.
 *
 * scale 2 (~150 dpi) is the sweet spot found by eye: subscripts and primes
 * stay legible, and the image stays small enough that base64-encoding it into
 * a chat request is not the slow part.
 */
export async function renderPage(
  bytes: Uint8Array,
  pageNumber: number,
  scale = 2,
): Promise<Uint8Array> {
  const { renderPageAsImage } = await import("unpdf");

  const image = await renderPageAsImage(bytes, pageNumber, {
    scale,
    // unpdf has no canvas of its own in Node and requires one to be injected.
    canvasImport: () => import("@napi-rs/canvas"),
  });

  return new Uint8Array(image);
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  return pdf.numPages;
}
