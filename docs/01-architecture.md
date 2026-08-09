# Architecture — Phase 0 (MVP)

Status: **proposal, nothing implemented yet.** Review this + `02-schema.md` before we write code.

## Decisions taken (and why)

| Decision | Choice | Why |
|---|---|---|
| Data access | Raw SQL migrations + typed Supabase client | RLS stays visible in one place; no ORM/RLS impedance mismatch; `supabase gen types` gives type safety for free. |
| PDF text extraction | Server-side, Next.js route handler (`unpdf`) | One place to debug. Vercel Hobby caps functions at 60s → we extract and generate in **two separate requests**, not one. |
| Card generation | Anthropic API with a **tool-use JSON schema** (structured output) | Guarantees parseable output; we validate with Zod before insert, and reject the batch rather than saving half-broken cards. |
| SRS state | Separate `card_states` table, one row per (user, card) | Cards live on a deck; a deck can be shared. Review progress is *personal*, so it cannot live on `flashcards`. This is the single most important schema decision — putting `ease_factor` on `flashcards` would block sharing later. |
| Challenge format | Multiple choice, distractors precomputed at challenge creation | Free-text answers need grading (slow, another LLM call). MC makes scoring instant and fair, which is what a speed quiz needs. |
| Realtime | Supabase Realtime on `challenge_answers` | No WebSocket server to host. Both clients subscribe to the same challenge row set. |
| Challenge trust model | Score computed **server-side** in a route handler; clients never write their own score | Clients can lie about response time. RLS alone can't enforce "answered within 15s". |
| Table privileges | Explicit GRANTs in `0002_grants.sql`, nothing for `anon` | Supabase's default privileges do not include SELECT/INSERT/UPDATE/DELETE, so RLS policies alone leave you with "permission denied for table X". Measured, not assumed — see the comment in that file. |
| Language | Code + UI in English | i18n can be layered on later if you go Italian-facing. |

## Open questions I'd flag now, not later

1. **Async generation.** For phase 0, generation is a plain POST that blocks until Claude answers (~10–30s for a 40-slide deck). That fits in 60s and needs no queue. If you later upload 100-page PDFs, this breaks and we move to a Supabase Edge Function + `sources.status` polling — which is why `sources` already has a `status` column.
2. **Deck sharing.** `decks.visibility` + `deck_subscriptions` exists from day one because challenges need two users on a common deck. If we skipped it, the competitive step would require a migration mid-project.
3. **Anthropic key.** Lives only in a server env var, never in a `NEXT_PUBLIC_` var. All Claude calls go through route handlers.

## Folder structure

```
flashcards-v2/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── manifest.ts                       # PWA manifest
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts             # Supabase OAuth code exchange
│   ├── (app)/                            # authenticated shell
│   │   ├── layout.tsx                    # nav + session guard
│   │   ├── onboarding/page.tsx           # display name, course of study
│   │   ├── dashboard/page.tsx            # "Due today", grouped by deck
│   │   ├── decks/
│   │   │   ├── page.tsx                  # list + create
│   │   │   └── [deckId]/
│   │   │       ├── page.tsx              # cards, sources, stats
│   │   │       ├── upload/page.tsx       # file picker → Storage
│   │   │       ├── review/page.tsx       # SRS session
│   │   │       └── sources/[sourceId]/page.tsx   # approve/edit generated cards
│   │   ├── challenges/
│   │   │   ├── page.tsx                  # inbox, matchmaking, leaderboard
│   │   │   └── [challengeId]/page.tsx    # live quiz
│   │   └── settings/page.tsx             # email/push prefs
│   └── api/
│       ├── sources/[id]/extract/route.ts # storage → text → sources.extracted_text
│       ├── sources/[id]/generate/route.ts# text → Claude → flashcards (status=draft)
│       ├── reviews/route.ts              # POST rating → SM-2 → card_states + review_logs
│       ├── challenges/route.ts           # POST create / matchmake
│       ├── challenges/[id]/start/route.ts
│       ├── challenges/[id]/answer/route.ts   # authoritative scoring
│       └── push/subscribe/route.ts
├── components/
│   ├── ui/                               # buttons, dialogs, primitives
│   ├── decks/                            # DeckCard, CardEditor, CardList
│   ├── review/                           # ReviewCard, RatingButtons, SessionProgress
│   └── challenge/                        # QuestionTimer, ScoreBar, Leaderboard
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # browser client
│   │   ├── server.ts                     # RSC / route handler client (cookies)
│   │   ├── admin.ts                      # service-role, server-only
│   │   └── middleware.ts                 # session refresh
│   ├── db/types.ts                       # generated: supabase gen types typescript
│   ├── ai/
│   │   ├── anthropic.ts                  # client + model constant
│   │   ├── schemas.ts                    # Zod: GeneratedCard, GeneratedCardSet
│   │   └── prompts.ts                    # generation + distractor prompts
│   ├── srs/
│   │   ├── sm2.ts                        # pure function, zero I/O
│   │   └── sm2.test.ts
│   ├── pdf/extract.ts
│   ├── challenge/scoring.ts              # pure: correctness + speed → points
│   ├── email/resend.ts
│   └── push/webpush.ts
├── supabase/
│   ├── migrations/0001_init.sql
│   └── functions/daily-reminder/index.ts # cron → Resend
├── public/                               # icons, sw.js
├── middleware.ts
└── docs/                                 # these files
```

Rule of thumb: **`lib/srs`, `lib/challenge/scoring` and `lib/ai/schemas` are pure and unit-tested; everything touching the DB is a thin wrapper around them.** That keeps the only genuinely tricky logic (SM-2, scoring) testable without a database.

## SM-2 as we'll implement it

Ratings map to SM-2 quality: `again=0`, `hard=3`, `good=4`, `easy=5`.

```
if rating == again:
    repetitions = 0
    interval    = 0          # re-show in the same session
    lapses     += 1
else:
    repetitions += 1
    interval = 1                       if repetitions == 1
             = 6                       if repetitions == 2
             = round(interval * ease)  otherwise
    if rating == hard: interval = max(1, round(interval * 0.8))
    if rating == easy: interval = round(interval * 1.3)

ease = clamp(ease + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), min 1.3)
due_date = today + interval days
```

Deviations from textbook SM-2, deliberate: the `hard`/`easy` interval multipliers are Anki's, not SM-2's — plain SM-2 makes "hard" feel indistinguishable from "good" and users notice.
