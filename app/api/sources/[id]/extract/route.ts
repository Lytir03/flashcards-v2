import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/pdf/extract";

// Vercel's Hobby plan caps a function at 60s. Text extraction of a normal
// lecture deck takes a couple of seconds; this is a ceiling, not a target.
export const maxDuration = 60;

export async function POST(
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

  // RLS on `sources` is owner-only, so someone else's file simply does not
  // come back.
  const { data: source } = await supabase
    .from("sources")
    .select("id, storage_path, mime_type")
    .eq("id", id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  await supabase.from("sources").update({ status: "extracting" }).eq("id", id);

  // Downloaded as the user, not with the service key: the Storage policy
  // restricts reads to their own folder, which is the check we want.
  const { data: blob, error: downloadError } = await supabase.storage
    .from("materials")
    .download(source.storage_path);

  if (downloadError || !blob) {
    await supabase
      .from("sources")
      .update({
        status: "failed",
        error_message: downloadError?.message ?? "Download failed.",
      })
      .eq("id", id);
    return NextResponse.json({ error: "Could not read the file." }, { status: 500 });
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const result = await extractText(bytes, source.mime_type);

  if (!result.ok) {
    await supabase
      .from("sources")
      .update({ status: "failed", error_message: result.reason })
      .eq("id", id);
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  const { quality } = result;

  // The per-page text layer is stored now so that a later vision pass has
  // something to be compared against. Overwriting it later would throw away
  // the only independent evidence we have about this page.
  if (result.pages) {
    await supabase.from("source_pages").upsert(
      result.pages.map((pageText, index) => ({
        source_id: id,
        owner_id: user.id,
        page_number: index + 1,
        text_layer: pageText,
      })),
      { onConflict: "source_id,page_number" },
    );
  }

  const { error: updateError } = await supabase
    .from("sources")
    .update({
      status: "extracted",
      extraction_method: "text",
      extracted_text: result.text,
      text_layer: result.text,
      char_count: result.charCount,
      page_count: result.pageCount,
      quality_note: quality.suspect ? quality.reasons.join(" ") : null,
      error_message: null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    charCount: result.charCount,
    pageCount: result.pageCount,
    // The client uses this to decide whether to offer the vision pass.
    suspect: quality.suspect,
    reasons: quality.reasons,
  });
}
