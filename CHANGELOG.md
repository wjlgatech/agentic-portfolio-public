# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **/make prefill links — a helper can set up a non-technical maker's form with one URL.** Why: the
  remake path for a links-only maker (the Jeff case) required them to re-type name + source URLs;
  for someone non-technical, every field is friction. Now `/make?name=…&linkedin=…&youtube=…` (also
  `x`, `fb`, `ig`, `github`, `website`, `resume`, `category`) pre-fills the form — the maker types
  ONLY their email (which keys their page: same email → same slug → the old page is replaced) and
  clicks once. **Email is never prefilled from a URL** — shared links get forwarded/logged, and the
  email is the page's key, so it stays typed by its owner. URL fields must be `http(s)` to prefill;
  everything is still validated server-side. E2E-tested with real browser navigation
  (`scripts/test-make-ui.mjs`: prefill lands, `?email=` is ignored).
- **/make now PULLS every genuinely-public source at make time — no more shell pages.** Why: a maker
  who gave only links (the "Jeff case": LinkedIn + Instagram + X, no pasted résumé) got a near-empty
  "In progress" page — `/api/make` grounded on résumé text alone, LinkedIn's server fetch is usually
  blocked from datacenter IPs (999), X/IG are login-walled, and the genuinely-public pullers
  (GitHub API, YouTube RSS in `lib/sync.ts`) only ran on a later owner sync/cron the maker never
  triggered. Now `/api/make` fetches **in parallel, before generation**: public LinkedIn metadata
  (best-effort), the maker's **website** (new form field + link, via SSRF-guarded `fetchSourceText`),
  and GitHub repos + YouTube videos (`syncSources` — same pullers as the cron; items also merge into
  `writings` via `mergeFeed` so the first render already shows real work). New pure core
  `@core/make-grounding`: `buildGroundingCorpus()` (ONE labeled corpus, maker's own words first,
  per-part caps + hard budget for free-tier TPM) and `makeSourceReport()` (per-source honesty:
  `pulled` with counts / `blocked` with the paste-and-re-make escape hatch / `walled` for X-IG-FB
  which are NEVER fetched / `empty` with a how-to-fix note). The response carries the report as
  `sources`; `/make` renders it verbatim ("What we pulled from your sources") and its grounding gate
  now accepts any readable source (a YouTube-only maker gets a real page; grounding <40 chars still
  → the honest 400). Tests: `scripts/test-make-grounding.mjs` (18 checks, in `npm test`); Playwright
  e2e (real typing) green; _verified live: a links-only make pulled 6 videos → grounded blurb/mission,
  X/IG reported `walled`, empty input still 400s._

  _Investigated / Rejected:_ server-side scraping of LinkedIn/X/Instagram behind the wall (ToS +
  blocked from datacenter IPs + against the repo's honesty rule — walled sources stay links with an
  in-browser/paste path); relying on the daily sync cron to enrich after the fact (first impression
  is the only impression a shared link gets — and the cron never fixes an empty About).
- **Forgot-passphrase recovery for the root owner gate.** The 🔒 badge's passphrase prompt
  ("Enter …'s owner passphrase") had no recovery path — a forgotten `PORTFOLIO_OWNER_TOKEN`
  locked the owner out with no hint (hosted `/p/<slug>` portfolios already had `/api/recover`).
  Now leaving the prompt blank emails the owner (`PORTFOLIO_OWNER_EMAIL` ||
  `profile.links.email`, via Resend) a 30-minute magic link (`/recover?token=rec.…`);
  `POST /api/owner/recover` verifies it and grants a 30-day HMAC-signed session
  (`sess.<exp>.<sig>`, keyed by the owner token — stateless, no KV; rotating the env var kills
  all sessions) accepted by `isOwnerRequest`/`/api/owner` alongside the raw passphrase.
  Why: an env secret can't be re-minted at runtime, so recovery grants a signed session
  instead of ever revealing the secret. Without Resend configured, the flow answers honestly:
  reset `PORTFOLIO_OWNER_TOKEN` in the hosting env. Unit-tested
  (`scripts/test-owner-session.mjs`, 15 checks, in `npm test`); full loop verified live in the
  sibling private repo (identical files): magic link → Owner mode, secret stripped from the URL.
  **The copilot agent knows the reset too:** the `howToBecomeOwner` grounding readable
  (`Portfolio.tsx`) described only "enter the passphrase", so *"how do I reset the password
  for owner mode?"* got a dead-end "I cannot help with that" — it now carries the
  blank-prompt→emailed-link steps (+ the env-var fallback) and instructs the agent never
  to dead-end that question.

  _Investigated / Rejected:_ emailing or returning the raw token after the link is confirmed
  (secret would transit; sessions keep it server-side); a KV-backed single-use recovery record
  like the hosted flow (needs `POSTGRES_URL` — the stateless HMAC works on any fork with just
  an email key, and the 30-min expiry bounds replay of a link that only lands in the owner's inbox).
- **The Opportunity Scout — the portfolio that hunts instead of waits (drafts-never-posts, spam-gated).** A hosted portfolio's agent can now be PROACTIVE: `POST /api/opportunities {instance, keywords?}` (owner-gated per portfolio, rate-limited) searches public discussions relevant to what the owner actually offers (queries derived from the pack's real offerings + optional keywords), and for each hit runs a **relevance-screen + draft in one LLM call**: if a reply from this business wouldn't genuinely help that thread, it's refused as spam (`droppedAsIrrelevant`, fail-closed when the model can't judge) — only genuinely-helpful, **affiliation-disclosed** drafts (owner's voice, one link, no sales language) enter the queue. **The hard line holds: nothing is ever posted anywhere** — the owner reviews, edits, and posts from their own account, then `PATCH`es the opportunity `sent`/`skipped` (the measure loop). Three new owner agent actions (`scoutOpportunities`/`viewOpportunities`/`markOpportunity` in `InstanceAgentActions`). **Feasibility is probed + honest** (`oppSourceFeasibility`): HN (Algolia) is server-searchable; Reddit's public JSON 403s from datacenter IPs (best-effort → `[]`); Facebook Groups/Skool/LinkedIn/X are login-walled and never claimed — the owner watches those and the agent drafts for anything pasted in. Pure core `@core/opportunity-types` (14 checks, `scripts/test-opportunities.mjs`, in `npm test`). _Verified live: unauth → 403 (fail-closed, even for demo packs); a real scout run searched HN live and the spam gate correctly refused all 6 off-topic hits (found:0, dropped:6) — the first ungated run had drafted replies into a mental-health thread, which is exactly the failure the gate now blocks._
- **/make went category-aware — individuals, businesses, and communities, one pipeline (+ 5 live seed demos).** The Maker now asks *who is this page for?* (🧑‍💻 person · 🏪 business · 🤝 community) and serves all three with the SAME one-click flow; the difference is **data, never a fork** (the platform rule): a new pure-core module `@core/make-category` supplies each category's vertical (validated against `VERTICALS`), sections, proof nouns ("Highlights" / "Track Record" / "Community Impact"), generation prompt (résumé-voice vs business-"we" vs community-welcome), and intake wording — `app/api/make` threads `{category, vertical?}` through `generate()`+`buildInstance()`, with per-category grounding rules (a business/community grounds on its own description; LinkedIn auto-fill stays individual-only) and per-category 400 messages. Plus **five seed DEMO packs** (`content/instances/seeds.ts` — dentist/clinic/apple, roofer/services/brutalist, church/ministry/notion, running-club/fitness/google, artist/personal/anthropic) served with zero setup: registered in `INSTANCES` (`INSTANCE=demo-<x>` renders one as a deploy) and `/p/<slug>` **falls back to them when KV misses** (read-only — no owner hash → View-only badge). **Honesty is test-enforced** (`scripts/test-make-category.mjs`, 40+ checks in `npm test`): every demo blurb says "fictional demo", every outcome stays `unverified`, `network.discoverable:false` keeps demos out of the real registry, `demo-` prefixes prevent maker collisions. `/make` links the demos per category. (tsconfig gains `allowImportingTsExtensions` for core's first intra-package import, keeping plain-Node tests green.) _Verified live against the production build: all 5 `/p/demo-*` → 200 with the fictional-demo label; business make → a `services`-vertical pack in business voice; community thin-input → its own grounding error; Playwright e2e (real typing) green._
- **Deep Dives is now a GENERATOR, not just a receiver (owner-only).** Paste a source URL → `🔎 Deep Dive`
  → the node fetches it (bounded + SSRF-guarded, HTML→text via `lib/source-fetch`), distills a plain-language
  **digest** + a **knowledge graph** + reusable **skills** grounded in the source, and **saves it to the
  knowledge base**. New `app/api/deep-dive/route.ts` (owner-gated → **403**; **503** with no LLM) + a pure
  `parseLooseJson` in `@core/deepen-types`. Reuses the **same grounding gate** as the inbound pipeline
  (`normalizeArtifact` drops dangling edges + limitless skills) and the same store — the node builds its own
  dives *and* still receives super-u's; `producedBy` distinguishes. Reachable via the owner button **and** the
  `deepDiveSource` copilot action. Test: `scripts/test-deep-dive.mjs`.

### Changed
- **Apple-minimalist hero.** Reduced to essentials: caption → name (semibold) → role → the mission said
  once → quiet text links. Removed the bordered Mission box, the redundant blurb, the pill-chips, and the
  verbose "⌘ Ask the agent…" chip (now a quiet "· Ask my agent ↘"). Narrower column, one accent, more air.

### Fixed
- **`mergeFeed` collapsed every synced YouTube video into one item.** Its dedupe key stripped the
  query string, but for YouTube watch URLs the query IS the identity (`watch?v=<id>`) — so a synced
  feed of N videos stored exactly one (the oldest, after the newest-first sort ran on a single
  survivor). Found live: the first production make after the make-time-pull ship reported "6 videos
  pulled" yet rendered one; it never showed locally because the local test channel's items were
  path-identified `/shorts/<id>` URLs. The key (`urlKey`, née `stripSlash`) now keeps the query and
  still drops `#fragment` + trailing slashes, so hash/slash variants of the same video dedupe.
  This also silently crippled the daily sync cron for every hosted portfolio with a YouTube link —
  same class, same fix, since make-time pull and the cron share `mergeFeed`. Regression checks in
  `scripts/test-sync.mjs` (distinct `watch?v=` ids survive; hash/trailing-slash variants still dedupe).
- **Genericized the feedback build-directive — the open-source repo no longer names a private build tool.**
  The feedback→feature loop's per-theme handoff (`buildCommandFor`) emitted a command naming a proprietary
  CLI; it now returns a **tool-agnostic `Build: <one-line>` directive** a maintainer acts on with whatever
  agent/workflow they use. Scrubbed every reference across code, tests, docs, and the GitHub-issue text the
  Action posts (the digest workflow) — zero references remain. Tests updated (`test-feedback`,
  `test-projects-sync` fixture). _Verified: build + suite green._

- **README two-reader clarity pass.** Fixed a dangling table-of-contents anchor — the "The Network" nav
  link pointed at `#-the-network-the-reason-to-join`, but the em-dash in the heading makes the real GitHub
  slug `#-the-network--the-reason-to-join` (double hyphen). Audited every other doc pointer, file path, API
  route, and numeric claim (9 `[data-theme]` brands, `/make` `/network` `/society`, the `.well-known/agent-card.json`
  rewrite) against the source — all accurate, no other changes needed.

### Added
- **1-click source syncs — keep Projects (GitHub) + Writing (feeds) fresh, with both a button and a weekly cron.**
  - **Projects ⟳ Sync from GitHub** (owner) — pulls your repos (public + private with a `repo`-scoped
    `GITHUB_TOKEN`) and merges: updates live fields (stars/pushed/language/url), adds new *recent, described*
    repos, **preserves your curation** (category/highlight/featured), never deletes. Every card links `view →`
    (private too — GitHub gates the content) with a `🔥 N PR·30d` badge + a Public/🔒 Private filter.
    `packages/core/src/projects-types.ts` (pure model + `mergeGithubRepos`, tested) · `lib/projects.ts`
    (durable KV `projects:config`) · `lib/github-repos.ts` · `app/api/sync-projects`.
  - **Writing ⟳ Sync feeds** (owner) — an extensible, MCP-ready source registry: `server-rss`
    (Substack/Medium/any RSS — server pulls the feed) + `browser-harvest` (LinkedIn/X — the login-walled
    in-browser harvest, surfaced as “Sync from LinkedIn”). `packages/core/src/writing-sources.ts`
    (`SOURCE_CATALOG`, generic RSS/Atom parser, tested) · `lib/writing-sync.ts` · `app/api/sync-writing`
    · a `writingSources` registry in the portfolio config · `syncWriting`/`addWritingSource` agent actions.
  - **Both triggers, one sync:** `POST` = the owner button; `GET` = a weekly cron (`lib/cron-auth.ts`
    `isCronRequest`: Vercel-Cron `Bearer CRON_SECRET` or `x-sync-secret: SYNC_SECRET`).
    `.github/workflows/weekly-sync.yml` runs both weekly (set `SYNC_SECRET` to enable; skips gracefully).
  _(Ported from the private repo; generic + moat-free. Verified: build + suite green (328); routes gated;
  Projects `view →` + Public/Private filter render.)_

### Changed
- **Practices & Values render as click-to-expand card sliders (were 1→3→12 / 1→2→6 mindmaps).** Same UX as
  the Writing section: filter chips (the parts) + ‹ › + snap-scroll cards, each click-to-expand for its
  detail — deliberately self-evident, no intro prose. `components/PracticesSlider.tsx` +
  `components/ValuesSlider.tsx` replace the mindmaps; the generic `Mindmap` + both adapters are removed.
  Practices eyebrow "How I compound" → "Compounding everything". _Verified: build + suite green (288)._

### Added
- **Receipts verifies against LinkedIn recommendations too — an "attestation" evidence tier.** The
  self-proof auditor gained a second source: an optional "Add LinkedIn recommendations / experience" paste.
  LinkedIn is **login-walled**, so it's **user-supplied** (paste your own, or a LinkedIn data-export) —
  zero-trust, never scraped. New evidence type `attestation` (`@core/verification-types`) at a distinct
  tier from artifacts: a *named* recommendation describing the exact claim IS a proof point for the
  interpersonal/leadership/impact dimension GitHub can't reach — but the auditor stays honest (testimony
  never upgrades an unproven *technical* claim → stays "partial"; self-reported titles/dates stay
  "unverified"). `verify-resume` accepts an optional `linkedin` body param → a labeled `linkedinAttestations`
  corpus section + tier-aware prompt; rendered as "attested by: <recommender>". +2 tests.

### Fixed
- **🔗 A hosted portfolio's whole discovery surface 404'd — it was a network node no one could find or query.** A `/p/<slug>` portfolio joins the registry with base `…/p/<slug>`, but `/.well-known/agent-card.json`, the legacy `/.well-known/agent.json`, `/api/a2a`, and `/llms.txt` were served **only at the deploy root** (the active instance) — every per-slug path 404'd, so the A2A federation couldn't discover or query any `/make` portfolio. Fixed systematically: a shared `resolveInstance(req)` (`lib/instance-resolve.ts`) loads the hosted config from KV on a `?slug=` (else the active instance), and `next.config.mjs` rewrites `/p/:slug/{.well-known/agent-card.json, .well-known/agent.json, api/a2a, llms.txt}` → the matching route with `?slug=`. The agent-card, `/api/a2a`, and `/llms.txt` routes now build from the resolved config with a per-slug **base** (so the card's `url` points at `/p/<slug>/api/a2a`). _Verified live: all four per-slug endpoints 200 and answer AS that portfolio._

### Added
- **Marketing media went multi-brand — the `themes.css` token seam, applied to the art-boards.** `docs/marketing/media/src/themes.mjs` transcribes all **9 brand token sets** from `app/themes.css` (Anthropic · OpenAI · Google · Apple · Vercel · Stripe · Swiss · Brutalist · Notion), adding the three tokens the CSS doesn't carry (`accentText` for small-text WCAG, `statusNo`/`statusYes` per light/dark). The four art-boards now read **only `var(--…)`** (Anthropic defaults baked in for file:// preview); `render.mjs --theme <name>` injects a brand's tokens over them — **Anthropic stays the default** (the committed `media/*.png`), other brands render on demand to `media/themes/<name>/` (gitignored), `--all` renders every brand. Same rule as the site: **a new brand = one token set, zero board edits.** _Verified: the anthropic re-render matches the approved look; apple + google + vercel (dark — status/onaccent tokens flip correctly) rendered and visually inspected._
- **`docs/marketing/` — all marketing in one tidy folder, run as a closed loop.** New home for everything promotional (index: `docs/marketing/README.md`): **`VIRAL-LOOP.md`** — loop engineering applied to marketing (MAKE → AUTO-REVIEW rubric ≥4/5 → **🔑 HUMAN GATE** → PUBLISH+ENGAGE with drafted-never-sent comment replies → MEASURE → LEARN), also installed as the `/viral-loop` agent skill; **`ledger.md`** (per-post metrics — pasted real numbers, rates computed, never vibed) + **`LEARNINGS.md`** (rules promoted only on ≥3 posts of evidence; 2 seeded hypotheses); **`POST-RESUME-IS-DEAD.md`** — the long-form launch article ("The Résumé Is Dead. Long Live the Living Portfolio.": 7 real citations — Ladders 7.4s, HBS Hidden Workers 88%, Spence signaling, Marlow & Dabbish activity traces, GPTs-are-GPTs 80%, Autor new-work 60%, Papert constructionism; the Leo story is explicitly illustrative); **`media/`** — the article thumbnail (1200×628) + 3 infographics (research stat tiles, dead-PDF-vs-living comparison, the viral loop; 1080×1350) rendered from HTML art-boards via Playwright (`media/src/render.mjs`, 2×) in **Anthropic style** (Cloud paper `#F0EEE6`, serif display, ink text, single Book Cloth accent `#d97757`; the palette validator killed a multi-hue Anthropic mark set — olive/blue fail the chroma floor and coral↔olive is CVD-indistinguishable (ΔE 2.6 protan) — so single-accent by design, with status ✗/✓ as dark rust/green carried by icon+words, never color alone). `docs/OUTREACH.md` moved to `docs/marketing/OUTREACH.md`. **Honesty is structural:** no auto-posting/auto-DM/auto-reply anywhere (platform ToS + the privacy-first brand) — machines draft, review, measure, learn; a human always owns Send.
- **The feedback→feature loop — users talk, the roadmap listens, shipped features notify exactly who asked.** Non-technical users (visitors AND `/p/<slug>` makers) can now tell the on-page agent a **suggestion or complaint** in plain words: a new `sendFeedback` copilot action (both chat surfaces — `useEngagementActions` + `InstanceAgentActions`) captures it verbatim → `POST /api/feedback` (public + rate-limited 3/min, durable KV `feedback:items`, dedupe by content hash; contact email **optional + single-purpose**: the ship notice). A weekly cadence (`.github/workflows/feedback-digest.yml` → `POST /api/feedback/digest`, auth owner OR `x-feedback-secret`==`FEEDBACK_SECRET`) clusters the batch via `chatWithFailover` into themes + drafted proposals — **grounded like every judge surface**: counts recomputed in code from real items, examples are contributors' real words, ungrounded clusters dropped (`normalizeDigest` in the new `@core/feedback-types`); each theme carries a deterministic **build directive**, and the Action opens a **build-review GitHub issue** = the human gate (a maintainer selects, builds, merges — nothing auto-merges, per the drafts-never-auto-ships ethic). Closing the loop: `POST /api/feedback/notify {themes}` (same auth) emails one transactional ship notice to exactly the contributors of the shipped themes (`lib/email.ts`; no list, no marketing — `contributorsFor` resolves them in code) — and the "1-click update" is honest architecture, not a migration: hosted portfolios share the deploy's code while their data (config, articles, leads, owner token) lives per-slug in KV, so every `/p/<slug>` **already runs** the shipped feature with nothing lost. Pure core tested by `scripts/test-feedback.mjs` (22 checks) — wired into `npm test`. New env: `FEEDBACK_SECRET` (optional, cron).
- **Adopted the `no-mistakes` ship-gate discipline + killed a dead-end 404.** Learned from [`kunchenguid/no-mistakes`](https://github.com/kunchenguid/no-mistakes) (a `git push no-mistakes` gate: review→test→docs→lint→verify in a disposable worktree, forward to origin only when green). Added a **`.no-mistakes.yaml`** pinning this repo's real gate commands (`npm run build && npm test`, `npm run lint`; e2e for UI) so the gate is deterministic, and an **AGENTS "Ship gate"** section formalizing the pre-push pipeline (build → test → e2e-for-UI → live-verify-at-the-user's-altitude → docs → fix-the-whole-class). Also fixed a footgun: a friendly **`app/not-found.tsx`** (404 → "make your own" / network) instead of a dead end. _The executable form of "verify, don't vibe" — the discipline that would have caught the theme/focus bugs before they shipped._
- **Email-based owner recovery — the reset the owner token was missing (fixing a real antipattern).** A lost owner link was unrecoverable (hashed, shown once) → dead end. Now: `/make` stores the owner's email server-side (`owner-email:<slug>`, never exposed); the badge's sign-in has a **"lost it? recover by email"** path; `POST /api/recover {slug}` mints a single-use, 30-min recovery token, stores its hash (`recover:<slug>`), and emails a magic link (`lib/email.ts` → Resend REST, no SDK); the `/recover` page confirms the link (`POST /api/recover {slug, token}`), **re-mints** the owner token, burns the recovery record, and drops the owner into Owner mode. **Graceful + honest:** no `RESEND_API_KEY` → `{sent:false, configured:false}` with a re-make fallback message, never a crash; anti-enumeration (initiate always responds the same shape); the confirm fails **closed** on an expired/invalid token. Pure expiry+masking tested (`scripts/test-recovery.mjs`); crypto reuses `lib/portfolio-owner`. Needs `RESEND_API_KEY` (+ a verified `RESEND_FROM`) to actually deliver — see Deploy.

### Fixed
- **🎨 Hosted portfolio (`/p/<slug>`) ignored the style switcher — stuck on its brand (dark/black).** The page wrapped content in `<div data-theme={c.theme}>`, which **overrode** the `html[data-theme]` the global `StyleSwitcher` sets → picking Anthropic/OpenAI/Swiss did nothing (the inner div won the CSS cascade). Same class as the earlier instance-theme fix, re-introduced on the hosted render path. Removed the wrapper override; a **no-flash inline script** now sets the portfolio's theme as the `<html>` default while the switcher/`localStorage` override it **live**. _Root-caused from the live page: it carried both `html[data-theme="anthropic"]` and an inner `data-theme="vercel"`._
- **👤 Hosted portfolio had no way for the owner to sign in.** `HostedOwnerBadge` only unlocked from the `?owner=` link — if you didn't keep it, you were stuck as "View only" with no path in. Added an **"Owner? Sign in"** affordance: paste your owner link **or** raw token → verified server-side (`/api/lead` 200) → flips to 🔓 Owner mode (and a click signs out). Accepts the full `?owner=…` link or the bare token; a wrong token honestly stays a visitor.
- **🐞 `/make` form was unusable — every keystroke lost focus (you could only type one character at a time).** The `Field` component was defined **inside** `Make()`, so each keystroke re-created it as a new component identity → React unmounted + remounted the `<input>` → focus was lost after every character. Hoisted `Field` to **module scope** (stable identity, takes `value`+`onChange` as props). Added a **real-browser regression test** (`scripts/test-make-ui.mjs`, `npm run test:e2e`) that types character-by-character with Playwright and asserts the value accumulates — the only kind of test that catches this (curl/SSR can't). _Verified live-in-browser: name, email, résumé (textarea), and GitHub all type correctly with no focus loss. This shipped because prior verification was API/SSR-only, never real keystrokes — now there's a UI test for exactly that._
- **The hosted deploy's home was a *personal portfolio seeded with the creator's real content*, not the maker.** `/` rendered `<Portfolio>` from `content/*` — which still shipped the creator's **43 real projects** (`projects.json`) and **real LinkedIn articles** (`portfolio.yaml`). Two fixes: (1) **genericized the template default** — `projects.json` + `portfolio.yaml` now hold clearly-labeled placeholders (no one's real IP); a forker starts clean. (2) Added a **Maker landing** (`components/MakerLanding.tsx`) shown at `/` when the new `MAKER_HOME` env flag is set: "make your own agentic portfolio in 60s" → big CTA to `/make`, how-it-works, what-you-get, an example link. The **hosted maker deploy sets `MAKER_HOME=1`** so its front door is the maker (not anyone's portfolio); a developer forking the template as their own site leaves it unset and gets the personal portfolio. README now leads with the **live maker app** at the very top. _Verified live: `/` renders the maker landing with zero personal content._

- **🔒 Security: hosted portfolios were unguarded on any deploy without `PORTFOLIO_OWNER_TOKEN`.** `ownsInstance()` (in `/api/lead` + `/api/sync`) short-circuited on `isOwnerRequest()`, which returns `true` when no global token is configured (the un-gated local-dev shortcut) — so on a real deploy that hadn't set the *optional* `PORTFOLIO_OWNER_TOKEN`, **every** hosted portfolio's leads/sync were readable by anyone (caught live: visitor GET `/api/lead` → 200 instead of 403). Now the admin bypass requires `ownerTokenConfigured() && isOwnerRequest()`; per-portfolio access is gated purely by each portfolio's own token hash. Fails **closed**, and the "optional" token is now honestly optional (per-portfolio ownership stands on its own).
- **`/api/make` 500 (null config) when no LLM key is configured.** With `GROQ_API_KEY` unset, generation falls back to near-empty content, which left `story.mission` empty → `validateInstance` rejected it → `buildInstance` returned `null` → `Cannot read properties of null (reading 'entity')` on the KV path. Now `mission` is defaulted (never empty) so a valid portfolio is always assembled, and the route guards a null config with a friendly **422** instead of crashing. Regression-tested (`scripts/test-make-config.mjs`: empty mission rejected, defaulted mission accepted) — in `npm test`. _Both bugs were surfaced by verifying the live deploy, not the build._

### Added
- **`docs/OUTREACH.md` — the founder outreach playbook (instantiated, drafts-never-sends).** Turns "get the first 10 contributors" into a repeatable loop: an ICP + a 4×0–2 fit-score, a wedge post (LinkedIn + X), a value-first DM template + follow-up beats, a **sourced** target list (real discovered GitHub handles + a prioritized method — survey respondents first — never invented people), the SOURCE→QUALIFY→PERSONALIZE→SEND→ONBOARD→RETAIN→MEASURE loop with retention as the only metric, and an **Outreach Drafting Agent** system prompt that fit-scores + drafts personalized DMs + tracks the funnel while a **human always sends** (same drafts-never-sends ethic as scout/compass). Honest guardrails: personal not bulk, never invent a detail, ≤2 follow-ups, give before you ask. _Framing from the network's own retention-before-distribution playbook: the next 10x isn't code, it's 10 real people._
- **TRUE Merit + the TRUE Hero Award — the reward system, made clear on `/society` (no new infra).** Three data-driven sections (`content/society.ts` → `app/society/page.tsx`): **How you earn** (a peer-attested contribution taxonomy — refer-who-ships, contribute-to-others, feedback-acted-on, collaborate, teach), **What it unlocks** (a benefits ladder Member → Steward → Fellow — recognition + network matchmaking now, sponsor-backed perks listed honestly as "coming as we grow"), and the **quarterly TRUE Hero Award** (one per TRUE perspective, computed from the standing ledger). **TRUE Merit is the existing standing/leverage, not a new currency** — non-transferable, earned, reputation-weighted, decaying; reuses `scoreStanding` with zero new backend. _Browser-verified: all sections render on `/society`._
- **1-click (and scheduled) sync — keep a hosted portfolio fresh from its public sources.** A portfolio can now pull its own latest activity from the sources that are genuinely public: **GitHub** (recent repos via the public API) and **YouTube** (latest videos via the public channel RSS — no key, resolves `@handle` → channel id). `POST /api/sync {instance}` is **owner-gated per-portfolio** (the maker's token, or the deploy admin), fetches both, and merges the latest into the portfolio's writings (`mergeFeed` — dedupe-by-url, newest-first, capped → **idempotent** re-sync). One-click via the agent (`syncSources` owner action: *"sync my portfolio"*). **Scheduled** via a daily **Vercel Cron** (`vercel.json` → `GET /api/sync`, auth by `CRON_SECRET`) that syncs every hosted portfolio in the registry, or the `.github/workflows/portfolio-sync.yml` Action (`x-sync-secret`) as an alternative. `/make` now captures GitHub + YouTube links so sync has sources. **Honest by design:** feasibility is computed in code (`sourceFeasibility` in `packages/core/src/sync-types.ts`) — **X and LinkedIn are NOT server-syncable** (paid API / login-walled; probed: X profile is a JS wall, syndication → 429), so the UI + API say so and route those to in-browser harvest / manual, never faking a server pull. Pure parsers + merge tested by `scripts/test-sync.mjs` (16 checks) — wired into `npm test`. _Verified: the parsers ran against LIVE feeds (6 real GitHub repos newest-first, 6 real YouTube videos); cron GET without the secret → 403; POST without the store → honest 503._
- **`scripts/set-live-links.mjs` — one command to point the README gallery at your live deploy.** After you deploy, `node scripts/set-live-links.mjs https://your-app.vercel.app` rewrites the gallery's `/make` + `/network` cells (between `<!-- LIVE-LINKS -->` markers) from "live once you deploy" to clickable links on your deploy; the flagship example (Paul's real portfolio) stays constant. Deterministic + idempotent (re-run to change the URL; run with no arg to reset to pre-deploy). Refuses to corrupt the README if the markers are missing. Tested by `scripts/test-set-live-links.mjs` (14 checks: pre/post-deploy cells, trailing-slash strip, flagship unchanged, marker replacement, idempotence, content preservation, missing-marker error) — wired into `npm test`. _Verified: live round-trip on the real README (swap → live links appear; reset → pre-deploy note restored, 0 stray links). Why: the gallery's "make your own" link can't be live until the repo is deployed — this makes the post-deploy swap a single, safe, reviewable commit instead of hand-editing._
- **A "See it live" gallery at the top of the README + a "make one like this example" reference on `/make`.** The README now opens with a live, interactive showcase (before Quick start): the flagship [Paul Jialiang Wu portfolio](https://agentic-portfolio-lovat.vercel.app/) you can *chat with right now*, its live `/network`, and the `/make` recipe — framed as "open the example → paste a portfolio you like + your résumé/LinkedIn → get one in that style, customized to you." `/make` gains a matching **"✨ Make one like this example"** reference (prefilled with the flagship URL, editable, reads `?example=<url>`, opens in a new tab) — honest by design: it's a **style reference** (open it to see what you'll get), your *content* still comes from your résumé/LinkedIn, and every portfolio shares the same structure (no fake per-template cloning claimed). _Verified: README gallery links resolve (lovat `/` + `/network` + agent-card → 200; `/make` noted as live-on-deploy since the maker isn't deployed yet); `/make` renders the example block prefilled. Why: newcomers need to SEE and interact with a real example before they'll make their own — the gallery is the top-of-funnel, the example field closes the see→make loop._
- **Per-portfolio owner vs visitor mode for hosted portfolios (multi-tenant ownership).** Previously the owner↔visitor split existed only for the deploy's *own* portfolio (a single global `PORTFOLIO_OWNER_TOKEN`), so a non-technical person who made a portfolio via `/make` was **never the owner of their own `/p/<slug>` page** — and `/api/lead` keyed leads by the deploy's active instance, not the slug. Now every hosted portfolio mints its **own** owner secret at creation (`lib/portfolio-owner.ts` — `mintOwnerToken` + SHA-256 hash stored at `owner:<slug>`, raw token shown to the maker **once** as a private owner link `/p/<slug>?owner=<token>`; re-making rotates it). `/api/lead` is now **per-portfolio**: leads are keyed `leads:<slug>`, the owner GET verifies the presented token against that portfolio's stored hash in constant time (the deploy admin's global token still authorizes any, for moderation), and the public capture POST is scoped to the slug the visitor is on. `/p/<slug>` shows a real **`HostedOwnerBadge`** (🔓 Owner mode ↔ 🔒 View only) that *verifies server-side* rather than trusting local presence; `InstanceAgentActions` uses a per-slug token + passes the slug so `viewLeads` reads only that owner's pipeline. Pure crypto tested by `scripts/test-portfolio-owner.mjs` (12 checks: mint randomness, hash determinism, never-store-raw, constant-time match/mismatch) — wired into `npm test`. _Verified live: visitor/wrong-token GET → 403, deploy-admin GET → 200, visitor lead-capture POST → 200 (visitor UX intact). Why: multi-tenant ownership is load-bearing for the whole `/make` value prop — the maker must own their page and their leads, and never see anyone else's._
- **True 1-click for non-technical users — résumé OR LinkedIn URL is enough (no paste required).** `/make` no longer requires pasted résumé text: give a LinkedIn profile URL instead and `/api/make` pulls its **public** SEO metadata server-side (`lib/linkedin-public.ts` → the pure, tested `@core/linkedin-parse` reads `og:title`/`og:description` — name, headline, experience/education/location) and grounds the portfolio on that. **No login, no credentials, no auth-wall bypass** — the same public bytes Google indexes, one low-volume request. **Graceful + honest:** LinkedIn often blocks datacenter/serverless IPs (999/403) → the fetch returns null, the response carries `source:"thin"` + a note telling the user to paste a few lines and re-make; and name+email with *neither* source is a friendly **400** (a real portfolio needs something to ground on — never fabricated). The form now says "LinkedIn — or paste your résumé"; the success screen shows "Built from your public LinkedIn." Tested by `scripts/test-linkedin-parse.mjs` (11 checks: name/headline extraction, entity decode, reversed attr order, authwall→ok:false, resume-text composition) — wired into `npm test`. _Verified live: `POST /api/make {name,email,linkedin}` with no résumé → `source:linkedin`, real grounded tagline+blurb; no-source → 400._
- **Site-wide share thumbnails — every key page unfurls a branded card, not just `/p/<slug>`.** Added dynamic OG cards for the **home** (`app/opengraph-image.tsx`), **`/network`**, and **`/society`** pages, all built from one shared renderer (`lib/og.tsx` `ogCard()` — dark gradient, eyebrow, big title, subtitle, CTA, per-page accent color) so they speak the same visual language; the per-portfolio `/p/[slug]` card was refactored onto the same helper. The three site-wide cards are **static** (Next prerenders them at build); `/p/[slug]` stays dynamic (reads the person's name/tagline from KV). Set `twitter: { card: "summary_large_image" }` globally in `app/layout.tsx` so every page's card unfurls **large** by default (a page's own `generateMetadata` can still override title/description). _Verified live: home / `/network` / `/society` `opengraph-image` → 200 `image/png` 1200×630. Why: now a link to ANY surface (not just a hosted portfolio) looks great when shared — the front door, the network, and the society each earn the click._
- **Share Studio — an auto-generated thumbnail + 1-paste per-platform copy for every portfolio.** Two things make sharing effortless now. (1) A **dynamic OG thumbnail** (`app/p/[slug]/opengraph-image.tsx`, `next/og`) renders a branded 1200×630 card from the person's real name + tagline — Next auto-wires it as `og:image`/`twitter:image` (+ `summary_large_image`), so **every link a user pastes on X/LinkedIn/Facebook/Slack/Discord unfurls a beautiful card with zero work**; it's also downloadable for YouTube/Instagram. (2) **Per-platform copy computed in code** (`packages/core/src/share-copy.ts` — instant, free, no LLM): X (≤280, URL billed at 23), LinkedIn (long-form), YouTube (description), Instagram (caption), each with a copy button. The upgraded **`SharePanel`** (Share Studio) shows the thumbnail + download + **1-click post intents** for the platforms that support them (X/LinkedIn/Facebook/Bluesky/email) and is **honest** where they don't (YouTube/IG take no link post → download the image + copy the caption). Fixed `metadataBase` to resolve to the **deploy origin** (`NEXT_PUBLIC_SITE_URL`/`VERCEL_*`) so external unfurlers can fetch the image. Tested by `scripts/test-share-copy.mjs` (10 checks: 280-limit incl. absurd taglines, URL-billed-at-23, all-platforms-non-empty) — wired into `npm test`. _Verified live: `GET /p/<slug>/opengraph-image` → 200 `image/png` 1200×630. Why: the thumbnail is what makes people click, and prewritten copy removes the "what do I even say" friction — both feed the viral loop, still with zero contact-harvesting._
- **The honorable viral loop — the network grows 1→2→4→8 without ever touching a contact list.** Every hosted portfolio's footer "Make your own" now carries `?ref=<slug>` (`MadeWith` auto-derives it from the `/p/<slug>` path — no prop threading); `/api/make` records that invite as an edge and, when the invitee ships a **live** portfolio, credits the referrer's `society:contrib:<slug>` — so a real referral lifts your **TRUE standing/leverage**. A **`SharePanel`** (user-initiated LinkedIn/X/email/copy intents — no OAuth, no contacts read) appears on `/make` success so a person shares THEIR OWN portfolio to THEIR feed, on their terms. **`GET /api/growth`** computes the viral coefficient **K** (live invites per active referrer — self-propelling at K≥1), the depth of the tree, and top referrers from the pure `growthStats()` (`packages/core/src/referrals-types.ts`); `?handle=<slug>` returns a referrer's own scoreboard. **Privacy is the product:** credit only flows on a *shipped* portfolio (never for sending), an edge is two public handles, and no third-party PII enters the graph. Tested by `scripts/test-referrals.mjs` (14 checks: K math, honest live-only counting, tree depth, self-edge/dupe robustness) — wired into `npm test`. `/api/standing` now keys a hosted portfolio by its `/p/<slug>` slug so the referral credit feeds its standing. _Why: contact-harvesting (LinkedIn/Gmail/FB address books) is legally exposed (CAN-SPAM/GDPR/CASL; LinkedIn's own $13M Perkins settlement) and torches the "honor privacy" brand — and the APIs are gone anyway. A user-initiated share of a viral artifact hits the same doubling with higher conversion and zero liability. See `### Investigated / Rejected`._

### Investigated / Rejected
- **A tradeable crypto coin / token for contribution rewards.** Rejected. A *transferable* credit with monetary utility inherits securities-law exposure, speculation, wash-trading, and Sybil/mercenary dynamics — the opposite of "honorable," and it attracts farmers over builders. Chose a **non-transferable (soulbound) reputation credit** = the existing TRUE standing/leverage, earned only via peer-attested contribution. Also deferred the **sponsor-backed material perks (free compute, tickets, referrals)**: per the network's own retention-before-distribution playbook, a reward economy for ~0 members is premature — perks are gated to real membership + sponsors; the immediate move is outreach depth, not more scaffolding.
- **Contact-list / address-book harvesting (LinkedIn connections, Gmail contacts, Facebook friends) for bulk-invite.** Rejected. **Can't:** LinkedIn killed the connections API (~2015 — Sign-in returns only the authed user); Facebook `user_friends` returns only friends already on your app (post-2015 / Cambridge Analytica); Gmail `contacts.readonly` is a restricted scope needing an annual CASA security audit. **Shouldn't:** bulk-emailing harvested contacts violates CAN-SPAM/GDPR/CASL, and LinkedIn's own "Add Connections" feature cost it **$13M** (Perkins v. LinkedIn, 2015). It also contradicts the project's core brand ("own your data / honor privacy"). The honorable user-initiated share loop above achieves the same 1→2→4→8 doubling without the liability.
- **The TRUE standing engine — standing is measured, not claimed, and maps to your leverage.** `POST /api/standing {url}` scores a member's TRUE standing from **observed** signals (is the portfolio live? does it expose an A2A agent card with skills + a description?) plus reputation-weighted vouches/contributions in KV (`society:vouches:*`/`society:contrib:*`). The pure `scoreStanding()` (`packages/core/src/society-types.ts`) computes per-tenet **T/R/U/E**, a vouch boost (capped +20 — Sybil-resistant, weighted by the voucher's own standing), an automatic **passivity decay** (the vote-out gravity), an `overall`, a `tier` (applicant→member→steward→fellow), honest `gaps`, and a **`leverage` coefficient (1×–10×)** — the "make any dream true in 1/10 the time & effort, backed by AI + people who trust you via the TRUE contract" multiplier. Aggregate is **computed in code, never trusted from a model**. Surfaced as a "check your standing" widget on `/society`. Tested by `scripts/test-society.mjs` (12 checks: fellow leverage, passivity decay, vouch weighting + cap, empty applicant, gaps) — wired into `npm test`. _Why: the covenant needed a measured, agent-verifiable standing so membership is earned from artifacts, not vibes; the leverage framing makes the payoff concrete._
- **10X the Portfolio Network — from a directory to a self-propelling network.** The `/network` page gained the flywheel it was missing: a **growth header** (nodes · unique skills · Metcalfe `n(n-1)/2` possible links — value rises with N), a **capability marketplace** (browse the network by skill — "who can do X?"), on-join **peer recommendations** (reciprocity — shared-skill nodes to reach) + an **embeddable membership badge** (`/api/badge` → a live SVG "🌐 agentic network · N nodes"; every embed is a backlink → more discover → more join). Pure helpers `networkStats`/`skillIndex`/`peersLike` in `@core/registry-types` (tested); the badge is a cached SVG route. _Verified live: badge serves; the marketplace/growth/reciprocity render._
### Added
- **Emitted instances now deploy with zero code — a JSON-pack loader closes the loop.** `getActiveInstance()` (`content/instances/index.ts`) now falls back to reading `content/instances/<slug>.json` when a slug isn’t a registered `.ts` pack, validating it like any pack (path-traversal guarded, server-only). So `a JSON instance pack` → drop the JSON → `INSTANCE=<slug>` renders a full agentic site (hero, agent, instance-aware A2A card) with **no hand-written `.ts`**. _Verified: a machine-emitted pack rendered as "a demo" with its agent card (describe_offering/assess_fit/next_step); `validateInstance` passes; build green._
### Fixed
- **Instance theme switcher now works (was locked to the instance's brand).** `InstanceSite` wrapped its
  content in `<div data-theme={config.theme}>`, which overrode the `<html data-theme>` the StyleSwitcher
  sets — so on a non-portfolio deploy, picking "Anthropic/Apple style" did nothing (e.g. a demo business stayed
  black). Removed the wrapper override; the layout now sets the **active instance's theme as the `<html>`
  default** (portfolio→anthropic, example→vercel…) and the switcher/localStorage override it live. No
  flash. _Verified: SSR `<html data-theme="vercel">`, no content-level override; switching re-themes._

### Added
- **The instance agent now does WORK, not just chat — + a real owner↔visitor split.** The non-portfolio
  agent gained copilot **actions** (`components/InstanceAgentActions.tsx`): `captureLead` + `bookDemo`
  (VISITOR — the agent captures the prospect's interest as a durable, instance-scoped lead, no form) and
  `viewLeads` (OWNER — read the pipeline the agent built). Backed by **`POST/GET /api/lead`**: POST is public
  + rate-limited + durable (KV, keyed `leads:<instance>`); GET is **owner-gated** (`x-portfolio-owner` → 403
  otherwise). This is the differentiation, concrete: a **visitor** gets frictionless help + capture; the
  **owner** gets the pipeline the agent generated 24/7 (the buy-in). On-brand for a demo business (lead-gen),
  generic for any instance. _Verified: visitor POST persists (`durable:true`), non-owner GET → 403, owner GET
  returns the captured lead._
- **GEO for instances — `/llms.txt` + JSON-LD, instance-aware.** Every instance deploy now serves a
  grounded **`/llms.txt`** (`app/llms.txt/route.ts`, built from the active `InstanceConfig`) and emits
  schema.org **JSON-LD** (`Organization`/`WebSite`/`ItemList`) in `InstanceSite`. _Proof (result-oriented):
  a GEO audit on the a demo business instance went **66 → 87 [agent-SEO ready ✅]**, agent-search **64 → 93**._

### Added
- **`example` instance — a real agentic site for a prospect (a demo business / ).**
  A new content pack (`content/instances/example.ts`, registered in `content/instances/index.ts`) turns
  the site-config system into a full agentic app for a demo business (a a demo SaaS): a CopilotKit
  agent a visitor can chat with, grounded in the product's own material, plus an instance-aware A2A agent
  card (`describe_product`/`assess_fit`/`explain_compliance`/`book_demo`). Built from the public
  a demo site content as a demo; deployed separately at `INSTANCE=example`
  (**a demo deploy**). **Honesty preserved:** the "98% match" headline is a demo business' OWN
  claim, so its Proof/outcomes render `verdict: "unverified"` — the agent presents it as claimed, never as
  audited. Proves the "point at a business → get a grounded agentic site" promise on a real third party.
  _Verified live: renders as a demo business (0 portfolio leak), copilot present, agent card instance-aware;
  `validateInstance` passes; build + all node test groups green._

### Changed
- **Unified the site-config system naming: `the config system`/`instances` → `Instances`.** The two names
  denoted two different layers (platform vs. action) and the "-anything" suffix stuck to both, which read as
  inconsistent. Now one verb-forward system: **the CLI** = the engine, **Instances** (*"the instance system"*)
  = the action + the site-config system brand (the config system
  `create-instantiate`), and **"agentic"** demoted to a plain adjective (an *agentic* portfolio/app), never a
  brand. Neutralized the brand references across README /
  AGENTS / docs / the `InstanceSite` footer / comments. Zero code-path risk: `@core` was
  never imported (code uses the `@core/*` tsconfig alias, unchanged). A new **Naming** table in `AGENTS.md`
  makes the convention enforceable. _Rationale: a verb ("instantiate your résumé/business") states the value,
  stays distinctive amid the generic "agentic X" wave, and carries the wow (the transformation); it's also
  already the command, so name ↔ action align. Verified: build + all 13 node test groups + vitest green._

### Added
- **Deepen pipeline — the portfolio as a *sink* for super-u's distilled knowledge + skills (not the engine, not the orchestrator).**
  A new **Deep Dives** section + inbound `POST /api/ingest-knowledge` let super-u's flywheel
  (`/creator/transform` → kgfy + skillfy) hand this node a distilled artifact — a knowledge graph
  (`nodes`/`edges`) + extracted skills + a plain-language digest — which the node **grounds, presents, and
  uses to educate** the user (a copilot readable). Answers the architecture question directly: the portfolio
  is a personal **node**, super-u is the **capability service**, and **super-u's flywheel is the orchestrator**;
  the portfolio's whole rightful slice is one inbound endpoint. Full rationale + the contract in
  **`docs/DEEPEN-PIPELINE.md`**.
  - **The node refuses ungrounded knowledge.** `normalizeArtifact` (`@core/deepen-types`) rejects an artifact
    with no real http(s) `source.url` (→ 422), drops edges to non-existent nodes, and **drops any "skill" with
    no honest `not_good_at`** (a claim with no limit is marketing, not a skill). Forged skills arrive
    `verified:false` and are shown **unproven** until super-u's outcome loop confirms them (Receipts ethic).
  - **The inbound endpoint is a gated write surface** (owner token OR `x-ingest-secret == INGEST_SECRET`, like
    the Compass cron) + per-IP rate-limited; `GET` is public. Ingests persist durably (Postgres KV) merged over
    a committed seed — same pattern as the registry.
  - **Worked example, grounded in the real source:** `content/deepen.json` seeds DeepSeek's **Engram**
    (*"Conditional Memory via Scalable Lookup"*, `deepseek-ai/Engram`) — a 10-node/11-edge map + 2 skills
    (allocate-sparsity-budget, add-O(1)-memory-lookup) — hand-built from the real repo/paper and labelled
    `seed-example`. The LinkedIn URL from the request is kept only as `discoveredVia` (login-walled → never
    server-fetched; the fetchable source is the GitHub repo).
  - The contract shapes mirror super-u's **real** output (`GraphNode`/`GraphEdge`/`KnowledgeGraph`, the skillfy
    `Skill` with honest edges) — read from the super-u repo, not invented. Cross-project boundary respected:
    only the node's slice ships here; kgfy/skillfy/flywheel stay in super-u. Pure logic covered by
    `scripts/test-deepen.mjs` (`npm test`).
  - _Verified: Deep Dives renders the Engram card SSR; an ingest round-trips (POST gated → GET merged);
    build + all 13 node test groups + vitest green; `tsc --noEmit` clean._
- **Role Fit — score whether a job is a good fit, held to a golden-set accuracy.** A new `Role Fit`
  section + `POST /api/job-fit` scores a posting against the owner across THREE axes — past **experience**,
  current **skillset**, and future **mission/values/vision trajectory** (trajectory weighted highest) —
  grounded in the same corpus as Resume Verification (profile + 12X practices + projects + live GitHub).
  Paste a posting **URL** (Ashby / Greenhouse / Lever are fetched server-side via their **public posting
  APIs** — no login, no scraping; `lib/jobfit.ts`) or the raw JD text. Public + per-IP rate-limited like
  verify-resume; the agent action is **`scoreJobFit`**. Sibling architecture to the verifier: the LLM judges
  each axis with evidence + honest gaps, but the **overall score + fit level are computed in code**
  (`@core/jobfit-types` `aggregateFit`), never trusted from the model — so a misaligned role scores low and
  the "why it might NOT fit" sits next to the number.
  - **Credibility = a golden-dataset eval (the "why trust the conclusion" answer).** `content/jobfit-golden.json`
    holds human-labeled `(JD → expected fit)` examples across all four bands; `scripts/eval-jobfit.mjs` runs
    the REAL scorer over them and writes `content/jobfit-eval.json`, which the page shows as a trust badge
    ("agrees with the golden set N/M within one band, X%"). First run: **8/8 within one band (100%), 6/8 exact**
    on `groq:llama-3.3-70b`. Honest caveat surfaced, not hidden: both near-misses lean *optimistic*
    (Etched ASIC role stretch→promising, a devtools role promising→strong) — the harness makes tightening the
    prompt an iterable, measured change. Pure logic (aggregate + URL parse + eval math) is covered by
    `scripts/test-jobfit.mjs` in `npm test`.
  - **On-ethic "proactive LinkedIn" boundary:** the URL fetcher speaks only PUBLIC ATS APIs; LinkedIn
    (login-walled) is never server-crawled — it stays an in-browser harvest. The proactive *Opportunities*
    scout (fanning this scorer over public feeds on a cron) is the documented next increment.
  - _Verified live: the real Etched JD (`jobs.ashbyhq.com/Etched/831bfa22…`, the URL from the request) scored
    89/strong via its public Ashby fetch; the Role Fit section + golden-set badge render server-side; build +
    all 12 node test groups + vitest green._

### Changed
- **Durable storage is now wired and live — backed by Postgres (Vercel Postgres / Neon), not Upstash KV.**
  `lib/storage.ts` keeps its exact surface (`kvConfigured`/`kvGetJSON`/`kvSetJSON`) but now speaks Postgres
  via the `@neondatabase/serverless` HTTP driver: a lazily-created `kv_store(key TEXT PRIMARY KEY, value JSONB)`
  table with an `ON CONFLICT` upsert. Configured by **`POSTGRES_URL`** (or `DATABASE_URL`) — Vercel's Postgres
  integration injects it automatically — so the agent's edits + Network registry joins **persist and are shared
  across every visitor and serverless instance** instead of being per-browser. `GET /api/health`
  `durableStorage` now reads the new var. The three callers (`lib/registry.ts`, `lib/portfolio.ts`,
  `/api/health`) are unchanged. `scripts/test-storage-kv.mjs` was rewritten to round-trip against a **real**
  Postgres store (self-loads `.env.local`) and to **skip cleanly** when none is configured, so `npm test` stays
  green in CI; it writes only `selftest:*` keys.
  ### Investigated / Rejected
  - _Upstash KV / Vercel KV (the original `lib/storage.ts` backend)._ The marketplace install repeatedly failed
    with `integration_terms_acceptance_required` under an account/team scope mismatch (CLI logged in as personal
    `wjlgatech-8346`, project under team `wjlgatechs-projects`); `vercel env ls` confirmed no KV vars ever landed
    on the project. Banked as `provision-needs-user-verify-path-locally`. The user provisioned a **Vercel
    Postgres/Neon** store instead — it attached to the project cleanly (env injected into Production). Postgres is
    an equally durable KV backend (`kv_store` table), so we swapped backends rather than keep fighting the scope
    mismatch. _Verified: live round-trip against the real Neon DB passes; build + all 11 node test groups + vitest
    green; prod `/api/health` flips `durableStorage:false → true` after deploy._
- **Monorepo split, step 1 — the platform contract layer extracted to `packages/core`.** Instances
  is a *platform*; the portfolio is a *node* on it (a website doesn't own DNS). Moved the 4 pure, import-free
  contract files — `instance-types` (the `InstanceConfig` Lego contract) + the registry / verification /
  compass models — from `lib/` to **`packages/core/src/`**, imported via a new **`@core/*`** tsconfig alias.
  The Next app stays at the repo root so the **Vercel deploy is unchanged**; framework-coupled infra
  (storage, LLM chain, registry logic, A2A, owner) + the workspace-ification + the `apps/portfolio` move
  (which needs the Vercel root reconfigured) are documented next increments. Rationale + the network-effect
  design (verifiable trust × transferable capability × matchmaking liquidity) in
  `packages/core/README.md` has the migration roadmap. _Verified:
  build + all 11 node test groups + vitest green; portfolio + a demo config render unchanged._
- **Resume Verification got its paste window back — now a PUBLIC self-proof demo.** A "Verify it yourself"
  panel with a résumé/CV textarea + Verify button now sits at the top of the section, visible to **everyone**
  ("don't trust me — paste my résumé and watch it verify live against real GitHub"). `app/api/verify-resume`
  is no longer owner-gated (was **403**); it's **public + per-IP rate-limited** (4/min — it's an LLM + GitHub
  route) and **only the owner's run publishes** (a visitor's run is shown in-session, never overwrites the
  proof). The agent `verifyResume` action is public to match; `draftVerifiedResume` (the loop-closer) stays
  owner-only. _Reverses the PR #30 decision to move the verify input to chat — pasting a multi-page résumé
  into a textarea beats a chat box, and a public live audit is the section's killer demo. Verified live: the
  paste window renders; an unauthenticated POST returns 400 (too short), not 403._

### Added
- **Values & Love is now a 1→2→6 mindmap, and the mindmap is one reusable component (OOP).** Extracted a
  generic **`components/Mindmap.tsx`** (single responsibility: root → clusters → leaves + click-to-expand
  state; data and the detail panel are injected via props + a `renderDetail` render-prop). `PracticesMindmap`
  is now a thin adapter over it, and **`ValuesMindmap`** is the second adapter — Values & Love renders as
  root → 2 clusters (How I work · Who it's for) → 6 leaves (the 5 values + Love), each expanding a parallel
  detail (**Lived · In the work · For an agent**). Data in `content/values-map.ts`; a test
  (`scripts/test-values.mjs`) guards the shape AND that every leaf title matches a real `profile.ts` value
  (no drift). DRY/open-closed: a third mindmap = a new adapter, zero changes to the shared component.
- **The TRUE rubric is wired into the agent.** `app/page.tsx` adds a `practices12X` block to the agent
  grounding (the rubric + every practice's T/R/U/E facets + human/agent angle, from `content/practices-map.ts`)
  and instructs the agent it can "explain practice N through TRUE." So **"explain practice 4 through TRUE"**
  now answers from the real data, not invented. _Verified live: the rubric + a per-practice agent facet are
  present in the server-rendered grounding._
- **12X Future Practices is now a 1→3→12 interactive mindmap.** The "How I compound" section renders as a
  connected tree: root (How I compound · 1→3→12) → **3 clusters** (① Aim · ② Loop · ③ Compound, a 3·4·5 split
  of the 12) → **12 practice** leaves. Click any practice to expand its **TRUE** test: **T**ransferable &
  Transformative · **R**eusable & Refinable · **U**nderstandable & U-loop (Theory U) · **E**xperienceable &
  Experimentable — each shown **for a human** *and* **for an agent** (as a skill / plugin / dynamic workflow /
  hook). New `components/PracticesMindmap.tsx` + the pure data in `content/practices-map.ts` (clusters + the
  full TRUE detail per practice); it replaces the old flat `PracticesGrid` in the practices section. New test
  `scripts/test-practices.mjs` (in `npm test`) guards the shape: 3 clusters cover exactly 1..12 once, every
  practice has T·R·U·E + human + agent detail, and the agent angles name real surfaces. _Verified live: root +
  3 clusters + all 12 leaves render; TRUE panels are collapsed until a practice is clicked._
- **Visual instance render — a non-portfolio INSTANCE is now a real, full website (not just a curl-able
  A2A endpoint).** New `components/InstanceSite.tsx` (server component) paints a different brand's site straight
  from its `InstanceConfig` + `content`: hero (entity + mission), principles (story), offerings (tracks/
  services/products), writing, and outcomes (with honest verdict chips), themed via a `data-theme` wrapper.
  `app/page.tsx` branches on `getActiveInstance()`: a non-portfolio slug renders `<InstanceSite>` with its
  OWN grounded agent (instance grounding + labels + prompt-starters), while the portfolio keeps its full,
  agent-editable `<Portfolio>` **byte-identical** (the branch is an early return). Made the supporting
  surfaces instance-aware so nothing leaks: `CopilotProvider` takes optional `labels`/`groundingDescription`/
  `starters` (default to the portfolio's), `PromptStarters` takes optional `items`, and `page.tsx`
  `generateMetadata()` sets a per-instance `<title>`/OG (returns `{}` for the portfolio → unchanged).
  _Verified live: a demo config renders "a demo academy" with its tracks/lessons/outcomes,
  title + starters + agent label are the academy's, and **0** "Paul Jialiang Wu" references leak; the default
  portfolio is unchanged (same title, same site)._ This was the last portfolio-bound surface — card, A2A
  identity, A2A corpus, AND the visual page are now all instance-aware.

### Changed
- **Projects "Show all" toggle restyled** to the same `▸`/`▾` text-link as the Resume Verification / Next
  Projects disclosures, for a consistent minimalist affordance. (Projects already defaulted to featured-only;
  Writing is already a compact single-row slider — no behavioural change to either.)
- **Minimalist UI — compact-on-page, depth-on-demand, owner tools in the agent (Resume Verification +
  Next Projects).** The two heaviest sections now show only their **essence** on the page and tuck the
  rest behind ONE disclosure: Resume Verification shows the corroboration score + verdict counts + the
  single **top gap**, with `▸ Show the N-claim audit` revealing by-category / the full punch-list /
  per-claim breakdown; Next Projects shows the four-vector legend + one featured move, with
  `▸ Show all N moves + M collaborators` revealing the rest + the Reach lane. The owner **tools** left
  the page — the inline résumé-verifier form, the Re-verify/Generate buttons, and the "Scout now" button
  are gone; the owner drives them by chat (`verifyResume`, `scoutNext`, and the new **`draftVerifiedResume`**
  copilot action), with a one-line owner hint where the forms used to be. `Receipts.tsx` + `Compass.tsx`
  are now **presentational** (props `{report, isOwner}` only). _Verified live: the page renders the essence
  + collapsed toggles; the per-claim breakdown + collaborator cards are absent until expanded; the agent
  still has the full data via its readables._

### Added
- **Resume Verification closes the loop — verify → fix → re-verify → a verified résumé.** The "Receipts"
  section is renamed **Resume Verification** (clearer for recruiters/agents; internal id stays `receipts`).
  It now actions the result instead of just showing verdicts: a **Close the loop** panel turns every
  non-corroborated claim into a punch-list (the claim + its `gapCloser` = "to close it, add X"), an owner
  **Re-verify** affordance, and a **Generate verified résumé** action — new owner-gated `POST
  /api/verified-resume` drafts an honest résumé from ONLY corroborated/partial claims, each cited, dropping
  the unprovable ones (career-os ethic: it drafts, never sends; copy/download .md). _Verified live: headings
  render, the panel renders, the route 403s without the owner token._
- **"Next Projects" — four researched growth vectors (was the 2-lane "Compass / What's Next").** Renamed
  **Next Projects**; the scout now proposes moves along **four** vectors instead of two, each grounded in a
  named strategy framework (rendered as a legend on the page): **Deepen** (first-principles / foundational),
  **Widen** (Ansoff · Innovation Ambition), **Lengthen** (McKinsey Three Horizons · Wardley evolution),
  **Heighten** (abstraction laddering · MDL compression) — together the quadrants of explore↔exploit ×
  concrete↔abstract — plus **Reach** (collaborators). `lib/compass-types.ts` adds the `lengthen`/`heighten`
  lanes + `GROWTH_VECTORS`/`PROJECT_KINDS`/`ideaCount`; the scout prompt (`/api/scout`) asks for all four;
  `Compass.tsx` renders the legend + lanes; seed `content/compass.json` gains sample lengthen/heighten ideas.
  New test `scripts/test-compass.mjs` (in `npm test`). _Researched: McKinsey Three Horizons, Ansoff/Innovation
  Ambition Matrix, organizational ambidexterity (explore/exploit)._
- **Per-instance content packs — `/api/a2a` answers AS the business, from its OWN corpus.** New
  `InstanceContent` on the Lego contract (`offerings`/`outcomes`/`writings` — the generalization of
  projects.json + Receipts claims + articles) plus pure builders `instanceEvidence()` (the lean,
  budget-bounded A2A evidence corpus; private offerings share a highlight only, outcomes keep their
  HONEST verdict) and `instanceStaticAnswer()` (the no-LLM grounded fallback). `app/api/a2a/route.ts`
  is now instance-aware: a non-portfolio instance with a `content` pack answers from its material; the
  portfolio keeps reading `content/profile.ts` + `projects.json` (byte-identical path). Scaffolded the
  first content pack — the **a demo academy** (3 tracks, build-loop pedagogy, sample lessons; its
  outcomes are deliberately marked `unverified` so the agent demonstrates the honesty discipline rather
  than fabricating audited student results). _Verified live: a demo config POST `message/send`
  answered with the academy's tracks + grading method; the default portfolio answered with Paul's real
  repos — same endpoint, same code._ The only remaining instance-bound surface is the **visual** `page.tsx`
  rendering (documented next step in the design).
- **Instance-aware Agent Card — any deploy is discoverable AS ITSELF (the federation stud, wired live).**
  New `content/instances/index.ts` registers the content packs and exposes `getActiveInstance()` (reads the
  `INSTANCE` env var, default `portfolio`; an unknown slug or a pack that fails `validateInstance` degrades to
  the known-good portfolio with a server warning — never a 500). `app/api/agent-card/route.ts` now builds the
  A2A card from `instanceToAgentCard(getActiveInstance(), origin)` instead of hand-built portfolio fields, so a
  a non-portfolio config deploy advertises its own skills and a portfolio deploy advertises recruiter
  skills — **same code, zero vertical branches.** _Verified live (`npm start`): default → "Paul Jialiang Wu —
  Agent" / personal / ask_candidate+verify_claim+role_fit; a demo config → "a demo academy —
  Agent" / education / ask_program+verify_outcome+fit_check; `x-llm-ready` preserved both ways._ Minor cosmetic
  change to the live portfolio card: the name suffix is now "— Agent" (was "— Portfolio Agent"); skills,
  examples, and grounding are unchanged. `/api/a2a`'s grounded-answer corpus + the visual `page.tsx` rendering
  stay portfolio-bound for now — making those instance-aware needs per-instance content packs (the documented
  next step in the design).
- **KV durable path — verified end-to-end against a real REST server.** `scripts/test-storage-kv.mjs` stands up a
  local Upstash-protocol KV (SET/GET, Bearer-auth, in-memory) and drives `lib/storage.ts` through it: durable
  round-trip, a Network "join" written under `registry:entries` survives a fresh GET (the "shared across
  instances" claim), an owner edit under `portfolio:config` round-trips without colliding, and a bad token fails
  the write **closed** (returns false, never throws). In `npm test`. This proves the durable code path the live
  "provision a store" step is blocked on — so the moment a real KV is configured, persistence works. _(Provisioning
  the production Upstash store still requires a one-click browser acceptance of its marketplace terms — a legal
  acceptance on the owner's account that can't be done headlessly.)_
- **Instances — the Lego contract that turns this portfolio into a site-config system.** `lib/instance-types.ts`
  defines `InstanceConfig`: the studs (entity / story / theme / agent.skills / sections / proof / scout /
  network / owner / storage) that snap a *content pack* onto the existing core bricks, so a church, gym,
  learning center, agency, trading school, or R&D firm is **data, not a code fork**. `validateInstance()` is
  the fit-check (rejects unknown theme/vertical, missing skill/section, non-kebab slug with precise errors);
  `instanceToAgentCard()` proves any instance → a spec-shaped A2A card with zero vertical code. Ships two
  reference packs — `content/instances/portfolio.ts` (instance #0: the live site, expressed as a config, to
  prove the contract generalizes) and `content/instances/(a demo config)` (a demo config: an
  Agentic Learning Center; Receipts→audited outcomes, Compass→next cohorts). New test `scripts/test-instance.mjs`
  (in `npm test`, 22 checks). Design: the design. _Additive: no existing surface changes — the
  instance-aware wiring of `app/page.tsx`/`agent-card`/`a2a` is the documented next step (declined this pass to
  protect the live $0 deploy). Verified: build + full test suite green._
- **Durable storage (KV) — owner edits + Network joins survive on serverless.** `lib/storage.ts`
  talks to a Vercel-KV / Upstash Redis store via its REST API (no new dependency) when
  `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set. The registry (`readRegistryAsync`/`upsertEntry`)
  and the portfolio config (`readPortfolioAsync`/`writePortfolioDurable`) now read KV-over-the-
  committed-seed and write to KV — so owner wording/layout edits and Network "join" registrations
  become **durable and shared across visitors/instances** instead of per-browser/per-instance.
  Degrades cleanly to the fs seed when KV isn't configured. `/api/health` reports `durableStorage`.
  _Verified: the no-KV fallback path is unchanged (build + all tests green; health=false; registry/
  portfolio/home/network all 200). The live KV write path needs a provisioned store to fully verify._

### Changed
- **God-component split finished + Vitest.** All 16 copilot actions are now extracted into domain
  hooks — `useLayoutActions`, `useContentActions` (editWording/editText/getRepoDigest/add+removeSection),
  `useEngagementActions` (article import + verifyResume + scoutNext) — so **`Portfolio.tsx` is 1,137 → 639
  LOC** (−44%): it now holds state + helpers + readables + render, and routes actions to hooks. Added a
  **Vitest** component-test layer (`vitest.config.ts`, `components/sections.test.tsx`, `npm run test:unit`)
  alongside the fast node-script logic tests; both run in CI. _(Playwright E2E is the remaining test layer —
  deferred: real-browser E2E of the CopilotKit chat needs browser installs + is flaky headless; the node +
  Vitest layers cover logic + components now.)_

### Added
- **Federated search — the A2A fan-out (the network *answers*, not just lists).** `POST
  /api/registry/ask {q}` index-searches the registry for the top-matching nodes, then queries each
  node's **live A2A agent** (JSON-RPC `message/send`) in parallel and returns their grounded answers
  — with a per-node timeout so a slow/dead node can't hang the fan-out. Surfaced as an "Ask the
  network" box on `/network`. Rate-limited (it triggers N downstream LLM calls). `app/api/registry/ask`,
  `components/Network.tsx`. _Verified live: "who ships agent-verification tooling" fanned out and the
  nodes answered grounded — "cli-judge / the CLI (private)" — even respecting the private-repo rule._
  _This is STRATEGY.md feature #4; the index-search (registry) is feature #1._
- **Portfolio Registry (the network's DNS) — the first 10x-network feature.** A searchable
  directory of agent-portfolios at **`/network`**: search by skill ("agent verification", "Rust",
  "founder"), see each node, and "Ask the agent" (each exposes an A2A card). **Join-by-agent-card:**
  `POST /api/registry {url}` fetches the portfolio's `/.well-known/agent-card.json`, validates it's
  a real A2A card, and indexes its skills — **no fabrication**, only portfolios that actually expose
  an agent card can join. `GET /api/registry?q=` ranks the index (name/handle/tags/skills/desc).
  New: `lib/registry.ts` (+ fs-free `lib/registry-types.ts` with the search/rank), `app/api/registry`,
  `app/network/page.tsx`, `components/Network.tsx`, seed `content/registry.json` (genesis node = this
  portfolio). Rate-limited. _Verified live: search finds the node; registering a portfolio by its
  agent-card indexes its real skills (ask_candidate/verify_claim/role_fit)._ _Why: each new portfolio
  makes search/matchmaking/trust more valuable — the network is the 10x. (Index-search now; the A2A
  fan-out to top matches is the documented upgrade — see `docs/STRATEGY.md`.)_
- **Foundation finish.** `/api/health` (liveness + config probe — providers configured, owner-gating,
  no secrets — the observability gap from STRATEGY.md). God-component split continued: the layout/theme
  actions moved to `components/useLayoutActions.ts`; **`Portfolio.tsx` 1,137 → 946 LOC** (with the
  earlier `sections.tsx` + `OwnerBadge.tsx`). The remaining action groups (import/verify/scout/section/
  content) follow the same pattern next. _Lesson: a `"use client"` module must not VALUE-import an
  `fs`-bearing lib (it pulls `node:fs` into the bundle) — pass constants via ctx + use `import type`._
- **Foundation hardening (from the strategy deep-dive, `docs/STRATEGY.md`).**
  - **Rate-limiting on the open, LLM/GitHub-backed routes** (`/api/copilotkit` 30/min, `/api/a2a`
    20/min, `/api/repo-digest` 15/min, `/api/repo-activity` 30/min) — per-IP, in-memory
    (`lib/rate-limit.ts`). Closes a real cost/abuse hole: these had no owner gate, so anyone could
    drain the free LLM quota. _Verified: copilotkit serves 30 then 429s; a2a returns JSON-RPC -32005._
  - **CI** (`.github/workflows/ci.yml`): `npm ci && npm test && npm run build` on every PR + push —
    the gate is now automated (the doc-sync hook only ran locally).
  - **Tests 2 → 5 files** (`overrides`, `verification` aggregate, `rate-limit`) covering the
    critical pure logic. ~22 assertions via `npm test`.
  - **Began splitting the 1,137-line `Portfolio.tsx` god-component** → pure section renderers
    (`components/sections.tsx`) + `components/OwnerBadge.tsx`; now 1,038 LOC. (Action-hook
    extraction is the next iteration.)
  - Added **`docs/STRATEGY.md`** — code-quality eval, 10x efficiency/effectiveness, 10x network
    features (length/height/depth/width), README virality, and monetization, with a sequenced plan.
- **The copilot can now edit the WORDING of any text — schema stays fixed.** Say "change
  Genentech to Accenture" or "reword the blurb/mission/that value" and it applies. Two owner
  actions: `editWording` (substring find/replace across the editable fields) and `editText`
  (replace a whole field). Edits are stored as **overrides** (a whitelisted dot-path → text map
  in `portfolio.yaml`), applied on top of the fixed `content/profile.ts` structure — so the agent
  can change *text* but never the schema. Whitelisted paths only: `profile.{name,tagline,blurb,
  location}`, `mission`, `love`, `values.<i>.{title,body}`, `practices.<i>.{name,body}`. New
  `lib/overrides.ts`; wired into `lib/portfolio.ts` (model+normalize), `app/page.tsx` (grounding),
  `components/Portfolio.tsx` (render + actions + a "current wording" readable so the agent answers
  with the edited text). _Verified end-to-end: an override persists, survives normalize, and
  SSR-renders the new text._ _Why: the portfolio's wording shouldn't require a code edit._
- **1-click example prompts in the chat.** A curated, dismissible row of starter chips above the
  chat input illustrates what the agent can do (flagship projects, hottest repos, verify a claim/
  résumé, scout, add a section, import LinkedIn, switch theme, "what can you do?"). Clicking a chip
  **fills** the input (doesn't auto-send) and drops the cursor on the `<paste …>` token, so you
  customize then send. `components/PromptStarters.tsx`, wired in `components/Copilot.tsx`. _Why: new
  visitors don't know the agent's range; show it and make it 1-click._
- **Projects rank by recency + live 30-day PR activity.** The grid sorts by **last updated**
  (`pushed`) by default, with a **🔥 Active 30d** toggle that ranks by how many PRs each repo got in
  the last 30 days, and a per-card `🔥 N PR·30d` badge. The activity is fetched with ONE GitHub
  search (the owner's PRs in the window, aggregated by repo) via `/api/repo-activity` — efficient
  vs. N per-repo calls — and degrades to date-sort on throttle. `components/Projects.tsx`,
  `app/api/repo-activity/route.ts`. _Verified live: 130 PRs/30d, top repos surfaced
  (loop-engineering-anything 34, FDE-os 28, …)._ _Why: surface what's actually hot right now, not
  a static list._
- **The copilot can now CREATE brand-new sections — grounded in a real repo.** Tell it
  "add a section highlighting my agentic tools (skills, plugins, workflows) from my sos repo"
  and it builds a custom section of item cards. New owner actions: `getRepoDigest` (fetches a
  PUBLIC repo's README + file/dir tree + metadata via `/api/repo-digest`) and `addSection`
  (creates/updates a custom section) + `removeSection`. The agent is instructed to call
  getRepoDigest FIRST and compose items only from what's actually in the repo — **no invented
  tool names or links** (the portfolio's no-fabrication ethos). Custom sections (`id: custom-<slug>`)
  carry their own `items: [{title, body, tag?, url?}]`, persist to `portfolio.yaml` like any layout
  edit, and render as a cards grid. Built-in sections stay reorder/hide/rename-only; custom ones
  can also be removed. `lib/portfolio.ts` (model + normalize), `components/Portfolio.tsx`
  (render + actions), `app/api/repo-digest/route.ts`. _Verified end-to-end: a custom section
  persists, survives normalize, and SSR-renders; `/api/repo-digest` returns sos's real
  skills/plugins/tools dirs._ _Why: a portfolio shouldn't be limited to a fixed set of sections._

### Fixed
- **Newest post no longer buried at the end of the Writing slider.** Posts whose URL has no
  decodable activity id (some `/posts/` slugs, `ugcPost`/`share` URNs) got publish time `null`
  and sorted to the far right — so a brand-new post could vanish off the right while an older,
  datable post showed leftmost. New `lib/linkedin.ts` `orderByRecency()` uses decoded times where
  available and **slots undatable posts into harvest (feed) order** (LinkedIn serves newest-first),
  so a new post lands on the LEFT regardless of id type. Tested in `npm test`. `components/Articles.tsx`.

### Added
- **Extension "⚡ Latest" fast mode — a true 1-click "load what's new."** The LinkedIn extension
  now shows two buttons: **⚡ Send latest posts** (scrolls only a few screens — recent posts are at
  the top — ~3s) and **⬆ Send ALL history (slower)** (full scroll, the original behavior). Both feed
  the same harvester + `importPosts`, which de-dupes by URL+title, so re-clicking ⚡ Latest adds only
  posts published since your last import. `extension/content-linkedin.js`. _Why: re-importing a long
  feed to catch one new post was slow; the recent posts are always at the top._

### Changed
- **Writing section is now a horizontal, newest-first slider** (was a 2-col grid). With many
  imported LinkedIn posts, the section is a single scroll/snap row — most recent on the **left** —
  with ‹ › arrows and the category filter retained. Posts are sorted by **real publish time**:
  imported posts carry no date, so `lib/linkedin.ts` `linkedinActivityTimeMs()` decodes the
  timestamp from the LinkedIn **activity id** (Snowflake — top 41 bits are ms since epoch);
  falls back to the manual `date`, else stable feed order. The card shows the decoded date.
  Covered by `scripts/test-linkedin-url.mjs` (`npm test`). `components/Articles.tsx`.
- **Agent now leads its LinkedIn-import guidance with the one-click extension, not DevTools.**
  When a user pastes a feed URL + "fetch all", the agent was (correctly) explaining the
  *console-script* path — paste `/linkedin-harvest.js` into DevTools, copy JSON, paste back —
  but never mentioned the **one-click browser extension** we ship in `extension/`, which harvests
  AND imports automatically. Updated all three grounding sources (`harvestTip()`, the
  "HOW TO IMPORT" readable, and the page's capabilities string) to recommend the extension FIRST
  (easiest, no DevTools), with the console as the no-install fallback, and to state the owner-unlock
  step up front. _Why: the agent was sending people down the harder path for a one-click capability
  that already exists — the friction, not an error, was the "does not work."_

### Added
- **Guardrails so a bad input can't break the webapp again.** Two layers: a global **error
  boundary** (`app/error.tsx` + `app/global-error.tsx`) so any unhandled client render error
  shows a "Try again / Reload" recovery UI instead of a blank white page; and a **regression
  test** (`scripts/test-linkedin-url.mjs`, run via `npm test`) that locks in the handling of the
  exact query a user reported — `…/in/<name>/recent-activity/all/ fetch all` must classify as a
  login-walled FEED (→ harvester guidance, never a server fetch). The classifier was extracted
  from `Portfolio.tsx` to `lib/linkedin.ts` so it's importable + testable. _Why: "prevent that
  happening again" needs a mechanical guard, not another one-off._
  - _Investigated: the reported "does not work" for that query reproduced as a blank page ONLY in
    the gstack **headless QA browser**, which crashes ~10s into ANY CopilotKit chat session (plain
    queries too) — a test-tool artifact, not a site bug. The agent itself responds **correctly**
    (verified by reading the reply: it gives the unlock + `/linkedin-harvest.js` harvester steps).
    Root-causing the headless crash was dropped as out-of-scope; the error boundary is the durable
    safety net regardless of source._

### Fixed
- **Copilot now leads with the big-quota provider (Gemini), which actually fixes the
  "❌ An error occurred" chat failure.** Captured the real server error in a browser repro:
  a Groq **429 daily-token-cap** (`TPD limit 100000, used 94471, requested 6650`) — a single
  chat turn costs ~6.6k tokens (grounding + ~12 tool schemas + history), so Groq's small free
  daily budget is exhausted in ~15 turns. Crucially the 429 surfaces **mid-stream** ("event
  source callback"), *after* `handleRequest` returned a 200, so the init-time failover added
  earlier couldn't catch it. Fix: `/api/copilotkit` now orders the chain **Gemini-first for the
  chat** (Gemini's free daily quota is far larger and streams tools cleanly through CopilotKit);
  Groq/NIM/OpenAI remain fallbacks. _Verified live in a headless browser: with Groq day-capped,
  the chat streamed a correct, grounded answer via Gemini and the server logged no 429._
  _Investigated/Rejected: a pre-flight token probe (a 1-token check passes while the real 6.6k
  request still 429s — can't predict a daily cap); mid-stream retry (CopilotKit returns the stream
  before the error, so there's nothing left to retry)._
- **Copilot also fails over at stream-init when a provider is throttled.** The
  chat request is large (grounding context + ~12 action/tool schemas + history), so one message
  can trip Groq's free per-minute/daily token limit — and the streaming CopilotKit route was the
  ONE LLM route still pinned to a single provider, so a throttle killed the chat outright.
  `/api/copilotkit` now reads the body once and **fails over across `resolveLlmChain()`**: if a
  provider throws at stream-init (429/413/network) or returns 5xx, it rebuilds the `OpenAIAdapter`
  with the next provider (Gemini's free quota is far larger, so it's the natural catch). Happy path
  unchanged (first provider returns immediately). _Why: the daily-quota exhaustion that surfaced
  during this session's live testing took the live chat down; the survival chain must cover the
  copilot too, not just the JSON routes._ _Verified: route returns 200 on a normal request, a clear
  503 when no key is set; the failover mirrors the live-proven `chatWithFailover` (Groq→Gemini)._

### Added
- **A2A: the portfolio is now an agent other agents can talk to (inbound, Google A2A).**
  A recruiter's / collaborator's AI agent can **discover** this portfolio via an Agent Card and
  **query it machine-to-machine** over the Agent2Agent protocol — grounded, honest answers from
  the portfolio + the verified Receipts (private repos → highlight only; unprovable claims →
  "unverified"). New: `app/api/agent-card/route.ts` (served at `/.well-known/agent-card.json`
  **and** legacy `/.well-known/agent.json` via `next.config.mjs` rewrites), `app/api/a2a/route.ts`
  (JSON-RPC 2.0, **`message/send`** + legacy **`tasks/send`**, synchronous), and a CLI-Anything-style
  `public/a2a/SKILL.md` so the agent is discoverable in the [CLI-Anything](https://github.com/wjlgatech/CLI-Anything)
  ecosystem. Skills advertised: `ask_candidate`, `verify_claim`, `role_fit`. _Why: tomorrow's
  portfolio visitors are agents; this makes the candidate machine-interrogable, honestly._
  - **Pragmatic-sync profile for reliability.** `capabilities.streaming=false`; both well-known
    paths and both method names are accepted for maximum client compatibility. Verified live:
    discovery + `message/send`/`tasks/send` round-trips, honest `verify_claim` (a Genentech claim
    returned `unverified`), and JSON-RPC `-32601` on unsupported methods.
  - **Decision: inbound first, sync first.** Outbound seeking (querying other job/collaborator
    sites + agents as an A2A *client*) and a `printingpress` comms adapter are documented
    fast-follows. (`printingpress` has no public repo — the message send-path is left a pluggable
    seam.) The jobs/outbound lane hands off to career-os, not auto-submit.
- **The free-LLM survival chain now actually survives a throttle.** `lib/llm.ts` gains
  `resolveLlmChain()` (every configured provider, in order) and `lib/llm-complete.ts`'s
  `chatWithFailover()` tries each provider until one succeeds — so a 429 (per-minute or daily
  quota) or 413 on Groq auto-skips to Gemini instead of failing the request. Wired into
  `/api/a2a`. _Verified live: with Groq's daily 100k-token quota exhausted, a `role_fit` call
  failed over to Gemini and returned a grounded answer._ _Investigated/Rejected: pinning one
  provider per request (the old `resolveLlm`) — measured a Groq **429 TPD limit** mid-session that
  killed calls a real failover survives. (The streaming CopilotKit route still pins one provider —
  it needs a single adapter; `/api/verify-resume` and `/api/scout` can adopt the helper next.)_
- **Compass: a proactive scout ("What's Next") that compounds the builder on a cadence.**
  On a schedule (a free GitHub Action, weekly by default) or on demand (owner "Scout now"),
  it surfaces the next moves in two lanes, grounded in the real GitHub fleet + the *verified*
  strengths (Receipts corroborated claims): **projects to deepen** (extend a strength) and
  **widen** (adjacent whitespace, biased by `widenInterests`), and **collaborators to reach**
  (real GitHub people discovered in the topic neighborhood). New section `compass`, route
  `POST /api/scout`, `components/Compass.tsx`, `lib/compass.ts` (+ fs-free
  `lib/compass-types.ts`), `lib/github-collab.ts`, `content/compass.yaml` (cadence + interests),
  seed `content/compass.json`, and `.github/workflows/compass-scout.yml`. _Why: a living
  portfolio should look forward, not just present the past (12X #10 "measure the slope")._
  - **Human-in-the-loop (career-os ethic).** It DRAFTS the next move — a concrete first step,
    a suggested intro — and **never sends anything**. The jobs lane (fit-scored leads →
    hand off to [`career-os`](https://github.com/wjlgatech/career-os)) is a documented fast-follow.
  - **No invented people.** Collaborators are *discovered* as real GitHub handles
    (`lib/github-collab.ts`, bounded searches); the LLM may only rank/explain handles from
    that candidate set — the route filters out anything else. Verified live: 16 real candidates
    found, 3 grounded picks (`@MervinPraison`, `@Undertone0809`, `@YASSERRMD`) with drafted intros.
  - **Auth for the cron.** `/api/scout` accepts the owner token OR an `x-scout-secret` matching
    `SCOUT_SECRET`, so the GitHub Action runs headless. On serverless (read-only fs) the Action
    commits `content/compass.json`, and the push redeploys the fresh feed.
  - **Decision: draft-and-queue, NOT auto-apply.** _Investigated/Rejected: auto-submitting job
    applications — auth-walled portals, ToS/account-ban risk, and bad applications sent in the
    user's name. career-os's own rule is "stop before Send." So the scout drafts; the human acts._
- **Self-proof: a résumé "Receipts" section that audits claims against real evidence.**
  The owner pastes a résumé/CV (chat: “verify this résumé: …”, or the in-section verifier);
  the agent extracts each claim and checks it against the portfolio's own corpus
  (projects + articles + profile) **plus live public GitHub** (languages, recency, README
  text), then renders a per-claim verdict + an aggregate credibility scorecard. New section
  `receipts`, route `POST /api/verify-resume` (owner-gated), `components/Receipts.tsx`,
  `lib/verification.ts` (+ fs-free `lib/verification-types.ts`), `lib/github-evidence.ts`,
  seed `content/verification.json`. _Why: a portfolio should **prove** itself, not assert
  (12X #4 "Verify, don't vibe")._
  - **Honesty is the feature.** Verdicts are `corroborated` / `partial` /
    `unverified — needs external source` / `contradicted`, with `inferred` tags. The auditor
    is prompted to be skeptical and to flag employment/dates/degrees as Unverified rather
    than fabricate corroboration — gaps are shown as prominently as green checks. Verified
    live: a planted "Expert in Rust, 10 years" claim was correctly **contradicted**, and
    "Leads AI/ML/DS at Genentech" / "PhD" came back **unverified**.
  - **Trustworthy aggregate.** The LLM judges each *claim*; the scorecard (corroboration
    index, per-category scores, honest-gaps list) is recomputed **deterministically** in
    `lib/verification-types.ts` — the model's own arithmetic is never trusted.
  - **Rubric reused from [`career-os`](https://github.com/wjlgatech/career-os)** — claim
    taxonomy (cv.template.md), the "proof point = mechanism + metric/status" evidence
    standard (article-digest.template.md), and the no-fabrication / `[inferred]` / human-in-
    the-loop disciplines.
  - **Budget-bounded corpus.** Free-tier LLMs have tight TPM limits (Groq's free tier is
    ~12k/min); the corpus caps README reads (4 × 700 chars) and hard-trims to ~22k chars so
    a real verification fits. _Investigated/Rejected: sending the full corpus + 8 × 1600-char
    READMEs — measured a Groq **413 "request too large" (12,616 > 12,000 TPM)** on a live run._
- **One-click LinkedIn import via a browser extension (`extension/`)** — kills the
  DevTools-console step for non-technical owners. A button injected on your LinkedIn
  activity page harvests your posts **in your own logged-in session** and hands them to
  your portfolio, which imports + dedupes them through the existing `importPosts`
  pipeline. _Zero-trust by construction_ (12X #5 "own your data"): the extension has only
  `storage` + `tabs` permissions, makes **no network requests**, and never sees your
  credentials — the handoff is local (`chrome.storage.local` → the portfolio page's
  `localStorage["portfolio-pending-import"]`). Chosen over a server-side computer-use
  agent precisely because that would require your LinkedIn credentials on a server and
  trip LinkedIn's automation bans. Files: `extension/manifest.json`,
  `content-linkedin.js`, `content-portfolio.js`, `background.js`, `extension/README.md`.
  _Why: the agent should do the digital work, but inside the authenticated browser the
  user already owns — not a credential-borrowing server._
- **Shared, unit-tested harvest core (`extension/harvest-core.js`)** — the self-healing
  union-find dedupe engine is now factored into one UMD module consumed by both the
  extension's content script and `scripts/test-harvest.mjs`, so the tricky cross-alias
  fusion (same post via activity-id AND canonical URL) is written once and tested once.
  The console harvester (`public/linkedin-harvest.js`) keeps the same algorithm as the
  no-install fallback. `node scripts/test-harvest.mjs` now drives the shared core.
- **Auto-import handoff in `Portfolio.tsx`** — on mount / on an extension ping / when
  owner mode unlocks, the page consumes a pending import: owners get an automatic import
  + a bottom-center toast; visitors get a nudge to unlock (pending posts are kept and
  applied the instant owner mode turns on). The `importPosts` action and this handoff now
  share one `runImport()` function.
- **Conversational portfolio editing → `content/portfolio.yaml`** — a new control file
  is the single source of truth for section order, visibility, labels, theme, and the
  articles list. The on-page agent turns natural language ("move Projects to the top",
  "hide Writing", "add my LinkedIn article …", "switch to the Notion theme") into
  structured edits via CopilotKit **actions** (`useCopilotAction`) in
  `components/Portfolio.tsx`. Edits update React state instantly, cache to
  `localStorage`, and persist to the YAML through `POST /api/portfolio` (writable in
  local dev; read-only on serverless, where the change stays in the browser until the
  YAML is committed). New: `lib/portfolio.ts` (read/normalize/write), `app/api/portfolio`.
  _Why: the portfolio should be authored by talking to it, not hand-editing JSON._
- **Owner/visitor authorization** — only the owner can APPLY changes; visitors can ask
  and have the agent PROPOSE edits (clearly labelled, never applied). Proven by a
  server-side secret `PORTFOLIO_OWNER_TOKEN`: `POST /api/portfolio` returns **403**
  without a matching `x-portfolio-owner` header (`lib/owner.ts`, `app/api/owner`). The
  client resolves role on load (`?owner=<token>` once, or a stored token → verified via
  `/api/owner`), shows a 🔒/🔓 badge, and strips the secret from the URL. No token
  configured = un-gated local dev (you're the owner). _Why: a public site must not let
  any visitor rewrite the portfolio._
- **Reusable voice input (`lib/voice/`)** — a dependency-free, transportable
  speech-to-text capability: `useSpeechToText` (Web Speech API hook) + `<VoiceInput>`
  (drop-in mic that attaches to any text field via selector + `MutationObserver` and
  writes through the React-safe native value setter). Wired into the CopilotKit chat bar
  so you can dictate instead of type. Copy the folder into any React app; see
  `lib/voice/README.md`. _Why: voice is a faster input, and the capability should be
  reusable across apps/agents._

### Fixed
- **Agent's LinkedIn-import guidance is now actionable (clickable link + steps).** When a
  user pasted a feed/activity URL and asked to import, the agent answered with a vague "run
  the harvester (/linkedin-harvest.js)" — no clickable link, no steps. `HARVEST_TIP` is now a
  `harvestTip()` function that builds an **absolute** `${origin}/linkedin-harvest.js` URL and
  numbered steps, and a new always-on grounding readable ("HOW TO IMPORT LinkedIn posts")
  carries the same steps + link so even a conversational answer is actionable. _Why: the
  reply was a dead end with nothing to click._
- **Agent now tells visitors HOW to become the owner.** It correctly detected visitor vs
  owner (an un-unlocked user on a token-gated deploy *is* a visitor), but only said "only the
  owner can apply" — no path forward. The role grounding now includes a `howToBecomeOwner`
  field (click the 🔒 "View only" badge bottom-left + passphrase, or `?owner=<token>` once)
  and instructs the agent to surface it every time it declines an edit. _Why: refusal without
  a remedy reads as "the agent can't tell who I am."_
- **Agent no longer chokes on a LinkedIn feed/activity/profile URL.** Asking it to "fetch
  all posts from `…/recent-activity/all/`" made it call the fetch tool on a login-walled
  feed (LinkedIn returns HTTP **999** anti-bot → 502/hang → a generic "An error occurred").
  Now `addArticleFromUrl`/`importPosts` detect feed/profile URLs (`isLinkedInFeedUrl`) and
  the grounding tells the agent up front: don't fetch the feed — guide the user to the
  harvester (`/linkedin-harvest.js`) and `importPosts`. Individual `/pulse/` & `/posts/`
  links still fetch. Classifier verified across feed/profile/pulse/posts/feed-update cases.
- **Pinned CopilotKit to 1.5.20** (was `^1.5.0`, which silently resolved to **1.61.2**).
  The 1.6x line is a different **AG-UI agent architecture** the code wasn't written for; it
  (a) streams model *reasoning* as `reasoning_content` deltas that the chat UI doesn't
  render (agent looked silent) and (b) raised `RUN_ERROR: "Input contains unsupported
  content types or unsupported content fields"` on tool round-trips. The classic 1.5.x
  `CopilotRuntime`/`OpenAIAdapter` runtime the code targets is far more compatible with
  the free OpenAI-style providers. _Why: align the installed library with the code._
- **Default LLM is now Groq `llama-3.3-70b-versatile`** (chain reordered Groq → Gemini →
  NVIDIA → OpenAI). It does tool-calling AND streams plain `content` (not reasoning
  deltas), which CopilotKit needs. Reasoning models like `openai/gpt-oss-120b` return 200
  but render nothing. See the constraints note in `lib/llm.ts`.
- **Copilot went silent once edit actions were added** — CopilotKit attaches the actions
  as OpenAI *tools*, and the old default model `meta/llama-3.3-70b-instruct` (NIM) can't
  emit structured `tool_calls` (it returns the call as plain text), so `/api/copilotkit`
  **400**'d and the chat produced nothing. Switched the tool-capable defaults in
  `lib/llm.ts` to **`openai/gpt-oss-120b`** for NIM and Groq (verified to return proper
  `tool_calls`); Gemini `gemini-2.5-flash` and OpenAI `gpt-4o-mini` already support tools.
  Override with `NIM_MODEL`/`GROQ_MODEL`. _Why: the agent now needs function-calling;
  the model default must support it. (Found via `/free-llm`.)_

- **Self-healing LinkedIn harvester** — `public/linkedin-harvest.js` no longer depends on
  LinkedIn's (constantly-changing) CSS class names. It extracts from three STABLE signals —
  public URL routes (`/feed/update/urn:li:activity:`, `/posts/`, `/pulse/`), `data-urn`
  attributes, and embedded JSON — and **union-find-dedupes by activity id AND URL**, so the
  same post reached via different URL forms collapses to one. If all strategies still find
  nothing (a genuine DOM overhaul), it auto-copies a structured DIAGNOSTIC to the clipboard
  so the fix is data-driven, not a guessing loop. Class-independence + dedup verified against
  an obfuscated-markup fixture (`scripts/test-harvest.mjs`-style: 4 unique posts, 0 dupes).
  _Why: LinkedIn changes its DOM constantly; key off data, not styling._
- **Bulk-import LinkedIn posts (de-duplicated)** — LinkedIn's activity feed is login-walled
  (an unauthenticated fetch returns a ~1.5KB sign-in wall), so a `public/linkedin-harvest.js`
  script runs in the user's own logged-in browser (console paste, CSP-safe), auto-scrolls,
  reads each post's `{url, title, summary}` from the DOM, and copies a JSON list. The new
  `importPosts` agent action parses it (or a pasted URL list) and adds the posts, **skipping
  anything already present** (dedupe by normalized URL + title). _Why: import a whole feed of
  long+short posts without a server ever touching LinkedIn credentials._
- **Add an article from just its URL** — new server route `app/api/fetch-article`
  fetches a page server-side (no browser CORS — that was the "Failed to fetch" error),
  extracts the title + summary from Open Graph / meta tags, and the new `addArticleFromUrl`
  agent action fills the article from it. Owner-gated + basic SSRF guard. _Why: paste a
  LinkedIn link, get a full article card — no typing the title/summary._
- Voice input now **surfaces errors** (denied mic permission, no-speech, no device) via a
  console warning + alert, instead of failing silently (`lib/voice/VoiceInput.tsx`).

### Changed
- Seeded the Writing section with five real LinkedIn articles in `content/portfolio.yaml`.
- Articles moved from `content/articles.json` (removed) into `content/portfolio.yaml`;
  the Writing empty-state now points to the agent / `portfolio.yaml`. `app/page.tsx`
  reads the YAML per request (`force-dynamic`) and renders sections in the YAML's order
  via `<Portfolio>` (previously a fixed JSX order).

### Added
- **Brand-style theme seam (`app/themes.css`) + live `StyleSwitcher`** — visual style is now
  a swappable, config-keyed seam: every component reads CSS-variable design tokens (color,
  type, radius, shadow, motion) and the active "body" is chosen by `data-theme` on `<html>`.
  9 researched styles: **anthropic** (default), openai, google, apple, vercel, stripe, swiss,
  brutalist, notion. A no-flash inline script restores the saved theme before paint; choice
  persists in `localStorage`. _Why: demonstrate swappable-seams on visual design — adding a
  brand is one `[data-theme]` block, zero component edits._ Shared with the reusable
  `/webapp-style` skill.
- Theme-safe `private` project badge — outline (`border-edge` + `text-muted`) instead of a
  filled `bg-edge`, which rendered dark-on-dark under themes whose edge color is near-black
  (brutalist, swiss). Caught by visual verification across themes.
- Initial agentic portfolio: Next.js 15 (App Router) + CopilotKit on-page agent,
  grounded in the repo's own content via `useCopilotReadable`. _Why: the portfolio
  should explain itself — a visitor asks, the agent answers from verified content._
- Free-LLM survival chain (`lib/llm.ts`): auto-selects NVIDIA NIM → Groq → Gemini →
  OpenAI from whichever key is present; key stays server-side in `/api/copilotkit`.
  _Why: $0 to run, never dies on a throttled free tier (per the `/free-llm` policy)._
- Content as data: `content/profile.ts` (mission, values, love, 12X Future Practices),
  `content/projects.json` (last-12-months active repos, categorized, IP-safe highlights;
  private repos show highlight only, no link), `content/articles.json` (self-updating
  LinkedIn section, grouped by category; `REPLACE ME` seeds hidden until filled).
- Filterable Projects grid (by category, featured/all toggle) and Articles grid (by category).

### Investigated / Rejected
- **next/font/google for typography** — rejected: build-time font fetch fails offline /
  in sandboxed CI. Using a system font stack via CSS variable instead (zero network).
- **Static GitHub Pages + client-side LLM calls** — rejected: a free-LLM key cannot be
  safely embedded in a public client bundle. Chose Next.js + a server route that holds
  the key (the `rbit-ai` pattern).
- **Next 15.1.6** — rejected: ships with CVE-2025-66478. Pinned to patched `15.5.19`.
