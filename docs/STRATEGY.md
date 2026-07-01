# Agentic-Portfolio — Strategy & Roadmap

A deep-dive evaluation and 10x roadmap. Source of truth for *where this is going*; the
CHANGELOG records *what shipped*. (Snapshot: ~4,939 LOC · 8 components · 12 lib modules ·
10 API routes · 2→4 test files.)

## Thesis

**Turn the portfolio from a *page* into a *node in an agent-native labor protocol.*** The A2A
Agent Card is the seed crystal: today other agents can interrogate one portfolio; the 10x is a
network where 100k portfolios discover, verify, and match each other. Network effects (Metcalfe)
make search/trust/matchmaking more valuable with every node — a labor market that routes around
LinkedIn, agent-native and honesty-verified.

## Code quality — B+ (7.5/10)

The moat is the **discipline**, not the LOC: grounded / no-fabrication, verify-don't-vibe,
zero-trust, real LLM-failover, doc-sync enforced by hooks, lean deps, strict TS, token-theming.

| # | Weakness | Evidence | Fix |
|---|---|---|---|
| 1 | God-component | `Portfolio.tsx` 1,137 LOC, 17 actions, 5 readables | Split section renderers + action hooks (in progress) |
| 2 | Thin tests | 2 unit scripts; 0 route/component/E2E | Node unit tests now; add Vitest + Playwright |
| 3 | **Open LLM endpoints = cost/abuse hole** | `/api/copilotkit`, `/api/a2a` unauth + call the LLM | **Rate-limit (done)**; add budget cap / turnstile |
| 4 | Per-browser persistence | serverless = localStorage only | KV/Postgres for durable, multi-device, public edits |
| 5 | No observability / CI | errors only `console.log`; doc-sync hook is local | **CI (done)**; add Sentry + a health route |

## 10x efficiency & effectiveness

- **Biggest lever:** the copilot grounding is **~6.6k tokens per chat message** (measured; caused
  the throttle bug). Cost ∝ tokens × messages. Move to **retrieval** (send only the relevant ~500
  tokens/turn) → ~10x cheaper + faster + no throttle.
- Share one **cached evidence layer** across verify/scout/repo-activity (each re-fetches GitHub).
- **Code-split CopilotKit**, lazy-load the sidebar (it's in the critical bundle).
- Effectiveness: conversation memory · streaming + tool-call UI feedback · auto-refresh data via the
  existing cron.

## 10x network features (length / height / depth / width)

| # | Feature | L/H/D/W |
|---|---|---|
| 1 | **Portfolio Registry** — public, searchable index of A2A agent-cards (the network's DNS) | W |
| 2 | **Cross-portfolio Compass** — scout other agents for cofounders/hires/collabs; they scout you | W·H |
| 3 | **Web-of-trust** — portfolios verify each other's claims (Receipts cite a collaborator's repo) | D |
| 4 | **Federated semantic search** — "5 people who shipped Rust agent-verification", grounded-ranked | W·D |
| 5 | **Recruiter-agent marketplace** — broadcast a JD; candidate agents answer with grounded `role_fit` | H |
| 6 | **Skill/section/theme marketplace** (CLI-Anything-style install) | W |
| 7 | **Collaboration provenance graph** — co-authored PRs across portfolios → verifiable who-built-what | D·L |
| 8 | **Longitudinal self** — Compass cron snapshots you over time → growth trajectory | L |
| 9 | **Knowledge-graph mesh** — wire to `knowledge-graph`/`dreammaketrue`; the network becomes navigable | D·W |
| 10 | **Agent embassies** — your A2A agent embeds in Slack / a hiring tool; represents you 24/7 | H·L |

## Documentation — A- (8.5/10)

Top-1% discipline (AGENTS + CLAUDE + 353-line CHANGELOG with Investigated/Rejected + per-feature
READMEs + enforced doc-sync). Gaps: no central `ARCHITECTURE.md`, no API-surface reference, no
`CONTRIBUTING.md`; README is getting long.

## README viral-quality — B → A

1. **10-sec hero GIF/video** of the agent answering *and editing the page live* — #1 lever.
2. **One-click "Deploy your own"** (Vercel button + the `/agentic-portfolio` skill) — forking *is* distribution.
3. **Thesis one-liner at the very top:** *"Your portfolio should answer recruiters at 3 a.m. This one does."*
4. Shareable backlink **badge** · live **network counter** · **comparison table** · a Show-HN / PH / X-thread launch kit.

## Monetization — the $0-cost is the *wedge*, not the business

1. **Hosted SaaS** — bring-your-GitHub, we host + custom domain + supply LLM keys. Pro $9–19/mo.
2. **Recruiter/B2B (the real money)** — the A2A network as a two-sided market: agent-screening at
   scale, grounded + honesty-verified. LinkedIn-Recruiter, agent-native.
3. **Federated-search API** (per-query/seat) · **marketplace take-rate** · **verification-as-a-service** (trust badge).
4. **White-label cohorts** — bootcamps/accelerators; every grad gets a verified agent portfolio (B2B2C).
5. **Lead-gen** — the agent captures recruiter-agent queries → warm inbound.

> Caveat: #2–#3 need 100k-node scale (chicken-and-egg). The free, viral, *individual* product is the
> wedge; the *network* it creates is the business.

## Sequenced plan

1. **Foundation (this PR + next):** split `Portfolio.tsx`, add tests + CI, **rate-limit the open LLM
   routes**, add Sentry + a health route, move persistence to KV.
2. **The 10x bet:** ship the **Portfolio Registry + federated-search MVP** (features #1, #4) — the
   smallest slice that turns one site into a network.
3. **Distribution:** hero GIF + one-click deploy + the thesis one-liner.
