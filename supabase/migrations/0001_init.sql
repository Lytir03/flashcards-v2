-- =============================================================================
-- Flashcards v2 — initial schema (Phase 0 / MVP)
-- NOT YET APPLIED. Review before running `supabase db push`.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. PROFILES
-- Mirrors auth.users. We never write to auth.users directly.
-- =============================================================================
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique
                     check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name     text not null,
  course_of_study  text,
  avatar_url       text,
  timezone         text not null default 'Europe/Rome',

  -- streak: updated whenever a review session completes
  current_streak   int  not null default 0,
  longest_streak   int  not null default 0,
  last_studied_on  date,

  -- notification preferences
  daily_email_enabled boolean not null default true,
  reminder_hour       int     not null default 8 check (reminder_hour between 0 and 23),

  onboarded_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. DECKS  (= materia / corso)
-- =============================================================================
create table public.decks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text,
  color        text not null default 'slate',
  -- 'private': only owner. 'public': discoverable, subscribable, challengeable.
  visibility   text not null default 'private'
                 check (visibility in ('private', 'public')),
  card_count   int  not null default 0,   -- denormalised, kept by trigger below
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index decks_owner_idx      on public.decks(owner_id);
create index decks_visibility_idx on public.decks(visibility) where visibility = 'public';

-- Users studying a deck they don't own.
create table public.deck_subscriptions (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  deck_id      uuid not null references public.decks(id)    on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, deck_id)
);
create index deck_subscriptions_deck_idx on public.deck_subscriptions(deck_id);

-- =============================================================================
-- 3. SOURCES  (uploaded material)
-- extracted_text is kept so we can re-generate without re-parsing the PDF.
-- =============================================================================
create table public.sources (
  id             uuid primary key default gen_random_uuid(),
  deck_id        uuid not null references public.decks(id)    on delete cascade,
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  filename       text not null,
  storage_path   text not null,             -- bucket 'materials', path <user_id>/<uuid>.pdf
  mime_type      text not null,
  size_bytes     bigint,
  status         text not null default 'uploaded'
                   check (status in ('uploaded','extracting','extracted','generating','ready','failed')),
  extracted_text text,
  char_count     int,
  error_message  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index sources_deck_idx on public.sources(deck_id);

-- =============================================================================
-- 4. FLASHCARDS
-- Content only. No per-user review state here — see card_states.
-- =============================================================================
create table public.flashcards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references public.decks(id)    on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  source_id   uuid references public.sources(id) on delete set null,
  question    text not null check (char_length(question) between 1 and 2000),
  answer      text not null check (char_length(answer)   between 1 and 4000),
  topic       text,                          -- tag from Claude, e.g. "Krebs cycle"
  -- 'draft': generated, awaiting user approval. Only 'approved' enters the SRS queue.
  status      text not null default 'draft'
                 check (status in ('draft','approved','archived')),
  origin      text not null default 'ai'
                 check (origin in ('ai','manual')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index flashcards_deck_status_idx on public.flashcards(deck_id, status);
create index flashcards_source_idx      on public.flashcards(source_id);
create index flashcards_topic_idx       on public.flashcards(deck_id, topic);

-- Keep decks.card_count in sync (approved cards only).
create or replace function public.sync_deck_card_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.decks d
     set card_count = (
       select count(*) from public.flashcards f
        where f.deck_id = d.id and f.status = 'approved'
     )
   where d.id = coalesce(new.deck_id, old.deck_id);
  return null;
end;
$$;

create trigger flashcards_count_trg
  after insert or update of status, deck_id or delete on public.flashcards
  for each row execute function public.sync_deck_card_count();

-- =============================================================================
-- 5. CARD_STATES  (SM-2 state, one row per user per card)
-- =============================================================================
create table public.card_states (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id)  on delete cascade,
  flashcard_id     uuid not null references public.flashcards(id) on delete cascade,
  deck_id          uuid not null references public.decks(id)      on delete cascade,

  ease_factor      numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days    int  not null default 0  check (interval_days >= 0),
  repetitions      int  not null default 0  check (repetitions >= 0),
  lapses           int  not null default 0,
  due_on           date not null default current_date,
  -- 'new' has never been answered; 'learning' is in the same-day re-show loop.
  state            text not null default 'new'
                     check (state in ('new','learning','review','suspended')),
  last_reviewed_at timestamptz,
  created_at       timestamptz not null default now(),
  unique (user_id, flashcard_id)
);
-- The dashboard query: "cards due for me today, by deck".
create index card_states_due_idx on public.card_states(user_id, due_on, deck_id)
  where state <> 'suspended';

-- =============================================================================
-- 6. REVIEW_LOGS  (append-only history; powers stats and lets us replay SM-2)
-- =============================================================================
create table public.review_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id)   on delete cascade,
  flashcard_id      uuid not null references public.flashcards(id) on delete cascade,
  deck_id           uuid not null references public.decks(id)      on delete cascade,
  rating            text not null check (rating in ('again','hard','good','easy')),
  -- state before/after, so a bad SM-2 change can be audited or replayed
  prev_interval     int,
  new_interval      int,
  prev_ease         numeric(4,2),
  new_ease          numeric(4,2),
  duration_ms       int,
  reviewed_at       timestamptz not null default now()
);
create index review_logs_user_time_idx on public.review_logs(user_id, reviewed_at desc);

-- =============================================================================
-- 7. CHALLENGES
-- =============================================================================
create table public.challenges (
  id                  uuid primary key default gen_random_uuid(),
  deck_id             uuid not null references public.decks(id) on delete cascade,
  challenger_id       uuid not null references public.profiles(id) on delete cascade,
  opponent_id         uuid references public.profiles(id) on delete cascade,  -- null = waiting for random match
  status              text not null default 'pending'
                        check (status in ('pending','active','completed','declined','expired')),
  question_count      int  not null default 7  check (question_count between 3 and 20),
  seconds_per_question int not null default 15 check (seconds_per_question between 5 and 60),
  winner_id           uuid references public.profiles(id) on delete set null,  -- null on draw
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  expires_at          timestamptz not null default now() + interval '48 hours',
  check (opponent_id is null or opponent_id <> challenger_id)
);
create index challenges_opponent_idx on public.challenges(opponent_id, status);
create index challenges_open_idx     on public.challenges(deck_id, status)
  where status = 'pending' and opponent_id is null;

-- Questions are frozen at creation so both players get the identical quiz
-- even if the underlying flashcard is later edited.
create table public.challenge_questions (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id)  on delete cascade,
  flashcard_id  uuid references public.flashcards(id) on delete set null,
  position      int  not null check (position >= 0),
  question      text not null,          -- snapshot
  choices       jsonb not null,         -- ["...","...","...","..."]
  correct_index int  not null check (correct_index between 0 and 3),
  unique (challenge_id, position)
);

create table public.challenge_answers (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id)          on delete cascade,
  question_id   uuid not null references public.challenge_questions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id)            on delete cascade,
  selected_index int check (selected_index between 0 and 3),  -- null = timed out
  is_correct    boolean not null,
  response_ms   int not null,
  points        int not null default 0,
  answered_at   timestamptz not null default now(),
  unique (question_id, user_id)
);
create index challenge_answers_challenge_idx on public.challenge_answers(challenge_id);

-- Final per-player result. One row per player, written server-side at completion.
create table public.challenge_results (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges(id)   on delete cascade,
  user_id        uuid not null references public.profiles(id)     on delete cascade,
  deck_id        uuid not null references public.decks(id)        on delete cascade,
  score          int not null default 0,
  correct_count  int not null default 0,
  total_time_ms  int not null default 0,
  outcome        text not null check (outcome in ('win','loss','draw')),
  created_at     timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index challenge_results_leaderboard_idx
  on public.challenge_results(deck_id, created_at desc);

-- Weekly leaderboard per deck.
create view public.weekly_leaderboard
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
where r.created_at >= date_trunc('week', now())
group by r.deck_id, r.user_id, p.display_name, p.avatar_url;

-- =============================================================================
-- 8. PUSH SUBSCRIPTIONS (web push, best effort)
-- =============================================================================
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 9. ROW LEVEL SECURITY
-- Default posture: a user sees their own rows, plus public decks and their cards.
-- Anything the client must not be able to forge (scores, SM-2 results) is
-- written by route handlers using the service-role key, which bypasses RLS.
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.decks               enable row level security;
alter table public.deck_subscriptions  enable row level security;
alter table public.sources             enable row level security;
alter table public.flashcards          enable row level security;
alter table public.card_states         enable row level security;
alter table public.review_logs         enable row level security;
alter table public.challenges          enable row level security;
alter table public.challenge_questions enable row level security;
alter table public.challenge_answers   enable row level security;
alter table public.challenge_results   enable row level security;
alter table public.push_subscriptions  enable row level security;

-- profiles: everyone can read (needed for leaderboards), only self can write
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "profiles self update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- decks
create policy "decks: own or public readable"
  on public.decks for select to authenticated
  using (owner_id = (select auth.uid()) or visibility = 'public');
create policy "decks: owner writes"
  on public.decks for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- deck_subscriptions
create policy "subs: self"
  on public.deck_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- sources: strictly private to the uploader
create policy "sources: owner only"
  on public.sources for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- flashcards: readable if you can read the deck; writable only by the deck owner
create policy "flashcards: readable with deck"
  on public.flashcards for select to authenticated
  using (exists (
    select 1 from public.decks d
     where d.id = flashcards.deck_id
       and (d.owner_id = (select auth.uid()) or d.visibility = 'public')
  ));
create policy "flashcards: owner writes"
  on public.flashcards for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- card_states / review_logs: strictly personal
create policy "card_states: self"
  on public.card_states for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "review_logs: self read"
  on public.review_logs for select to authenticated
  using (user_id = (select auth.uid()));

-- challenges: visible to both participants, and open challenges are discoverable
create policy "challenges: participants or open"
  on public.challenges for select to authenticated
  using (
    challenger_id = (select auth.uid())
    or opponent_id = (select auth.uid())
    or (status = 'pending' and opponent_id is null)
  );
create policy "challenges: challenger creates"
  on public.challenges for insert to authenticated
  with check (challenger_id = (select auth.uid()));

create policy "challenge_questions: participants read"
  on public.challenge_questions for select to authenticated
  using (exists (
    select 1 from public.challenges c
     where c.id = challenge_questions.challenge_id
       and (select auth.uid()) in (c.challenger_id, c.opponent_id)
  ));

-- Answers are readable by both players (that's how Realtime shows the opponent's
-- progress) but inserted only server-side, so no insert policy exists here.
create policy "challenge_answers: participants read"
  on public.challenge_answers for select to authenticated
  using (exists (
    select 1 from public.challenges c
     where c.id = challenge_answers.challenge_id
       and (select auth.uid()) in (c.challenger_id, c.opponent_id)
  ));

create policy "challenge_results: readable by authenticated"
  on public.challenge_results for select to authenticated using (true);

create policy "push_subscriptions: self"
  on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- =============================================================================
-- 10. STORAGE
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 26214400,
        array['application/pdf','text/plain','text/markdown'])
on conflict (id) do nothing;

create policy "materials: own folder"
  on storage.objects for all to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =============================================================================
-- 11. updated_at triggers
-- =============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch   before update on public.profiles   for each row execute function public.touch_updated_at();
create trigger decks_touch      before update on public.decks      for each row execute function public.touch_updated_at();
create trigger sources_touch    before update on public.sources    for each row execute function public.touch_updated_at();
create trigger flashcards_touch before update on public.flashcards for each row execute function public.touch_updated_at();
