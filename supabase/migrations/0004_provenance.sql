-- =============================================================================
-- Provenance and cross-checking.
--
-- Two changes, one idea: an extraction mistake must be CATCHABLE rather than
-- assumed away. A better model lowers how often one slips through; it never
-- makes the output verified, and a spaced-repetition app drills whatever it is
-- given.
--
-- 1. Both extractions of a page are kept side by side. They fail in opposite
--    directions — the text layer drops symbols but never invents, the vision
--    model invents but rarely drops — so their disagreement flags likely
--    errors without either one knowing the right answer. Previously the vision
--    pass overwrote the text-layer result, throwing away half the evidence.
--
-- 2. Every flashcard records the page it came from, so approving a card can
--    mean checking it against the slide rather than rubber-stamping it.
-- =============================================================================

-- Keep the text-layer extraction even after a vision pass replaces it as the
-- working text.
alter table public.sources
  add column if not exists text_layer text;

-- source_pages becomes "everything known about page N", not just the vision
-- output: `text_layer` is filled during plain extraction, `text` during the
-- vision pass, `conflicts` by comparing the two.
alter table public.source_pages
  add column if not exists text_layer text,
  add column if not exists conflicts jsonb;

-- `text` was NOT NULL because a row only existed once a page had been
-- transcribed. Now a row is created at plain-extraction time, before any
-- vision pass, so it has to tolerate having no transcription yet.
alter table public.source_pages
  alter column text drop not null;

-- Provenance on every card. Nullable: manually written cards have no page.
alter table public.flashcards
  add column if not exists source_page_number int
    check (source_page_number is null or source_page_number >= 1);

create index if not exists flashcards_source_page_idx
  on public.flashcards(source_id, source_page_number);
