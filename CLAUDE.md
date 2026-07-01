# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read AGENTS.md first

The authoritative agent guide is **[`AGENTS.md`](AGENTS.md)** — it holds the full file map
and the hard rules (no IP leakage, key stays server-side, theme via tokens, CopilotKit pin,
owner gate, fixed section ids, portable voice). Treat those rules as binding. This file is a
short supplement; do not contradict `AGENTS.md`.

## What this is

A personal portfolio that is itself an agentic webapp: a Next.js 15 (App Router) site whose
on-page CopilotKit agent answers questions about the owner's work — grounded in the repo's
own `content/*` — and is also a chat-driven CMS (the owner can reorder/hide/rename sections,
swap theme, and add articles by talking to it). Backed by a free-LLM survival chain so it
runs at $0.

## Commands

```bash
npm install
npm run dev                      # local dev → http://localhost:3000
npm run build                    # production build — must stay green before shipping
npm start                        # serve the production build
npm test                         # harvest-core dedupe + LinkedIn URL classification (lib/linkedin.ts)
```

There's a global error boundary (`app/error.tsx` + `app/global-error.tsx`) so an unhandled client
error degrades to a recovery UI, never a blank page. The LinkedIn feed/post classifier lives in
`lib/linkedin.ts` (shared by `Portfolio.tsx`) and is covered by `scripts/test-linkedin-url.mjs`.

The browser extension in `extension/` is loaded unpacked (`chrome://extensions`), not part
of the Next build. Its `harvest-core.js` (the dedupe engine) is what `test-harvest.mjs`
covers — keep that test green when touching either.

There is no test runner and no real lint config — `npm run lint` is stock `next lint`, and
the LinkedIn-harvest script is the only thing with a dedicated test. After feature changes,
the real gate is **`npm run build`** (TypeScript + Next compile) plus `node scripts/test-harvest.mjs`
if you touched `public/linkedin-harvest.js`.

## Architecture in one pass

The whole app is **data-driven from `content/`** — never hardcode copy in components:

- `content/profile.ts` — mission, values, 12X practices, identity.
- `content/projects.json` — active repos; private ones are `url: null` + highlight only.
- `content/portfolio.yaml` — the **control surface**: section order/visibility/labels, theme,
  and the article list. This is what the agent edits.

Two layers meet at `app/page.tsx` (a `force-dynamic` server component): it reads the YAML via
`lib/portfolio.ts`, builds the agent's grounding context, and renders
`<CopilotProvider><Portfolio/></CopilotProvider>`. `components/Portfolio.tsx` (`"use client"`)
holds layout in state, registers the CopilotKit **actions**, and gates every edit through
`gate()` so a **visitor only ever gets a proposal** — applies are owner-only.

The **owner gate is the real security boundary**: `lib/owner.ts` (`isOwnerRequest`) is checked
server-side in `app/api/portfolio/route.ts` (POST → 403 without the token) and
`app/api/fetch-article/route.ts`. Secret is `PORTFOLIO_OWNER_TOKEN`; never `NEXT_PUBLIC_*`.

The **LLM key lives only in `app/api/copilotkit/route.ts`** (via `lib/llm.ts`), never client-side.
`lib/llm.ts` is the survival chain (Groq → Gemini → NIM → OpenAI) — keep free tiers
first. The copilot route **leads with Gemini** (the chat turn is large and a 429 surfaces mid-stream,
after `handleRequest` returns — so Groq's small free daily cap, not init-failover, is the real
failure; Gemini's big daily quota avoids it), plus a stream-init failover for throws before streaming. Models **must** support
tool-calling AND stream `delta.content` (not `reasoning_content`), or the chat goes silently dead. CopilotKit is pinned to **1.5.20** on purpose; `^1.5` pulls the
1.6x AG-UI architecture that breaks tool round-trips — don't loosen it without re-verifying the
full chat+tool path against a free provider.

Theming is a **token seam**: components read `text-ink`/`text-muted`/`bg-surface`/`border-edge`/
`accent` (mapped in `tailwind.config.ts`), and `app/themes.css` defines 9 `[data-theme]` brand
bodies. A new brand = one `[data-theme]` block, zero component edits.

`lib/voice/` is a **portable, dependency-free** Web Speech module — it must not import any
app/CopilotKit code.

**Self-proof / Receipts.** `POST /api/verify-resume` (owner-gated) audits a pasted résumé against
the portfolio corpus + **live public GitHub** (`lib/github-evidence.ts`) and returns per-claim
verdicts; `components/Receipts.tsx` renders them in the `receipts` section. Two rules are load-bearing:
the auditor must stay **skeptical** (honest `unverified`/`contradicted`, never rubber-stamp), and the
**aggregate scorecard is computed in code** (`lib/verification-types.ts` `aggregate()`), never trusted
from the model. The corpus is budget-bounded for free-tier TPM limits. The pure model lives in
`verification-types.ts` (fs-free, client-importable); `verification.ts` is the fs read/write layer.
Verification discipline (claim taxonomy, "proof point" evidence standard, no-fabrication) is reused
from `github.com/wjlgatech/career-os`.

**A2A — the portfolio as an agent other agents call.** Inbound Agent2Agent: an Agent Card at
`/.well-known/agent-card.json` (+ legacy `/.well-known/agent.json`, via `next.config.mjs` rewrites →
`/api/agent-card`) advertises skills; `/api/a2a` is a synchronous JSON-RPC 2.0 endpoint
(`message/send` + legacy `tasks/send`) that answers **grounded + honest** (profile + projects +
Receipts; private → highlight only; unprovable → "unverified"). Reliability is the spec compliance
(both paths, both methods, `streaming:false`) **plus** `chatWithFailover()` (`lib/llm-complete.ts`),
which iterates `resolveLlmChain()` so a throttled provider fails over instead of failing the call.
`public/a2a/SKILL.md` makes it discoverable CLI-Anything-style. Outbound (querying other agents) +
a `printingpress` comms adapter are documented fast-follows.

**Compass — the proactive scout.** `POST /api/scout` (owner token OR `x-scout-secret`) surfaces
next projects to **deepen/widen** + **collaborators** to reach, grounded in the GitHub fleet +
verified strengths; `components/Compass.tsx` renders the `compass` section. Two load-bearing rules:
it's **human-in-the-loop** (drafts a first step / a suggested intro, **never sends or auto-applies**
— career-os ethic), and collaborators are **real discovered handles only** (`lib/github-collab.ts`
finds them; the route filters the model's picks to that set — never let it invent a person). Cadence
is the GitHub Action `.github/workflows/compass-scout.yml` (commits `content/compass.json`). The jobs
lane is a documented fast-follow that hands off to `career-os` (no auto-submit).

**Editable wording, fixed schema.** The agent can reword any text (`editWording` find/replace,
`editText` whole-field) but never change structure: edits are stored as **overrides** (a whitelisted
dot-path→text map in `portfolio.yaml`, `lib/overrides.ts`) applied on top of the fixed
`content/profile.ts`. `cleanOverrides()` drops any non-whitelisted path. Applied at render
(`Portfolio.tsx`) + in the agent grounding (`page.tsx` + a "current wording" readable).

**Dynamic sections.** Beyond the built-in sections, the copilot can create **custom sections**
(`addSection` action, owner-only) — `id: custom-<slug>` with their own `items: [{title, body, tag?, url?}]`,
preserved by `normalize()` and rendered as a cards grid. They must be **grounded**: `addSection` calls
`getRepoDigest` (`/api/repo-digest`, real README + file tree) first and composes items from actual repo
content — no invented tools/links. Built-ins remain reorder/hide/rename-only.

**LinkedIn import has two paths, one pipeline.** LinkedIn's feed is login-walled, so harvest
always runs in the user's own browser: the no-install console script (`public/linkedin-harvest.js`)
or the one-click **`extension/`**. Both feed `Portfolio.tsx`'s `runImport()` (shared with the
`importPosts` action) and the shared `extension/harvest-core.js` dedupe engine. The extension is
**zero-trust** — `storage`+`tabs` perms only, no network, no credentials; the handoff is local
(`chrome.storage.local` → the page's `localStorage`). Don't add a fetch to it, and don't fork the
dedupe logic.

## Doc-sync (workspace policy)

Any change to feature code, the API surface, the data model, or a flag must ship — in the same
change — with a `CHANGELOG.md` entry **and** `README.md` (human) **and** `AGENTS.md` (agent)
updates. A pre-push hook enforces this; conscious bypass is `SKIP_DOC_SYNC=1`.
