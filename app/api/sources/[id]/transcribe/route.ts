import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPageCount, renderPage } from "@/lib/pdf/render";
import { getProvider } from "@/lib/ai/provider";
import { assessTranscription } from "@/lib/pdf/quality";
import { compareExtractions, findBoilerplate } from "@/lib/pdf/compare";

export const maxDuration = 60;

const body = z.object({ page: z.coerce.number().int().min(1) });

/** Clears a transcription so it can be redone — after changing model, say. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Clears the transcription but KEEPS text_layer: that column is the
  // independent evidence the comparison depends on, and re-running the vision
  // pass must not destroy it. RLS scopes this to the caller's own pages.
  const { error } = await supabase
    .from("source_pages")
    .update({ text: null, conflicts: null })
    .eq("source_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Transcribes ONE page with a vision model.
 *
 * One page per request on purpose. A 40-slide deck at a few seconds a page
 * would blow through any serverless time limit in a single call, and a failure
 * at page 38 would throw away the previous 37. Here the client loops, each
 * request is short, progress is visible, and a failed page can be retried on
 * its own.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page number." }, { status: 400 });
  }
  const { page } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: source } = await supabase
    .from("sources")
    .select("id, storage_path, mime_type, page_count")
    .eq("id", id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  if (source.mime_type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDFs can be read visually." },
      { status: 422 },
    );
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("materials")
    .download(source.storage_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const totalPages = source.page_count ?? (await getPageCount(bytes));

  if (page > totalPages) {
    return NextResponse.json({ error: "No such page." }, { status: 400 });
  }

  if (page === 1) {
    await supabase
      .from("sources")
      .update({ status: "transcribing" })
      .eq("id", id);
  }

  let png: Uint8Array;
  try {
    png = await renderPage(bytes, page);
  } catch (error) {
    return NextResponse.json(
      { error: `Could not render page ${page}: ${String(error)}` },
      { status: 500 },
    );
  }

  const provider = getProvider();
  const result = await provider.transcribePage(png, page, totalPages);

  if (!result.ok) {
    await supabase
      .from("sources")
      .update({ status: "failed", error_message: result.error })
      .eq("id", id);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Cross-check this page's two extractions against each other. They fail in
  // opposite directions, so where they disagree is where to look — no model
  // upgrade replaces this, it only makes disagreements rarer.
  const { data: allLayers } = await supabase
    .from("source_pages")
    .select("page_number, text_layer")
    .eq("source_id", id)
    .order("page_number");

  // Computed across the whole document: the running header/footer only shows
  // itself as boilerplate when you can see it repeating.
  const boilerplate = findBoilerplate(
    (allLayers ?? []).map((p) => p.text_layer ?? ""),
  );

  const thisLayer = allLayers?.find((p) => p.page_number === page)?.text_layer;
  const conflicts = thisLayer
    ? compareExtractions(thisLayer, result.text, boilerplate)
    : [];

  const { error: upsertError } = await supabase.from("source_pages").upsert(
    {
      source_id: id,
      owner_id: user.id,
      page_number: page,
      text: result.text,
      model: result.model,
      conflicts: conflicts.length > 0 ? conflicts : null,
    },
    { onConflict: "source_id,page_number" },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Once every page is in, stitch them together in order and promote the
  // result to the source's text.
  const { data: pages } = await supabase
    .from("source_pages")
    .select("page_number, text")
    .eq("source_id", id)
    // Rows now exist from plain extraction too, so "transcribed" means the
    // vision column is filled, not merely that the row is there.
    .not("text", "is", null)
    .order("page_number");

  const done = (pages?.length ?? 0) >= totalPages;

  let transcriptionWarning: string | null = null;

  if (done && pages) {
    const merged = pages
      .map((p) => `<!-- page ${p.page_number} -->\n${p.text}`)
      .join("\n\n");

    // The vision pass is not automatically trustworthy — it trades the
    // extractor's failure modes for its own. Check its output the same way we
    // checked the text layer's.
    const check = assessTranscription(merged);
    transcriptionWarning = check.suspect ? check.reasons.join(" ") : null;

    await supabase
      .from("sources")
      .update({
        status: "extracted",
        extraction_method: "vision",
        extracted_text: merged,
        char_count: merged.length,
        page_count: totalPages,
        quality_note: transcriptionWarning,
        error_message: null,
      })
      .eq("id", id);
  }

  return NextResponse.json({
    ok: true,
    page,
    totalPages,
    done,
    model: result.model,
    warning: transcriptionWarning,
  });
}
