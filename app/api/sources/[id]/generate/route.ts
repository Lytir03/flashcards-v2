import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/ai/provider";
import { chunkForGeneration } from "@/lib/ai/chunk";

export const maxDuration = 60;

const body = z.object({ chunk: z.coerce.number().int().min(0) });

/**
 * Generates cards from ONE chunk. Same shape as the transcription route and
 * for the same reason: a whole document in a single call would outlast any
 * serverless limit, and a failure near the end would discard everything
 * before it. The browser drives the loop.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chunk index." }, { status: 400 });
  }
  const chunkIndex = parsed.data.chunk;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: source } = await supabase
    .from("sources")
    .select("id, deck_id, extracted_text, page_count")
    .eq("id", id)
    .single();

  if (!source?.extracted_text) {
    return NextResponse.json(
      { error: "This file has no extracted text yet." },
      { status: 422 },
    );
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", source.deck_id)
    .eq("owner_id", user.id)
    .single();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const chunks = chunkForGeneration(source.extracted_text);
  if (chunkIndex >= chunks.length) {
    return NextResponse.json({ error: "No such chunk." }, { status: 400 });
  }
  const chunk = chunks[chunkIndex];

  if (chunkIndex === 0) {
    await supabase.from("sources").update({ status: "generating" }).eq("id", id);
  }

  const provider = getProvider();
  const result = await provider.generateCards(chunk.text, deck.name);

  if (!result.ok) {
    await supabase
      .from("sources")
      .update({ status: "failed", error_message: result.error })
      .eq("id", id);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // The model reports the page each card came from. Trust it only within the
  // range this chunk actually covered — a page number from outside it is a
  // hallucination, and a wrong provenance is worse than none, because it sends
  // the student to check the card against the wrong slide.
  const inRange = (page: number | null) => {
    if (page === null) return null;
    if (chunk.firstPage === null || chunk.lastPage === null) return null;
    return page >= chunk.firstPage && page <= chunk.lastPage ? page : null;
  };

  const rows = result.cards.map((card) => ({
    deck_id: deck.id,
    owner_id: user.id,
    source_id: id,
    source_page_number: inRange(card.page),
    question: card.question,
    answer: card.answer,
    topic: card.topic,
    status: "draft" as const,
    origin: "ai" as const,
  }));

  const { error: insertError } = await supabase.from("flashcards").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const done = chunkIndex + 1 >= chunks.length;
  if (done) {
    await supabase.from("sources").update({ status: "ready" }).eq("id", id);
  }

  return NextResponse.json({
    ok: true,
    chunk: chunkIndex,
    totalChunks: chunks.length,
    created: rows.length,
    done,
    model: result.model,
  });
}
