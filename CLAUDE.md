# Flashcards v2 — working notes

Study PWA: upload lecture material, generate flashcards with an LLM, review
them with SM-2, challenge other students. Next.js 16 (App Router) · TypeScript ·
Tailwind 4 · Supabase · Vercel.

Read `docs/01-architecture.md` for the full picture. This file holds what is
**not derivable from the code** and what a well-meaning change would break.

## Hard constraints

- **Free tiers only.** Vercel Hobby and Supabase free. Not a preference — it is
  a design input. It is why extraction, transcription and generation are each
  one-unit-per-request with the loop in the browser (60s function cap), why
  uploads go straight from browser to Storage (4.5 MB request body cap), and
  why the reminder cron runs on Supabase `pg_cron` rather than Vercel Cron
  (Hobby allows one run per day, which cannot honour per-user reminder hours).
- **Raw SQL migrations, no ORM.** `supabase/migrations/*.sql`, applied with
  `supabase migration up`. Types are generated, never hand-written:
  `npm run db:types` after every migration.
- **Code and UI in English.** The user writes in Italian; the codebase does not.

## Pinned on purpose

`package.json` holds TypeScript at **6.x** and ESLint at **9.x** although 7 and
10 exist. Both newer majors break `eslint-config-next` — typescript-eslint does
not support TS 7, and ESLint 10 removed an API that Next's bundled
eslint-plugin-react still calls. Reasons are in the `//pins` field. Bumping
them makes `npm run lint` fail to start.

## Things that look like mistakes but are not

- **`proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention and
  exports `proxy`, not `middleware`. A leftover `middleware.ts` is *silently
  ignored at build time*, leaving every protected route publicly reachable.
- **`0002_grants.sql` exists because RLS is not enough.** Supabase's default
  privileges do not include SELECT/INSERT/UPDATE/DELETE, so policies alone
  produce "permission denied for table X". Nothing is granted to `anon` — every
  policy targets `authenticated`, and withholding the grant means a future
  policy written without a role clause still cannot leak to logged-out users.
- **Both extractions of a page are kept.** `source_pages.text_layer` (mechanical)
  and `source_pages.text` (vision). Do not overwrite one with the other: the
  cross-check in `lib/pdf/compare.ts` depends on having both.
- **`review_logs.mode`.** Practice answers must never reschedule a card. See
  below.
- **The review queue is populated by a trigger** (`0005`), not application code,
  because four separate paths approve cards and one forgetting to enqueue fails
  silently.
- **`challenge_questions.correct_index` is not an RLS problem, it's a GRANT
  problem** (`0008_challenge_security.sql`). A row-level policy can't hide one
  column — a participant's own session could `select *` and read the whole
  answer key before playing. Fixed with `revoke select ... from authenticated`
  + a column-level `grant select (safe, columns, only)`, same layer distinction
  `0002_grants.sql` documents. Never add `correct_index` back to that grant;
  the post-match review renders server-side (admin client) instead.
- **`challenge_answers`'s SELECT policy checks the same table it's on.** That
  self-reference recurses in Postgres unless the inner lookup goes through a
  `security definer` function (`has_answered_challenge_question`, owned by a
  role that owns the table, so it bypasses RLS on the way in). Don't inline
  the `exists (select ... from challenge_answers ...)` back into the policy
  — it errors with "infinite recursion detected in policy" the moment two
  rows for the same question exist.
- **Practice bots are real `auth.users` rows**, created via
  `POST /api/admin/seed-bots` (admin API, not a SQL migration — GoTrue's
  required columns aren't stable to hand-write). No password is set; they are
  not sign-in-able. `profiles.is_bot`/`bot_skill_level` drive both the
  scoring in `lib/challenge/bot.ts` and their exclusion from
  `weekly_leaderboard` (redefined in `0010_bots.sql` — bots are for practice,
  not ranking, which also closes the obvious "farm the weakest bot" abuse).

## The governing principle

**A missing card costs far less than an incorrect one.** The user memorises
these cards on purpose, over months; a wrong card is not spotted and discarded,
it is drilled. Everything below follows from that.

- **Flag model output, do not rewrite it.** `lib/pdf/quality.ts` and
  `lib/pdf/compare.ts` detect suspected errors and surface them. They never
  "correct" them. Rewriting a `;` into a `,` asserts something about what the
  source meant.
  - The one exception, and the test for it: `lib/math/autowrap.ts` adds `$...$`
    delimiters, which changes presentation only. **Ask whether the fix could be
    wrong about the mathematics.** If it could, flag instead.
- **The two extraction pipelines fail in opposite directions** — the text layer
  drops symbols but never invents, the vision model invents but rarely drops —
  so their disagreement locates errors without either knowing the answer. This
  is why the vision pass is not simply "better".
- **Every card records `source_page_number`**, and approval and review show the
  original slide. That covers the case both pipelines miss: a symbol dropped by
  both, where there is no disagreement to detect.
- **Bulk approve has two variants** on purpose: "approve all" and "approve only
  the unflagged". Do not collapse them.
- **Practice mode does not touch `card_states`.** Recall two hours after last
  seeing a card says nothing about three-week retention; letting it extend the
  interval would mean extra study damages the schedule.

## Prompts are load-bearing

`lib/ai/prompts.ts` reads oddly specific because each rule was added after
watching a model get it wrong on real material:

- relation symbols (`\le` was being dropped from constraints)
- commas, not semicolons (misread on Beamer slides)
- add nothing not printed (`ℝ^p` was being written as `ℝ^p_+`, inventing a sign
  restriction on equality multipliers)
- no `\documentclass` wrapper ("write in LaTeX" was read as "write a LaTeX file")
- `/no_think` for Ollama (Qwen3 generated reasoning we then discarded)

Do not tidy these away.

## Commands

```bash
supabase start          # local stack, needs Docker
supabase migration up   # apply pending migrations
npm run db:types        # REQUIRED after every migration
npm run dev
npm test                # vitest: sm2, autowrap, challenge scoring + bots, 42 tests
npm run typecheck
npm run lint
```

`AI_PROVIDER` in `.env.local` is `ollama` (local, free), `anthropic` (better,
paid) or `mock` (offline). Local models are weak on dense mathematics — expect
to discard cards.

## State

Slices 0–6 done: auth, decks, upload + extraction, vision fallback, generation
+ approval, SM-2 review, email reminders, challenges (distractor generation,
challenge-by-username + practice bots, live quiz over Realtime, server-side
scoring, weekly leaderboard). Not started: web push, deployment.

Challenges ships **challenge-by-username only** — no random matchmaking pool
yet, per `docs/03-roadmap.md`'s own note that random matching needs users this
app doesn't have. Four fixed practice bots (seeded via
`POST /api/admin/seed-bots`) exist so a single account can play a full match
without a second human.

`docs/03-roadmap.md` has the plan.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
