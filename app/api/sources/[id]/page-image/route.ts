import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderPage } from "@/lib/pdf/render";

export const maxDuration = 30;

/**
 * Renders one page as PNG, for showing a card next to the slide it came from.
 *
 * Rendered on demand rather than stored: the images are only looked at during
 * approval and the occasional spot-check, and re-rendering is cheaper than
 * keeping a second copy of every deck in Storage. The immutable cache header
 * means the browser fetches each page once.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Owner-only via RLS, so another user's slide cannot be fetched by guessing
  // an id.
  const { data: source } = await supabase
    .from("sources")
    .select("storage_path, mime_type")
    .eq("id", id)
    .single();

  if (!source || source.mime_type !== "application/pdf") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const { data: blob } = await supabase.storage
    .from("materials")
    .download(source.storage_path);

  if (!blob) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const png = await renderPage(new Uint8Array(await blob.arrayBuffer()), page);
    return new NextResponse(png as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not render." }, { status: 500 });
  }
}
