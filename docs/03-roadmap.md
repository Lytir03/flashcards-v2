# Build roadmap — vertical slices

Each slice ends with something you can open in a browser and judge. We don't start
the next one until you've seen the previous one work.

## Slice 0 — Skeleton (~30 min)
Next.js + TS + Tailwind scaffold, Supabase project linked, migration applied,
`lib/db/types.ts` generated, deployed to Vercel.

**Checkpoint:** a deployed page that says hello and reads `select count(*) from decks`.

**Needs from you:** a Supabase project (free tier) and its URL + anon key + service-role key,
plus an Anthropic API key. All go in `.env.local` and Vercel env vars.

## Slice 1 — Auth + decks
Email and Google login, onboarding form, deck CRUD.

**Checkpoint:** you sign in with Google, set your name, create "Anatomia I", see it in a list, sign out, sign back in and it's still there.

## Slice 2 — Upload + text extraction
Storage upload to `materials/<uid>/`, `POST /api/sources/[id]/extract`, source detail page showing the extracted text and character count.

**Checkpoint:** upload a real lecture PDF, see its text on screen. No AI yet — this isolates PDF parsing bugs from prompt bugs.

## Slice 3 — Card generation
Claude call with a tool-schema output, Zod validation, cards saved as `draft`, an approval screen where you edit / delete / approve.

**Checkpoint:** that same PDF produces ~20 cards, you fix two of them, approve the rest, and they show as `approved` in the deck.

Prompt design notes: we chunk `extracted_text` at ~12k characters with slide-boundary
awareness, ask for 3–8 cards per chunk, and instruct Claude to skip title/outline/
thank-you slides. Each card carries a `topic` tag so the deck stays browsable.

## Slice 4 — Spaced repetition
`lib/srs/sm2.ts` + unit tests first, then `POST /api/reviews`, the review session UI,
and the "Due today" dashboard grouped by deck.

**Checkpoint:** review ten cards, press "again" on one and see it come back in the same session; a card rated "good" gets `due_on = tomorrow`. Streak increments.

## Slice 5 — Reminders
Supabase cron → Edge Function → Resend, "you have N cards due". Web push as a bonus, behind a settings toggle.

**Checkpoint:** you receive the email.

## Slice 6 — Challenges
Distractor generation (one Claude call per challenge, cached on `challenge_questions`),
challenge creation + matchmaking, the live quiz with Realtime, server-side scoring,
weekly leaderboard.

**Checkpoint:** two browser windows, two accounts, one deck, a full 7-question match with a winner and a leaderboard entry.

---

## Things I expect to bite us, listed now so they're not surprises

- **Vercel free tier function timeout (60s).** Extraction and generation are separate requests for this reason. If a PDF is very large we'll chunk generation across multiple requests driven by the client.
- **Claude cost.** A 40-slide deck is roughly 15–20k tokens in, a few thousand out. Cheap per upload, but add a per-user daily generation cap before you share the app with a class.
- **iOS web push** only works if the PWA is added to the home screen. Email is the reliable channel; treat push as a bonus.
- **Matchmaking with no users.** Random matching needs a pool. Until then, challenge-by-username is the path that actually works, so we build that first.
