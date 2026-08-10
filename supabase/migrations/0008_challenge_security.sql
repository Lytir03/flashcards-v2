-- =============================================================================
-- Slice 6 hardening, found while designing the challenges feature.
--
-- 1. challenge_questions leaked the answer key up front. The 0001 SELECT
--    policy grants a participant every column, including correct_index, from
--    the moment a challenge is created. That's a row-level policy — it can't
--    hide one column — so a participant's own browser session (same
--    publishable key the app uses) could call
--    `supabase.from('challenge_questions').select('*')...` directly and read
--    the whole answer key before playing. RLS alone cannot fix this; only a
--    column-level GRANT can, same layer-1-vs-layer-2 distinction
--    0002_grants.sql documents for tables.
--
-- 2. challenge_answers let a participant read the opponent's answer for a
--    question the participant hadn't answered yet. Realtime enforces the
--    same RLS the table already has, so the opponent's INSERT payload for
--    the current question arrived in the WebSocket frame regardless of what
--    the UI chose to render — a timed quiz's fairness depended on the
--    client's cooperation, not the database's.
--
-- 3. Once bots exist (0010), a human could farm weekly_leaderboard by
--    repeatedly beating the weakest one. Excluding bot-involved matches from
--    the view is the honest fix — bots are for practice, not ranking — and
--    is stronger than a rate limit, which is still gameable by spacing
--    requests out.
-- =============================================================================

-- --- 1. Hide correct_index from every browser-facing role ---------------------
revoke select on public.challenge_questions from authenticated;
grant select (id, challenge_id, flashcard_id, position, question, choices)
  on public.challenge_questions to authenticated;

-- --- 2. An opponent's answer is invisible until you've answered the same question
--
-- A policy that subqueries its own table in the USING clause recurses:
-- evaluating "do I have a row for this question" re-runs this same policy on
-- that inner query, which runs it again, and so on. Postgres detects this
-- and errors rather than hanging, but the fix is the standard one for
-- self-referencing RLS — a SECURITY DEFINER helper. It's owned by the
-- migration role, which owns the table, and table owners bypass their own
-- RLS by default, so the inner lookup doesn't re-trigger the policy.
create or replace function public.has_answered_challenge_question(p_question_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.challenge_answers
     where question_id = p_question_id and user_id = p_user_id
  );
$$;

grant execute on function public.has_answered_challenge_question(uuid, uuid) to authenticated;

drop policy "challenge_answers: participants read" on public.challenge_answers;

create policy "challenge_answers: own or after answering"
  on public.challenge_answers for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_answered_challenge_question(question_id, (select auth.uid()))
  );

-- Item 3 (excluding bot matches from weekly_leaderboard) lives in
-- 0010_bots.sql instead of here: it depends on profiles.is_bot, which that
-- migration adds, and migrations run in filename order.
