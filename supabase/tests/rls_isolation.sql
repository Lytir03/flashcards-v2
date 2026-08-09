-- =============================================================================
-- RLS isolation test — run in Supabase Studio's SQL Editor.
--
-- Impersonates a second, unrelated user and checks they cannot see your data.
-- Everything runs inside transactions that roll back, so nothing is modified.
--
-- HOW TO USE
--   1. Run STEP 1, copy your user id.
--   2. Paste it into STEP 2 and STEP 3 where marked, then run each.
--
-- WHY THE POSITIVE CONTROL MATTERS
--   A test that returns 0 proves nothing on its own — a broken query returns 0
--   too. STEP 2 must return non-zero for STEP 3's zeros to mean anything.
-- =============================================================================


-- STEP 1 ---------------------------------------------------------------------
select id, username, display_name from public.profiles;


-- STEP 2 — POSITIVE CONTROL: as yourself, you see your own rows --------------
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"PASTE-YOUR-USER-ID-HERE","role":"authenticated"}';

  select 'as me: decks'   as check, count(*) as rows from public.decks
  union all
  select 'as me: sources', count(*) from public.sources
  union all
  select 'as me: profiles', count(*) from public.profiles;
rollback;
-- EXPECT: decks and sources > 0 (create a deck and upload a file first).
-- profiles > 0 is correct and intended — leaderboards need to read names.


-- STEP 3 — THE ACTUAL TEST: a stranger sees nothing of yours -----------------
begin;
  set local role authenticated;
  -- A user id that exists nowhere. Represents any other signed-in student.
  set local request.jwt.claims =
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  select 'as stranger: decks'   as check, count(*) as rows from public.decks
  union all
  select 'as stranger: sources',      count(*) from public.sources
  union all
  select 'as stranger: flashcards',   count(*) from public.flashcards
  union all
  select 'as stranger: card_states',  count(*) from public.card_states
  union all
  select 'as stranger: review_logs',  count(*) from public.review_logs;
rollback;
-- EXPECT: all zero, as long as your decks are private. A public deck is
-- visible on purpose — that is the feature that makes challenges possible —
-- so make the deck private before trusting this result.


-- STEP 4 — WRITE ATTEMPT: a stranger cannot edit your profile ---------------
begin;
  set local role authenticated;
  set local request.jwt.claims =
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  update public.profiles
     set display_name = 'HACKED'
   where id = 'PASTE-YOUR-USER-ID-HERE';
  -- EXPECT: "UPDATE 0". Postgres reports success but touches no rows —
  -- RLS filters the target away rather than raising an error.
rollback;


-- STEP 5 — ANONYMOUS ACCESS: the anon role reaches nothing -------------------
begin;
  set local role anon;
  select count(*) from public.decks;
  -- EXPECT: "permission denied for table decks". That error is the pass
  -- condition here — 0002_grants.sql revoked every privilege from anon, so
  -- the request is refused before RLS is even consulted.
rollback;
