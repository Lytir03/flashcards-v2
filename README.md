# Flashcards v2

Study PWA: upload lecture material, generate flashcards with an LLM, review them
with SM-2 spaced repetition, challenge other students to quick quizzes.

Next.js (App Router) · TypeScript · Tailwind · Supabase · Vercel.

## Running locally

Everything runs on your machine. No cloud account and no API key required.

```bash
# 1. Supabase stack (Docker must be running)
supabase start

# 2. Dependencies
npm install

# 3. Generate DB types from the local schema — do this before `npm run dev`,
#    and again after every migration
npm run db:types

# 4. Dev server
npm run dev
```

`.env.local` is already filled in with the local Supabase keys. They are shared
defaults, identical on every machine, valid only on `127.0.0.1` — not secrets.

| What | Where |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Mailpit (fake inbox) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Stop the stack with `supabase stop`. Worth doing on untrusted networks: the
local services bind to `0.0.0.0` and Studio has no authentication.

## AI provider

Card generation goes through one interface with three backends, selected by
`AI_PROVIDER` in `.env.local`:

- `ollama` — local, free, no key. Default. Needs `ollama serve` and the model in
  `OLLAMA_MODEL` (currently `qwen3:8b`).
- `anthropic` — Claude. Better cards, needs `ANTHROPIC_API_KEY`.
- `mock` — canned cards, no network. Used by tests.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:types` | Regenerate `lib/db/types.ts` from the local DB |
| `npm run db:reset` | Drop and re-apply all migrations |

## Pinned versions, on purpose

`package.json` holds TypeScript at 6.x and ESLint at 9.x even though 7.x and
10.x exist. Both newer majors currently break `eslint-config-next`; the reasons
are recorded in the `//pins` field. Bumping them will make `npm run lint` fail
to start, not fail loudly on a rule.

## Docs

- [`docs/01-architecture.md`](docs/01-architecture.md) — folder layout, decisions and why
- [`docs/03-roadmap.md`](docs/03-roadmap.md) — build order, one vertical slice at a time
- [`supabase/migrations/`](supabase/migrations/) — schema, raw SQL, no ORM
