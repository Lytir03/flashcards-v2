-- =============================================================================
-- Slice 6: practice bots.
--
-- Random matchmaking needs a user pool we don't have yet (see docs/03-roadmap.md).
-- Four fixed bot accounts let a single signed-in user play a full match
-- without a second human — seeded once via POST /api/admin/seed-bots, which
-- creates a real (but password-less, un-sign-in-able) auth.users row per bot
-- so the existing `profiles.id references auth.users(id)` FK holds.
-- =============================================================================

alter table public.profiles
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_skill_level text
    check (bot_skill_level in ('novice','casual','sharp','ace'));

-- The new-challenge form lists all bots; this keeps that query cheap.
create index if not exists profiles_bot_idx on public.profiles(is_bot) where is_bot;

-- Redefine weekly_leaderboard (first defined in 0001) to exclude any match
-- where either side was a bot. Otherwise a human could farm the leaderboard
-- by repeatedly beating the weakest bot — bots are for practice, not ranking.
-- challenge_results rows for bot matches are still written (so a player's own
-- match history / results screen works), just invisible to this view.
create or replace view public.weekly_leaderboard
with (security_invoker = on) as
select
  r.deck_id,
  r.user_id,
  p.display_name,
  p.avatar_url,
  sum(r.score)                                   as total_score,
  count(*)                                       as matches_played,
  count(*) filter (where r.outcome = 'win')      as wins
from public.challenge_results r
join public.profiles p on p.id = r.user_id
join public.challenges c on c.id = r.challenge_id
where r.created_at >= date_trunc('week', now())
  and not p.is_bot
  and not exists (
    select 1 from public.profiles opp
     where opp.id in (c.challenger_id, c.opponent_id)
       and opp.is_bot
  )
group by r.deck_id, r.user_id, p.display_name, p.avatar_url;
