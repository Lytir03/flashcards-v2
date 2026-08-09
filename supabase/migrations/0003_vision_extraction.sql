-- =============================================================================
-- Vision-based extraction for material that the PDF text layer mangles.
--
-- BACKGROUND
-- LaTeX/Beamer PDFs embed Type1 fonts whose ToUnicode maps are incomplete for
-- mathematical glyphs. Text extraction silently drops Greek letters, relation
-- symbols (≤ ⊆ −) and fi/fl ligatures. The result is not visibly broken — it
-- reads like ordinary text with holes — so a language model fills the gaps
-- confidently and wrongly. For a spaced-repetition app that is the worst
-- possible failure: a wrong card gets drilled into memory on purpose.
--
-- The fix is to render the page and have a vision model read it as a human
-- would. That is slow and, in production, billed per page, so it runs only
-- when the quality check flags the text layer.
-- =============================================================================

alter table public.sources
  add column if not exists page_count int,
  add column if not exists extraction_method text
    check (extraction_method in ('text', 'vision')),
  add column if not exists quality_note text;

-- 'transcribing' = vision pass in progress, page by page.
alter table public.sources drop constraint if exists sources_status_check;
alter table public.sources add constraint sources_status_check
  check (status in ('uploaded','extracting','extracted','transcribing',
                    'generating','ready','failed'));

-- One row per page. Lets the client drive the vision pass a page at a time
-- (each request stays well inside Vercel's 60s function limit), resume after
-- a failure, and retry a single bad page instead of the whole document.
create table if not exists public.source_pages (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.sources(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  page_number  int  not null check (page_number >= 1),
  text         text not null,
  model        text,
  created_at   timestamptz not null default now(),
  unique (source_id, page_number)
);

create index if not exists source_pages_source_idx
  on public.source_pages(source_id, page_number);

alter table public.source_pages enable row level security;

create policy "source_pages: owner only"
  on public.source_pages for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- The ALTER DEFAULT PRIVILEGES in 0002 should already cover this table. Stated
-- explicitly anyway: the cost is one line, and the failure mode it prevents
-- ("permission denied for table source_pages") cost us a debugging round once
-- already.
grant select, insert, update, delete on public.source_pages to authenticated;
grant all on public.source_pages to service_role;
