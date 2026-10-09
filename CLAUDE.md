# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

The authoritative agent guide is **[`AGENTS.md`](AGENTS.md)** — it holds the full file map and
the hard rules (no IP leakage, key stays server-side, theme via tokens, CopilotKit pin, owner
gates, fixed section ids, rate-limited open routes, privacy-first growth, unified naming).
Treat those rules as binding. This file is a short supplement; do not contradict `AGENTS.md`.

## What this is

A personal portfolio that is itself an agentic webapp — a Next.js 15 (App Router) site whose
on-page CopilotKit agent answers questions about the owner's work (grounded in `content/*`) and
acts as a chat-driven CMS. It has grown into an **instance platform**: the same codebase serves
a different brand vertical as a data pack (`INSTANCE` env), hosts a 1-click portfolio maker
(`/make` → `/p/<slug>`, multi-tenant), and joins a self-propelling A2A network. Runs at $0 on a
free-LLM survival chain.

## Commands

```bash
npm install
npm run dev                      # local dev → http://localhost:3000
npm run build                    # production build — the real gate; must stay green before shipping
npm test                         # all fast pure-logic tests (plain Node, no framework)
node scripts/test-<name>.mjs     # run a single test (e.g. test-recovery.mjs, test-sync.mjs)
npm run test:unit                # Vitest component tests (jsdom + React Testing Library)
npm run test:e2e                 # Playwright: /make form with REAL typing (catches focus-loss bugs)
INSTANCE=learning-center npm start   # serve a different vertical from the same code
```

`npm test` chains ~22 `scripts/test-*.mjs` files. Each is a dependency-free Node script testing a
pure module — most import directly from `packages/core/src/*-types.ts`, which is why those files
must stay fs-free. `scripts/test-storage-kv.mjs` runs against a real Postgres if
`POSTGRES_URL`/`DATABASE_URL` is in `.env.local`, else skips cleanly. `npm run lint` is stock
`next lint` (no real config).

**Form/UI changes need `npm run test:e2e`, not just curl** — a React component defined inside
another component remounts every render and drops input focus per keystroke; only real typing
catches it (this shipped broken once).

## Architecture in one pass

**Three layers, bottom-up:**

1. **`packages/core/` (`@core`, imported via the `@core/*` tsconfig alias)** — the pure
   contract layer. Fs-free, network-free `-types.ts` modules (instance, verification, jobfit,
   society, referrals, sync, registry, recovery…) hold every data shape plus the deterministic
   math (`aggregate()`, `aggregateFit`, `scoreStanding`, `growthStats`). Client components and
   plain-Node tests both import these. **Never add app/fs imports here.**

2. **`lib/` + `content/`** — server logic and data. Everything shown on the page is data-driven
   from `content/` (never hardcode copy in components): `profile.ts` (fixed schema; wording
   editable only via whitelisted overrides in `lib/overrides.ts`), `projects.json` (private repos:
   `url: null`, highlight only), `portfolio.yaml` (the agent-editable control surface: section
   order/visibility/labels, theme, articles), `instances/*.ts` (content packs). `lib/storage.ts`
   is durable KV over Postgres (Neon HTTP driver) that degrades to the fs seed when unset —
   registry joins, hosted portfolios, leads, and society state all live there.

3. **`app/` + `components/`** — `app/page.tsx` (`force-dynamic` server component) branches on
   `getActiveInstance()`: a non-portfolio `INSTANCE` renders the generic `<InstanceSite>`; a
   `MAKER_HOME` deploy renders `<MakerLanding>`; otherwise the personal `<Portfolio>` (client
   component holding layout state, registering CopilotKit actions, gating every edit through
   `gate()` so visitors only get proposals).

**Two owner gates — don't confuse them.** The global `PORTFOLIO_OWNER_TOKEN` (`lib/owner.ts`,
`isOwnerRequest()`) makes the deploy admin an owner. Hosted `/p/<slug>` portfolios are
**multi-tenant**: each gets its own token minted at `/make` (only the SHA-256 hash stored at
`owner:<slug>`; raw token shown once), verified per-slug via `ownsInstance(req, slug)` from `lib/instance-owner.ts` (the only copy)
(`lib/portfolio-owner.ts`). The admin bypass must be `ownerTokenConfigured() && isOwnerRequest()`
— bare `isOwnerRequest()` returns `true` when no token is configured and would leave every tenant
open. Email-based recovery (`/recover`, `POST /api/recover`, `@core/recovery-types` +
`lib/email.ts`) re-mints a lost per-portfolio token via a short-lived single-use emailed link.

**LLM policy.** The key lives only server-side (`app/api/copilotkit/route.ts` via `lib/llm.ts`).
The chain is Groq → Gemini → NIM → OpenAI, free tiers first; non-streaming routes use
`chatWithFailover()` (`lib/llm-complete.ts`) so a 429 fails over, not the request. The streaming
copilot route leads with Gemini (big daily quota; a mid-stream 429 can't be caught by init
failover). Models must support tool-calling AND stream `delta.content`. CopilotKit is pinned to
**1.5.20** — 1.6x breaks tool round-trips; don't loosen it.

**The network layer.** Inbound A2A: agent card at `/.well-known/agent-card.json` + JSON-RPC
`/api/a2a`, both instance-aware, answering grounded + honest (private → highlight only;
unprovable → "unverified"). `/api/registry` is the portfolio directory (join by A2A card
validation, never fabrication); `/api/registry/ask` fans a question out to member agents.
Growth is measured, never claimed: `?ref=<slug>` attribution edges → `growthStats()` computes K
in code; credit flows only when an invitee ships a live portfolio. Society standing
(`/api/standing`) is likewise computed (`scoreStanding`), never trusted from a model.

**Honesty is load-bearing across every judge surface.** Resume verification
(`/api/verify-resume`), role fit (`/api/job-fit`), standing, and A2A answers all follow the same
pattern: the LLM judges individual items, but every aggregate/score is recomputed
deterministically in `packages/core`; skeptical verdicts (`unverified`/`contradicted`) are kept;
corpora are budget-bounded for free-tier TPM. Tools that draft (verified résumé, scout intros,
outreach) **never send** — human-in-the-loop always.

**Open routes stay rate-limited.** Anything without an owner gate that touches the LLM or GitHub
(`copilotkit`, `a2a`, `repo-digest`, `repo-activity`, `registry`, `verify-resume`, `job-fit`,
`make`, `join`…) calls `rateLimit()` per IP — removing it reopens the quota-drain hole.

**Theming is a token seam.** Components read `text-ink`/`text-muted`/`bg-surface`/`border-edge`/
`accent` only (mapped in `tailwind.config.ts` → `app/themes.css` `[data-theme]` bodies). New brand
= one CSS block, zero component edits. **Never put `data-theme` on a content wrapper** — it
freezes the page on that brand and silently breaks the StyleSwitcher; set page defaults on
`<html>` via the no-flash inline script pattern (see `app/p/[slug]/page.tsx`).

**Sync/cadence.** `POST /api/sync` (owner-gated) pulls public GitHub + YouTube into a hosted
portfolio's writings; `GET` is the cron path (Vercel cron / GitHub Action) syncing all hosted
portfolios. X + LinkedIn are not server-syncable (login-walled) — reported honestly, never faked.
LinkedIn import runs in the user's own browser: console script (`public/linkedin-harvest.js`) or
the zero-trust `extension/` (storage+tabs perms only, no network — loaded unpacked, not part of
the Next build); both converge on one pipeline (`Portfolio.tsx` `runImport()` + the shared
`extension/harvest-core.js` dedupe engine — don't fork it).

`lib/voice/` is a portable, dependency-free Web Speech module — it must not import any
app/CopilotKit code.

## Doc-sync (workspace policy)

Any change to feature code, the API surface, the data model, or a flag must ship — in the same
change — with a `CHANGELOG.md` entry **and** `README.md` (human) **and** `AGENTS.md` (agent)
updates. A pre-push hook enforces this; conscious bypass is `SKIP_DOC_SYNC=1`.

## Hosted writing (2026-10-08)

Owners publish articles and ideas at `/p/<slug>/write` → `/p/<slug>/w/<id>` (`app/api/posts`, `packages/core/src/post-types.ts`).
The body is owner-written and shown to every visitor, so `renderMarkdown` must stay escape-first with no raw-HTML path;
`scripts/test-posts.mjs` carries the XSS cases. Keep it.

## 1-click setup and run (2026-10-08)

The public repo promises one step per path: `/make` (no code) · the Deploy button (`scripts/deploy-button.mjs`) ·
`npm run quickstart` (`scripts/setup.mjs`). `scripts/test-one-click.mjs` is the promise as a test. Keep it green. Any
new required env var goes into `.env.example`, `REQUIRED_ENV`, and the README badge in the same change.
