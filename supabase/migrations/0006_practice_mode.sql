-- =============================================================================
-- Free practice: study any card at any time, whether or not it is due.
--
-- THE CONSTRAINT THAT MATTERS
-- A practice answer must NOT reschedule the card. Spaced repetition works by
-- asking you a question when you are on the verge of forgetting it; answering
-- correctly two hours after you last saw it proves nothing and, if it were
-- allowed to move the interval, would push the card further out on the
-- strength of a recall that was actually short-term memory. Extra studying
-- would silently damage the schedule — the user would be punished for using
-- the feature.
--
-- So practice writes to review_logs and nothing else. card_states is untouched.
-- The `mode` column keeps the two apart, so later statistics ("how well am I
-- actually retaining?") can look only at scheduled reviews, where the answer
-- means something.
-- =============================================================================

alter table public.review_logs
  add column if not exists mode text not null default 'scheduled'
    check (mode in ('scheduled', 'practice'));

create index if not exists review_logs_mode_idx
  on public.review_logs(user_id, mode, reviewed_at desc);
