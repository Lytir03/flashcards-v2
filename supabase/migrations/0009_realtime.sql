-- =============================================================================
-- Slice 6: the live quiz watches these two tables over Supabase Realtime.
--
-- postgres_changes respects each table's existing RLS SELECT policy for an
-- authenticated client automatically — the hardened challenge_answers policy
-- from 0008 applies here too, so a participant's Realtime feed is subject to
-- the same "own row, or a question you've already answered" rule as a plain
-- SELECT. Only publication membership is new; no additional policy is needed.
-- =============================================================================

alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.challenge_answers;
