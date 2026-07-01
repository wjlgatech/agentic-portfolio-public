# AGENTS.md — agent guide for `agentic-portfolio`

Agent-facing guide for this repo. (Human guide: `README.md`.)

## What this is

A personal portfolio that is itself an agentic webapp. A Next.js App Router site with a
CopilotKit agent grounded in the repo's own content, backed by a free-LLM survival chain.

## Naming (unified — use these, not synonyms)

Three layers, three names, no overlap. Don't reintroduce "agentic-anything"/"agentize-anything".

| Layer | Name | Usage |
|---|---|---|
| The **engine** | `anyagent` | the CLI that builds/grades/ships (separate repo) |
| The **action / brand** | **Agentize** (*"Agentize Anything"*) | the verb + the umbrella: `anyagent agentize <x>`, the meta-template (`docs/AGENTIZE.md`, `@agentize/core`) |
| What you **get** | *an agent* / *an agentic app* | "agentic" is a plain adjective here — never a brand |

So: `Agentize` is the meta-template ("one core, any business"); `agentic` only ever describes
(an *agentic* portfolio, an *agentic* webapp). The `@core/*` tsconfig alias is unchanged.

## Map

| Path | Role |
|---|---|
| `app/page.tsx` | Server component (`force-dynamic`). **Branches on `getActiveInstance()`**: a non-portfolio instance early-returns `<CopilotProvider …><InstanceSite/></CopilotProvider>` (its own grounding/labels/starters); the portfolio path is unchanged — reads `portfolio.yaml` via `readPortfolioAsync()`, builds the grounding `context` (incl. **`practices12X`**: the TRUE rubric + every practice's T/R/U/E + human/agent angle, so the agent can "explain practice N through TRUE"), renders `<CopilotProvider><Portfolio/></CopilotProvider>`. `generateMetadata()` sets a per-instance `<title>`/OG (`{}` for portfolio = unchanged). |
| `components/InstanceSite.tsx` | **The generic visual site for any non-portfolio instance** (server component). Paints hero (entity + mission), principles (story), offerings, writing, outcomes (verdict chips) + **schema.org JSON-LD** (GEO) straight from the `InstanceConfig`. **Theme is set on `<html>` by the layout (instance default) + the StyleSwitcher — this wrapper carries NO `data-theme`, so switching styles works** (fixing the old override). So `INSTANCE=learning-center` is a real site, not just a curl-able A2A endpoint. |
| `components/InstanceAgentActions.tsx` | Makes a non-portfolio agent DO work, not just chat (rendered inside `<CopilotKit>` via `CopilotProvider`'s `agentActions` slot): `captureLead`/`bookDemo` (VISITOR → durable lead) + `viewLeads` (OWNER → the captured pipeline). The owner↔visitor payoff, concrete. |
| `app/api/lead/route.ts` | The agent's real work + the **per-portfolio** owner gate. `POST` (public, rate-limited) captures a lead keyed `leads:<slug>` (the `?instance`/body `instance` the visitor is on; defaults to the active instance's `kvPrefix`); `GET` is owner-gated via `ownsInstance(req, slug)` (global admin OR the per-portfolio `owner:<slug>` hash) → 403 otherwise. |
| `app/llms.txt/route.ts` | **GEO surface.** Serves `/llms.txt` (the LLM sitemap) built from the active `InstanceConfig` — grounded, text/plain. With JSON-LD + the instance-aware agent card, this is why `anyagent seo` scores an Agentize deploy high (UnmaskLeads instance 66→87 after). |
| `components/Portfolio.tsx` | `"use client"` site body. Holds the layout config in state (seeded from YAML, overlaid by `localStorage`), registers the CopilotKit **actions** (add/remove article, reorder/show-hide/rename sections, set theme, reset), renders sections in the config's order, and gates every edit on owner vs visitor. Two grounding readables keep replies **actionable**: a role readable (`howToBecomeOwner` → unlock steps the agent must give when it declines an edit) and a "HOW TO IMPORT LinkedIn posts" readable (steps + the `/linkedin-harvest.js` link). `harvestTip()` returns the same with an absolute clickable URL. |
| `content/portfolio.yaml` | **Control surface.** Section order/visibility/labels, theme, and the articles list. Edited by the agent (owner) or by hand. |
| `lib/portfolio.ts` | Server read/normalize/write for `portfolio.yaml` (`yaml` pkg). `normalize()` is the validation gate (known section ids only, all present, clean articles). |
| `app/api/portfolio/route.ts` | `GET` config · `POST` write (owner-gated → **403** otherwise). Node runtime, `force-dynamic`. |
| `lib/owner.ts` | `isOwnerRequest()` / `ownerTokenConfigured()` — the auth check (shared; not in a route file). Secret: `PORTFOLIO_OWNER_TOKEN`. |
| `app/api/owner/route.ts` | `GET ownerRequired` · `POST {token}→{owner}`. Verifies against the env secret (constant-ish compare). |
| `app/api/fetch-article/route.ts` | `POST {url}→{title,summary,url}`. Server-side metadata fetch (no browser CORS) for the `addArticleFromUrl` action. Owner-gated + SSRF guard. |
| `public/linkedin-harvest.js` | Console/bookmarklet script: harvests `{url,title,summary}` from the user's logged-in LinkedIn activity page (the feed is login-walled, so this runs client-side). The **no-install** path. Output feeds the `importPosts` action, which dedupes + adds. |
| `extension/` | **One-click** LinkedIn import (the agent-native path, 12X #3). A browser extension whose button on LinkedIn harvests in the user's own session and hands posts to the portfolio. `harvest-core.js` = the shared, unit-tested dedupe engine (UMD; also used by `scripts/test-harvest.mjs`); `content-linkedin.js` = two buttons (**⚡ Latest** = few screens, **⬆ All history** = full scroll) + DOM strategies; `background.js` = opens the portfolio tab; `content-portfolio.js` = drops the posts in the page's `localStorage["portfolio-pending-import"]`. **Zero-trust (12X #5): `storage`+`tabs` perms only, no network, no credentials.** |
| `Portfolio.tsx` `runImport()` + pending-import consumer | One import pipeline shared by the `importPosts` action and the extension handoff. On mount / extension ping / owner-unlock, owners auto-import (toast); visitors are nudged to unlock and pending posts are kept. |
| `lib/voice/` | Reusable, dependency-free voice input: `useSpeechToText` (Web Speech hook) + `<VoiceInput>` (drop-in mic for any field). Imports nothing app-specific — transportable. See `lib/voice/README.md`. |
| `app/themes.css` | The webapp-style theme seam: CSS-variable tokens + 9 `[data-theme]` brand bodies. Tailwind colors (`tailwind.config.ts`) map to the `--c-*` triplets. |
| `components/StyleSwitcher.tsx` | `"use client"` top-right switcher; sets `html[data-theme]` + persists to `localStorage` (key `webapp-style`, shared with `Portfolio`'s `setTheme`). No-flash restore script is inline in `app/layout.tsx`. |
| `app/api/copilotkit/route.ts` | CopilotKit runtime endpoint. **Leads with Gemini for the chat** (the chat turn is large ~6.6k tokens and a 429 surfaces MID-stream, after `handleRequest` returns, so init-failover can't catch it — Gemini's big free DAILY quota avoids the cap that breaks Groq). Then a stream-init failover loop across `resolveLlmChain()` for any provider that throws/5xx before streaming. **The LLM key lives here only — never client-side.** |
| `app/api/agent-card/route.ts` | **A2A inbound — INSTANCE-AWARE.** The Agent Card, served (via `next.config.mjs` rewrites) at `/.well-known/agent-card.json` + legacy `/.well-known/agent.json`. Built from the **active instance** via `instanceToAgentCard(getActiveInstance(), origin)` (+ the `x-llm-ready` hint), so a `INSTANCE=learning-center` deploy advertises learning-center skills and the default portfolio deploy advertises `ask_candidate`/`verify_claim`/`role_fit`. `streaming:false`, no auth (public discovery). |
| `app/api/a2a/route.ts` | **A2A inbound endpoint — INSTANCE-AWARE.** JSON-RPC 2.0, `message/send` + legacy `tasks/send`, synchronous. Answers AS the active instance: a non-portfolio instance with a `content` pack answers from `instanceEvidence(pack)` (its offerings/outcomes/writings); the portfolio keeps the original `buildEvidence()` path (profile + projects + Receipts) byte-identical. Grounded + honest (private → highlight only; unprovable → "unverified"). Uses `chatWithFailover`. CORS-open. `public/a2a/SKILL.md` documents it. |
| `lib/rate-limit.ts` | Per-IP in-memory limiter for the OPEN routes (`copilotkit`/`a2a`/`repo-digest`/`repo-activity`/`registry`) so they can't be used to drain the LLM quota. |
| `lib/storage.ts` | Durable KV over **Postgres** (Vercel Postgres / Neon, `@neondatabase/serverless` HTTP driver). Set `POSTGRES_URL` (or `DATABASE_URL`) → a lazily-created `kv_store(key, value jsonb)` table makes registry joins + portfolio edits persist & be shared (`readPortfolioAsync`/`writePortfolioDurable`, `readRegistryAsync`/`upsertEntry`). Same `kvConfigured`/`kvGetJSON`/`kvSetJSON` surface; degrades to the fs seed when unset. `GET /api/health` → `durableStorage` reflects it. |
| `components/sections.tsx` · `OwnerBadge.tsx` · `useLayoutActions.ts` · `useContentActions.ts` · `useEngagementActions.ts` | Pure renderers + owner badge + the 3 copilot-action hooks — extracted from `Portfolio.tsx` (god-component split). `useEngagementActions` holds the tools that drive the minimalist sections from chat: `verifyResume` (public), `draftVerifiedResume` (close-the-loop), `scoreJobFit` (public Role Fit scorer), `scoutNext`, plus article import/remove. |
| `app/api/health/route.ts` | `GET` liveness + config probe (providers configured, owner-gated, scout/github flags — no secrets). |
| `app/network/page.tsx` · `components/Network.tsx` | **The Portfolio Network** — a searchable directory of A2A agent-portfolios (the registry MVP). Search + grid + join-by-URL. |
| `app/api/registry/route.ts` · `lib/registry.ts` (+ `packages/core/src/registry-types.ts`) | The registry: `GET ?q=` ranked search; `POST {url}` joins by fetching+validating that portfolio's A2A agent card (no fabrication). Seed `content/registry.json`. Rate-limited. |
| `app/api/registry/ask/route.ts` | **Federated search (A2A fan-out):** `POST {q}` → top nodes' live A2A agents queried in parallel (per-node timeout) → grounded answers. Rate-limited (N downstream LLM calls). |
| `app/make/page.tsx` · `app/api/make/route.ts` · `app/p/[slug]/page.tsx` | **The Portfolio Maker (non-tech, true 1-click).** `/make` is a form (name/email + **résumé OR LinkedIn** + optional socials); `POST /api/make` turns the grounding source into an `InstanceConfig` via the LLM (`buildInstance`+`validateInstance`), stores `portfolio:<slug>` in KV, and `upsertEntry`-auto-joins the network. **Source resolution:** résumé text ≥40 chars → use it; else a LinkedIn `/in/` URL → `fetchLinkedInPublic()` grounds on public metadata (`source:"linkedin"`); else if that's blocked → `source:"thin"` + an honest note to paste a few lines; neither → **400**. The form also shows a **"make one like this example"** style reference (prefilled with the flagship portfolio, editable, reads `?example=<url>`) — framing only (open it to see the style); content still comes from the résumé/LinkedIn, structure is shared, no per-template cloning. Reads an optional `ref` and `recordReferral(ref, slug, live)` on a hosted make. `/p/[slug]` renders the hosted portfolio. Graceful: no-LLM → deterministic pack; no-KV → downloadable pack. Public + rate-limited. |
| `lib/portfolio-owner.ts` · `components/HostedOwnerBadge.tsx` | **Per-portfolio ownership (multi-tenant).** The single global `PORTFOLIO_OWNER_TOKEN` (`lib/owner.ts`) only makes the DEPLOY admin an owner. For hosted `/p/<slug>` portfolios, `/make` mints a per-portfolio token (`mintOwnerToken`), stores only its SHA-256 hash at `owner:<slug>`, and returns the raw token **once** as `/p/<slug>?owner=<token>`. `ownerHashMatches` verifies in constant time. `/api/lead` gates the owner GET via `ownsInstance(req, slug)` = global-admin OR per-portfolio hash match; leads are keyed `leads:<slug>`. `HostedOwnerBadge` shows 🔓 Owner / 🔒 View only, **verified server-side** (a 200 from the gated read), not by local presence. Server-only (node:crypto); tested (`scripts/test-portfolio-owner.mjs`). |
| `lib/linkedin-public.ts` (+ `packages/core/src/linkedin-parse.ts`) | **Best-effort public LinkedIn grounding for the 1-click maker.** `fetchLinkedInPublic(url)` fetches the logged-out profile page (browser UA, 9s timeout) and the pure `parseLinkedInProfile(html)` reads only `og:title`/`og:description` (name/headline/experience — **public SEO metadata, no login, no credentials, no auth-wall bypass**, keyed off stable `<meta>` tags not CSS). Returns null on block/thin (999/403 from datacenter IPs is common) → caller falls back honestly, never fabricates. Single low-volume request per make. Tested (`scripts/test-linkedin-parse.mjs`). |
| `components/MadeWith.tsx` · `components/SharePanel.tsx` (+ `packages/core/src/share-copy.ts`) | **The viral surface + Share Studio (privacy-first).** `MadeWith` (global footer) is `"use client"` + `usePathname`: on a `/p/<slug>` page its "Make your own" link auto-carries `?ref=<slug>` (attribution, no prop threading). `SharePanel` (props `{url, name, tagline}`) is the **Share Studio**: the auto-thumbnail preview + download, **per-platform copy** from `shareCopy()` (pure — X ≤280 with URL billed at 23, LinkedIn/YouTube/Instagram) each with a copy button, and **1-click post intents** for X/LinkedIn/Facebook/Bluesky/email. **User-initiated only — no OAuth, no contact-list read, no address-book upload, ever.** Honest where a platform takes no link post (YouTube/IG → download + paste). Shown on `/make` success. |
| `lib/og.tsx` | **One shared share-card renderer (`next/og`).** `ogCard({eyebrow,title,subtitle,cta,accent})` → an `ImageResponse` (1200×630, dark gradient, per-page accent). Every `opengraph-image.tsx` is a thin wrapper over it, so all cards share one visual language. Import ONLY from `opengraph-image` route files. |
| `app/opengraph-image.tsx` · `app/network/opengraph-image.tsx` · `app/society/opengraph-image.tsx` | **Site-wide share thumbnails (static).** The home / network / society cards, prerendered at build (no per-request data). So a link to ANY key surface unfurls a branded card, not just a hosted portfolio. |
| `app/p/[slug]/opengraph-image.tsx` | **The per-portfolio share thumbnail (dynamic).** `ogCard(...)` with the portfolio's `entity.name` + `tagline` (read from KV). Next auto-wires it as `og:image`/`twitter:image` for `/p/<slug>` (the page's `generateMetadata` sets per-person title/description; root `layout.tsx` sets `twitter.card:"summary_large_image"` globally). Unknown slug → a generic card (graceful). Downloadable at `/p/<slug>/opengraph-image`. **Needs `metadataBase` = the deploy origin** (`app/layout.tsx` derives it from `NEXT_PUBLIC_SITE_URL`/`VERCEL_*`) so external unfurlers fetch an absolute URL. |
| `app/api/growth/route.ts` · `lib/referrals.ts` (+ `packages/core/src/referrals-types.ts`) | **The viral attribution tree, MEASURED.** `GET /api/growth` → `growthStats(edges)`: the viral coefficient **K** (live invites per active referrer; `selfPropelling` at K≥1), tree depth (the 1→2→4→8 generations), top referrers; `?handle=<slug>` → that referrer's own scoreboard. `lib/referrals.ts` is the KV layer: edges in one key (`referrals:edges`), and a **live** invite bumps `society:contrib:<referrer>` **once** (a real, earned contribution → their standing rises). Honest: credit only on a *shipped* portfolio, never for sending. No PII — an edge is two public handles. Pure math + tested (`scripts/test-referrals.mjs`). |
| `app/society/page.tsx` · `content/society.ts` | **The TRUE Society charter.** The covenant (`TRUE_TENETS` — each tenet has human + agent + proof), the creed (`CREED`), a "check your standing" widget (→ `/api/standing`), and the apply form (→ `/api/join`). Covenant/creed are **data** in `content/society.ts`; the page never hardcodes copy. |
| `app/api/join/route.ts` | **Society intake + the mailing list.** `POST` public + rate-limited (3/min): requires name + valid email + `agree===true` + a ≥12-char first-10X `contribution`; dedupes by email into `society:applications` (KV). `GET` is **owner-gated** (`isOwnerRequest` → 403) — the dispatch list is the society's CRM. Honest: applying ≠ admission (standing is earned). Graceful: no-KV → accepted, `durable:false`. |
| `app/api/standing/route.ts` (+ `packages/core/src/society-types.ts`) | **The TRUE standing engine.** `POST {url}` measures a member's standing from **observed** signals — is the portfolio live? does it expose an A2A agent card with skills + a description? — plus stored `society:vouches:<handle>`/`society:contrib:<handle>` (KV). `scoreStanding()` (pure, in `society-types.ts`) computes per-tenet T/R/U/E, a reputation-weighted vouch boost (capped +20, Sybil-resistant), a passivity **decay**, an `overall`, a `tier` (applicant→member→steward→fellow), honest `gaps`, and **`leverage` (1×–10×)** — the "make any dream true in 1/10 the time" coefficient. **Measured, not claimed;** the aggregate is computed in code, never trusted from a model. Public + rate-limited. Tested by `scripts/test-society.mjs`. |
| `docs/STRATEGY.md` | The roadmap: code-quality eval + 10x efficiency/features/monetization + sequenced plan. |
| `lib/llm.ts` + `lib/llm-complete.ts` | Free-LLM survival chain. `resolveLlmChain()` = all configured providers in order (Groq → Gemini → NIM → OpenAI); `resolveLlm()` = the first (for the streaming copilot adapter). `chatWithFailover()` (non-streaming) tries each provider until one succeeds, so a 429/413 fails OVER instead of failing. |
| `components/Copilot.tsx` | `"use client"` provider: `<CopilotKit>` + `useCopilotReadable` (grounding) + `<CopilotSidebar>` + `<VoiceInput>` (mic) + `<PromptStarters>` (1-click example prompts). |
| `components/PromptStarters.tsx` | Curated, dismissible starter-prompt chips above the chat input; clicking fills the input (no auto-send) so the user customizes + sends. Themed via CSS tokens. |
| `components/Projects.tsx` | Project grid: category + featured/all filters, **sorted by last-updated** with a **🔥 Active 30d** toggle (PRs/repo in 30 days) + per-card badge, fed by `/api/repo-activity`. |
| `app/api/repo-activity/route.ts` | `GET` → PRs-per-repo in the last 30 days via ONE GitHub search of the owner's PRs (aggregated by repo). Ranks Projects; degrades to empty on throttle. |
| `components/Articles.tsx` | Writing section: a **horizontal newest-first slider** (scroll/snap row, ‹ › arrows) + category filter. Sorted by `linkedinActivityTimeMs()` (decodes publish time from the activity-id Snowflake), then `date`, then feed order. |
| `app/api/verify-resume/route.ts` | **Self-proof (PUBLIC demo).** `POST {resume}` — **public + per-IP rate-limited** (4/min); audits each résumé claim against the portfolio corpus + live public GitHub, returns a per-claim verdict report. **Only the owner's run persists/publishes** (`writeVerification` gated on `isOwnerRequest`); a visitor's run is returned but never overwrites the proof. LLM judges claims; the **aggregate is recomputed in code** (`packages/core/src/verification-types.ts`), never trusted from the model. Corpus is **budget-bounded** (free-tier TPM). |
| `lib/verification.ts` + `packages/core/src/verification-types.ts` | The report model. `-types` is the fs-free pure core (verdict taxonomy, `normalizeReport`, deterministic `aggregate`) so client `Receipts.tsx` can import it; `verification.ts` adds fs read/write of `content/verification.json` and re-exports the core. |
| `lib/github-evidence.ts` | Live public-GitHub evidence: one repo-list call + capped README reads (rate-limit + token-budget aware; `GITHUB_TOKEN` optional). |
| `components/Receipts.tsx` | The **Resume Verification** section (id stays `receipts`). **Presentational + minimalist** (`{report, isOwner}` only): shows the ESSENCE (corroboration score + verdict counts + the single top gap) and tucks by-category / the gap punch-list / per-claim breakdown behind ONE `▸ Show the N-claim audit` disclosure. The owner **tools** (verify / generate verified résumé) are NOT on the page — they're copilot actions (`verifyResume`/`draftVerifiedResume`); a one-line owner hint points to the chat. Verdict hues are semantic (green/amber/red), not theme tokens. |
| `app/api/verified-resume/route.ts` | **Close-the-loop drafter.** `POST {claims}` (owner-gated → **403**). Keeps only corroborated/partial claims (re-normalized), drafts an honest, cited résumé via `chatWithFailover`, drops the unprovable. career-os ethic: drafts, never sends. |
| `content/verification.json` | Seed/last self-proof report (clearly-labelled sample until the owner runs a real one). Overlaid by `localStorage` like `portfolio.yaml`. |
| `app/api/job-fit/route.ts` | **Role Fit scorer (PUBLIC demo).** `POST {url}` or `{text}` — **public + per-IP rate-limited** (5/min). Scores a job against the owner across THREE axes (experience / skills / mission-vision trajectory) grounded in the corpus + live GitHub. SKEPTICAL: misaligned roles score low, honest gaps surfaced. LLM judges each axis; **overall + level recomputed in code** (`aggregateFit`), never trusted from the model. A URL is fetched server-side via the public ATS APIs (`lib/jobfit.ts`); no persistence (stateless, like a visitor verify run). |
| `lib/jobfit.ts` + `packages/core/src/jobfit-types.ts` | The fit model + JD fetcher. `-types` is the fs-free pure core (axes/weights, `FIT_LEVELS`, `aggregateFit`/`normalizeFit`, + the golden-eval `scoreEval`/`normalizeEval`) so client `JobFit.tsx` imports it. `jobfit.ts` is the `@/`-free **public-ATS fetcher**: `parseJobUrl` + `fetchJD` speak Ashby/Greenhouse/Lever posting APIs (no auth, no scraping), generic HTML fallback. **LinkedIn is never server-crawled** — login-walled stays in-browser. |
| `lib/jobfit-eval.ts` + `content/jobfit-golden.json` + `content/jobfit-eval.json` | The credibility layer. `jobfit-golden.json` = human-labeled `(JD → expected fit)` set across all 4 bands; `scripts/eval-jobfit.mjs` runs the REAL scorer over it (vs a running route) and writes `jobfit-eval.json` (accuracy scorecard, read by `jobfit-eval.ts` → the page's trust badge). First run: 8/8 within-band, 6/8 exact. Pure logic in `scripts/test-jobfit.mjs` (`npm test`). |
| `components/JobFit.tsx` | The **Role Fit** section (id `job-fit`). **Presentational + minimalist** (`{fit, evalReport, onScore}`): a public "Score a role" input (URL or JD text), the ESSENCE (overall + level + the honest call + top gap), the 3-axis breakdown behind ONE `▸` disclosure, and a **trust badge** showing golden-set accuracy. Level hues are semantic (emerald/amber/orange/muted), not theme tokens. |
| `app/api/ingest-knowledge/route.ts` | **Deepen INBOUND (the node's one write surface).** `GET` public (read the feed); `POST` **gated** (owner OR `x-ingest-secret == INGEST_SECRET`) + rate-limited — super-u's flywheel posts a distilled artifact `{source, digest, graph, skills}`. `normalizeArtifact` **grounds it**: rejects no-http-source (422), drops dangling edges, drops skills with no `not_good_at`, defaults `verified:false`. Persists durably (`ingestArtifact`). The node RECEIVES — it does NOT build graphs / forge skills / orchestrate (see `docs/DEEPEN-PIPELINE.md`). |
| `lib/deepen.ts` + `packages/core/src/deepen-types.ts` | The deepen feed model. `-types` is the fs-free pure core (`DeepenArtifact`/`KnowledgeGraph`/`DeepSkill`, `normalizeArtifact`/`normalizeDeepen`/`upsertArtifact` — shapes mirror super-u's real `GraphNode`/`GraphEdge` + skillfy `Skill`) so client `Deepen.tsx` imports it. `deepen.ts` adds durable-KV+fs read/write of `content/deepen.json` (seed→durable merge, like `registry.ts`). Covered by `scripts/test-deepen.mjs`. |
| `components/Deepen.tsx` + `content/deepen.json` | The **Deep Dives** section (id `deep-dives`), **purely presentational** (`{feed}`, NO on-page tools — orchestration is super-u's, not the node's): per source, the digest (educate) + a knowledge-map preview + extracted skills, each with honest `not_good_at` + a proven/**unproven** badge, behind ONE `▸` disclosure. `deepen.json` seeds the real DeepSeek **Engram** dive (`producedBy: seed-example`). |
| `app/api/scout/route.ts` | **Next Projects scout.** `POST` (owner token OR `x-scout-secret`==`SCOUT_SECRET`) → moves along **four growth vectors** (deepen/widen/lengthen/heighten) + collaborators to reach, grounded in the fleet + verified strengths. Collaborators are filtered to **real discovered handles** (`lib/github-collab.ts`); the model can rank/explain, never invent. Human-in-the-loop: drafts, never sends. |
| `lib/compass.ts` + `packages/core/src/compass-types.ts` | Next-Projects model. `-types` is the fs-free core: the **four `ProjectKind` vectors** + `GROWTH_VECTORS` (glyph/label/gist/**framework** per vector) + `PROJECT_KINDS`/`ideaCount`; caps every lane, validates GitHub handles/urls. `compass.ts` adds fs read/write of `content/compass.json` + `content/compass.yaml`. Covered by `scripts/test-compass.mjs`. |
| `lib/github-collab.ts` | Bounded GitHub repo-search → real collaborator candidates (rate-limit aware, `GITHUB_TOKEN` optional, degrades to `[]`). |
| `components/Compass.tsx` | The "What's Next" section, **presentational + minimalist** (`{report, isOwner}` only): the four-vector legend (each grounded in a named framework — Three Horizons, Ansoff, Wardley, MDL) + ONE featured move, with `▸ Show all N moves + M collaborators` revealing the rest + the **Reach** lane (collaborator cards with copyable intros). The scout TOOL is the `scoutNext` copilot action (no on-page button); a one-line owner hint points to the chat. |
| `content/compass.json` · `content/compass.yaml` | Latest scout report · cadence + interests config. JSON overlaid by `localStorage`; the scheduled Action commits the JSON. |
| `.github/workflows/compass-scout.yml` | The cadence: cron → `POST /api/scout` → writes & commits `content/compass.json` (push redeploys the feed). Needs repo secret `SCOUT_SECRET` + var `PORTFOLIO_URL`. |
| `app/error.tsx` · `app/global-error.tsx` | Error boundaries — any unhandled client render error shows a recovery UI, never a blank white page. |
| `lib/linkedin.ts` | `isLinkedInFeedUrl()` (feed vs fetchable post) + `linkedinActivityTimeMs()` (decode publish time from the activity-id Snowflake) + `orderByRecency()` (newest-first, slots undatable posts into feed order so a new post isn't buried). Shared by `Portfolio.tsx` + `Articles.tsx`; covered by `scripts/test-linkedin-url.mjs` (`npm test`). |
| `app/api/repo-digest/route.ts` | `POST {repo}` → a public repo's README + file/dir tree + metadata (GitHub API). Grounds `addSection` so custom sections reflect REAL repo content, not invented. |
| `content/profile.ts` | Mission, values, love, 12X Future Practices, identity. **Structure is fixed**; the agent edits only the *wording* via overrides. |
| `components/Mindmap.tsx` | **Reusable** 1→clusters→leaves tree with click-to-expand detail. Single responsibility (layout + open state); data + the detail panel are injected (`clusters`, `renderDetail` render-prop, optional `legend`). Both mindmaps below are thin adapters over it — DRY/open-closed; a new mindmap = a new adapter, no change here. |
| `components/PracticesMindmap.tsx` + `content/practices-map.ts` | Adapter: the 12X Future Practices as a **1→3→12 mindmap** (Aim/Loop/Compound → 12 leaves); leaf detail = the **TRUE** panel (T·R·U·E + human/agent). `practices-map.ts` is the PURE data. Replaces the flat `PracticesGrid` in `renderBody`. Test: `scripts/test-practices.mjs`. |
| `components/ValuesMindmap.tsx` + `content/values-map.ts` | Adapter: **Values & Love** as a **1→2→6 mindmap** (How I work · Who it's for → 5 values + Love); leaf detail = **Lived / In the work / For an agent**. Bodies come from `profile.ts` (override-editable), the cluster+detail from `values-map.ts`. Replaces `ValuesAndLove` in `renderBody`. Test: `scripts/test-values.mjs` (also guards leaf titles == `profile.ts` value titles). |
| `lib/overrides.ts` | Agent-editable WORDING on top of the fixed schema: `cleanOverrides`/`applyOverrides`/`editableFields` + the whitelisted path regex. Backs `editWording`/`editText`. Overrides live in `portfolio.yaml` (`overrides:` map). |
| `content/projects.json` | Active repos (last 12 mo), categorized. Private repos: highlight only, `url: null`. |
| `packages/core/` | **The platform contract layer** (`@agentize/core`) — the framework-agnostic, fs-free contract every vertical is built on (the portfolio is a *node*, not the owner). Imported via the **`@core/*`** tsconfig alias. Holds the 4 pure `-types` below; storage/llm/registry-logic/A2A move here in later increments. See `packages/core/README.md` + `docs/NETWORK-AND-SPLIT-STRATEGY.md`. |
| `packages/core/src/instance-types.ts` | **The Agentize Lego contract** (fs-free). `InstanceConfig` = the studs that snap a *vertical pack* onto the core bricks (entity/story/theme/agent.skills/sections/proof/scout/network/owner/storage). `validateInstance()` = the fit-check (rejects unknown theme/vertical, missing skill/section); `instanceToAgentCard()` = any instance → a spec A2A card with zero vertical code. PURE so client + plain-Node test both import it. |
| `content/instances/*.ts` | Vertical packs (data, `import type` only). `portfolio.ts` = instance #0 (the live site as a config); `learning-center.ts` = the first new vertical (12X Agentic Academy); `unmaskleads.ts` = a real prospect demo (an Agentize instance for UnmaskLeads, a visitor-de-anonymization SaaS — deployed at `INSTANCE=unmaskleads`). Each has a `content` pack (offerings/outcomes/writings) so its A2A agent answers from its own corpus. A new business = a new pack, never a code fork — and a JSON pack emitted by `anyagent agentize --emit-instance`, dropped as `content/instances/<slug>.json`, is loaded + validated at runtime with NO code (the loop closer). **Honesty: unproven outcomes stay `verdict: "unverified"` — e.g. UnmaskLeads' "98% match" is its OWN claim, shown as claimed, never fabricated as audited.** |
| `content/instances/index.ts` | The pack registry (`INSTANCES` map) + `getActiveInstance()` — reads the `INSTANCE` env var (default `portfolio`), validates the pack, falls back to portfolio on an unknown/invalid pack (warns, never 500s). This is the seam that makes one deploy serve whichever business `INSTANCE` names. Uses `@/` value imports → app-only (not plain-Node loadable; verify it live). |
| `scripts/test-instance.mjs` | Validates both packs snap on, the card stud emits a spec card per active instance, bad packs are rejected, a 3rd vertical (food truck) also fits. In `npm test`. (The `getActiveInstance` env-selector is verified live against the running route.) |
| `scripts/test-storage-kv.mjs` | End-to-end test of the durable storage path (`lib/storage.ts`) against a **real Postgres** store (self-loads `POSTGRES_URL`/`DATABASE_URL` from `.env.local`): round-trip, join-survives-fresh-read, key isolation, upsert-overwrites. **Skips cleanly** (exit 0) when no store is configured, so `npm test` stays green in CI; writes only `selftest:*` keys, never real data. In `npm test`. |
| `scripts/set-live-links.mjs` (+ `scripts/test-set-live-links.mjs`) | Post-deploy helper: `node scripts/set-live-links.mjs <deploy-url>` rewrites the README "See it live" gallery's `/make`+`/network` cells (between `<!-- LIVE-LINKS -->` markers) to point at the live deploy; the flagship example stays constant. Deterministic, idempotent, refuses to run without the markers. Tested; in `npm test`. |
| `docs/AGENTIZE.md` | The meta-template design: the Lego contract, the 5 seed verticals, where each self-* / network / safety property lives, and the sequence (the instance-aware refactor is the documented next step). |

## Rules

- **No IP leakage.** Private projects (`"private": true`) must keep `url: null` and a
  high-level highlight only — never add internal architecture, file paths, or links.
- **Viral growth is user-initiated + privacy-first — never harvest contacts.** Growth is the
  *artifact as invite* (a `?ref=<slug>` link on the user's own portfolio + `SharePanel` share
  intents the **user** clicks). Do **not** add LinkedIn-connection / Gmail-contact / Facebook-friend
  import, OAuth-into-contacts, or bulk-invite of an address book — it's legally exposed
  (CAN-SPAM/GDPR/CASL; the LinkedIn $13M *Perkins* precedent) and contradicts the brand. A referral
  edge is two public handles; **credit (`society:contrib:*` bump) flows only when the invitee ships a
  LIVE portfolio**, never for sending. K is **computed in code** (`growthStats`), never claimed.
- **Key stays server-side.** Only `app/api/copilotkit/route.ts` (and `lib/llm.ts`) read
  the LLM key. Never expose it to a client component or `NEXT_PUBLIC_*`.
- **Content is data.** To change what's shown, edit `content/*` — don't hardcode copy in
  components. The agent can edit **wording** (not structure) via `lib/overrides.ts` — a
  whitelisted dot-path → text map in `portfolio.yaml`. Only the listed paths are editable;
  `cleanOverrides()` drops anything else, so the agent can never rewrite the schema.
- **Theme via tokens, never literals.** Components must read `text-ink` / `text-muted` /
  `bg-surface` / `border-edge` / `accent` — never `text-white`, `text-gray-*`, or hex. A theme
  that inverts (vercel) must not break a light theme (swiss). New brand = one `[data-theme]`
  block in `app/themes.css`, no component edits.
- **Provider order is policy.** The `lib/llm.ts` chain order (Groq → Gemini → NIM → OpenAI)
  follows the `/free-llm` survival-chain rule. Keep free tiers ahead of paid. Non-streaming
  server routes should call `chatWithFailover()` so a throttled provider fails OVER, not the
  request; only the streaming copilot route pins a single provider (`resolveLlm`).
- **A2A stays grounded, honest, and reliable.** `/api/a2a` must answer only from the evidence
  (profile + projects + Receipts), highlight-only for private repos, "unverified" for
  unprovable claims — same honesty bar as the copilot/Receipts. Keep it sync (advertise
  `streaming:false`) and accept both method names + both well-known paths; that compatibility
  IS the reliability. Keep the evidence corpus lean (recruiter agents call repeatedly; free TPM).
- **CopilotKit is pinned to 1.5.20 — keep it pinned.** `^1.5.0` resolves to the 1.6x
  AG-UI architecture, which renders reasoning models as silent and 400s tool round-trips
  with "unsupported content types". The code targets the classic `CopilotRuntime`/
  `OpenAIAdapter` runtime. Don't loosen the pin without re-verifying the full chat + tool
  round-trip against a free provider.
- **Models must support tool-calling AND stream plain content.** The agent drives the page
  via CopilotKit actions (OpenAI tools), so a model that can't emit `tool_calls` makes the
  chat silent. AND it must stream `delta.content`, not `reasoning_content` — reasoning
  models (`openai/gpt-oss-120b`) return 200 but render nothing. Default: Groq
  `llama-3.3-70b-versatile` (both). See the constraints note in `lib/llm.ts`.
- **Owner gate is the real boundary.** Layout writes must stay owner-only. `POST
  /api/portfolio` must call `isOwnerRequest()`; never trust the client alone. Edit actions
  in `Portfolio.tsx` must route through `gate()` so a visitor only ever gets a *proposal*.
  The owner secret (`PORTFOLIO_OWNER_TOKEN`) stays server-side — never `NEXT_PUBLIC_*`.
- **Hosted portfolios are multi-tenant — gate PER portfolio, not by the global token.** `/p/<slug>`
  pages (made via `/make`) each have their **own** owner token (hash at `owner:<slug>`, `lib/portfolio-owner.ts`).
  Any owner-gated read/write for a hosted portfolio must verify the presented token against *that slug's*
  hash (`ownsInstance(req, slug)`) and key data per slug (`leads:<slug>`) — never let one maker read another's
  pipeline, and never gate a hosted portfolio on the single global admin token alone. Store only the hash;
  show the raw token once. A visibility badge must verify server-side, not trust local token presence.
- **Built-in section ids are fixed; custom ones are dynamic.** Built-ins: `practices, projects,
  writing, receipts, job-fit, deep-dives, compass, values` — reorder/hide/rename only, code-rendered. The agent can ALSO
  create **custom sections** (`id: custom-<slug>`, `custom:true`, carrying their own `items`) via the
  `addSection` action; `normalize()` preserves `custom-*` sections + validated items and still drops
  truly unknown ids. Custom sections **must be grounded** — `addSection` is instructed to call
  `getRepoDigest` first and compose items from real repo content, never invented. To add a *built-in*
  section in code: `SECTION_DEFAULTS` (lib/portfolio.ts) AND `KNOWN_SECTION_IDS`/`renderBody` (Portfolio.tsx).
- **The scout stays human-in-the-loop and never invents people.** Compass DRAFTS moves
  (first step, suggested intro) — it must never auto-send or auto-apply (career-os "stop before
  Send"). Collaborators must remain grounded: only handles from the real `discoverCollaborators`
  candidate set survive the route's filter — don't let the model emit free-form handles. Keep
  the corpus budget-bounded. The jobs lane, when added, hands off to career-os, not auto-submit.
- **Self-proof must stay honest, and the aggregate must stay deterministic.** The verifier's
  value is its skepticism: never weaken the prompt into rubber-stamping, keep the
  `unverified`/`contradicted` verdicts, and keep computing the scorecard in code
  (`aggregate()`), not from the model. The corpus is budget-bounded on purpose (free-tier
  TPM) — don't unbound it. **The verifier is a PUBLIC demo** (`/api/verify-resume` is public +
  rate-limited, not owner-gated) so a skeptic can paste a résumé and watch it audit live; keep it
  rate-limited, and keep **publish owner-only** (only `isOwnerRequest` runs `writeVerification`) so a
  visitor can't overwrite the proof. **Closing the loop keeps the same honesty:** `/api/verified-resume`
  drafts from ONLY corroborated/partial claims (each cited), drops the unprovable, and **never
  sends** (career-os ethic) — don't let it include an unverified claim or add an auto-send.
- **Minimalist sections: compact on page, depth on demand; PUBLIC tools on page, OWNER tools in the agent.**
  Resume Verification (`Receipts.tsx`) and Next Projects (`Compass.tsx`) show the essence and hide depth
  behind ONE disclosure. The split for actions: a **public** action lives on the page (Resume Verification's
  "Verify it yourself" paste window — anyone can run it, rate-limited), while **owner-only** tools stay in the
  agent (`draftVerifiedResume`, `scoutNext`, with a one-line owner hint). Don't re-add owner-only forms to the
  page; don't hide a public demo in chat. `Compass.tsx` stays presentational (`{report, isOwner}`); `Receipts`
  takes `onVerify` for the public paste. The full report still feeds the agent via `useCopilotReadable`.
- **Voice stays portable.** `lib/voice/` must not import app/CopilotKit code — it's a
  reusable capability. Keep it dependency-free (Web Speech API only).
- **The extension is zero-trust — keep it that way.** `extension/` must never make a
  network request, never ask for credentials, and never request host permissions beyond
  the LinkedIn + portfolio `matches` it already has. Its only job is a *local* handoff
  (harvest in the user's session → `chrome.storage.local` → the portfolio's
  `localStorage`). This is the whole reason it exists instead of a server-side computer-use
  agent (12X #5, "own your data"). Any change adding a fetch/endpoint breaks the contract.
- **One import pipeline.** The console harvester, the extension, and the `importPosts`
  action all converge on `Portfolio.tsx` `runImport()` and the shared
  `extension/harvest-core.js` dedupe engine. Don't fork the dedupe logic — extend the
  shared core and keep `node scripts/test-harvest.mjs` green.
- **Lead import guidance with the one-click extension.** When the agent guides a user to
  import (feed-URL queries), it must recommend the `extension/` button FIRST (harvests +
  imports automatically), then the console script as the no-install fallback, and state the
  owner-unlock step up front. This is encoded in `harvestTip()`, the "HOW TO IMPORT" readable,
  and `app/page.tsx`'s capabilities string — keep all three in sync.

## Commands

```bash
npm install
npm run dev      # local, http://localhost:3000
npm test         # fast tests (harvest, linkedin, overrides, verification, rate-limit, registry, instance, storage-kv, compass)
INSTANCE=learning-center npm start   # serve a different vertical from the same code (agent card flips)
npm run test:unit # Vitest component tests (jsdom + React Testing Library)
npm run build    # production build (must stay green)
```

- **Open LLM/GitHub routes must stay rate-limited.** `copilotkit`, `a2a`, `repo-digest`,
  `repo-activity`, `registry`, `registry/ask`, **`verify-resume`**, and **`job-fit`** have no owner gate, so
  they call `rateLimit()` (lib/rate-limit.ts) per IP — don't remove it or you reopen the quota-drain hole.

- **One core, many verticals — packs are data, not code.** `Agentize` is the rule that the
  difference between two instances (a portfolio vs a learning center vs a gym) is an `InstanceConfig`
  pack in `content/instances/`, never a code fork. New verticals add a `vertical` string in
  `packages/core/src/instance-types.ts` (`VERTICALS`) + a pack; they must pass `validateInstance()` (keep
  `scripts/test-instance.mjs` green). `VALID_THEMES` must stay in sync with `THEMES` (lib/portfolio.ts)
  + `themes.css`. The contract is fs-free and client-importable — don't add app/fs imports to it. The
  the instance-aware wiring is **complete across all four surfaces**: `app/api/agent-card` (card from
  `getActiveInstance()`), `/api/a2a` (answers from the instance's `content` pack), AND the **visual page**
  (`app/page.tsx` → `<InstanceSite>` for a non-portfolio slug). Select the active business with the
  **`INSTANCE`** env var (unset = `portfolio` = the live site, byte-identical — the page branch is an early
  return, `generateMetadata` returns `{}`, `CopilotProvider`/`PromptStarters` fall back to the portfolio
  defaults). A new vertical that wants a visual site + an agent that answers as itself MUST add a `content`
  pack; outcomes must stay honest (`unverified` unless really audited). Keep instance-specific strings out of
  shared components — pass them via props (labels/grounding/starters/metadata), defaulting to the portfolio.

## Doc-sync

Per the workspace policy: any change to feature code, the API surface, the data model,
or a flag must ship with a `CHANGELOG.md` entry **and** updates to `README.md` (human)
**and** this file (agent) in the same change.
