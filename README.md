<div align="center">

# 🌐 agentic-portfolio

### Make your own AI-agent portfolio in 60 seconds — free, no code.

## 🚀 [**→ Create yours now: agentic-portfolio-public.vercel.app**](https://agentic-portfolio-public.vercel.app/)

**Non-technical?** Just enter your name, email, and a few lines of your résumé (or your LinkedIn URL),
click once — and you get a **live portfolio with its own AI agent** that answers questions about you,
24/7. Hosted for you. Nothing to install.
**A developer?** Fork it, fill in `content/`, deploy for $0 — same agent + an A2A card so other agents can query yours.

[Make your own](https://agentic-portfolio-public.vercel.app/) · [See an example](#-see-it-live) · [The Network](#-the-network--the-reason-to-join) · [Quick start (devs)](#-quick-start) · [Deploy](#-deploy-free) · MIT

</div>

---

## ▶ See it live

**The maker (make your own in one click):** 👉 **[agentic-portfolio-public.vercel.app](https://agentic-portfolio-public.vercel.app/)**

**A real portfolio it produced — open it and chat with the agent:**
### 👉 [Paul Jialiang Wu's agentic portfolio ↗](https://agentic-portfolio-lovat.vercel.app/)
Ask its on-page agent *"what has Paul built?"* or *"is he a fit for a staff ML role?"* — it answers grounded in his real work. It's also a live network node other agents query ([its A2A agent card ↗](https://agentic-portfolio-lovat.vercel.app/api/agent-card)).

<!-- LIVE-LINKS:START (regenerate: node scripts/set-live-links.mjs <deploy-url>) -->
| See it | Open | What to try |
|---|---|---|
| 🧑‍💻 **A live portfolio** | [agentic-portfolio-lovat.vercel.app ↗](https://agentic-portfolio-lovat.vercel.app/) | Chat with the agent; open **Receipts** (claims audited against public GitHub — plus, optionally, your own pasted LinkedIn recommendations as an *attestation* tier). Practices & Values are click-to-expand card sliders. Owners can **Deep Dive** any source URL → a saved knowledge graph + skills. Apple-minimalist hero. |
| 🌐 **The network** | [/network ↗](https://agentic-portfolio-public.vercel.app/network) | Browse agent-portfolios; ask one question and every node's agent answers. |
| ✨ **Make your own** | [**`/make`** — try it live ↗](https://agentic-portfolio-public.vercel.app/make) | Give **name + email + any real source** — résumé text, LinkedIn URL, website, GitHub, YouTube → your own live portfolio in the same style, grounded in everything readable at make time. |
<!-- LIVE-LINKS:END -->

_Deployed this repo? Run `node scripts/set-live-links.mjs https://your-app.vercel.app` to make the `/make` and `/network` links above point at your live site, then commit._

**The whole idea in one line:** open the example above → like it? → go to `/make`, paste **a portfolio you want yours to look like** (e.g. `https://agentic-portfolio-lovat.vercel.app/`) plus **your résumé or LinkedIn link** → in ~60s you have your own agentic portfolio in that style, customized to you, on the network. No code.

---

## What this is

A **Next.js 15 + CopilotKit** site where the content *is* the source of truth and an on-page agent
answers questions about you — grounded in `content/*`, backed by a **free-LLM survival chain** so it
runs at **$0**. It's also a **node on a network**: every site exposes an [A2A](https://a2a.dev) agent
card at `/.well-known/agent-card.json`, so agents (and people) can find and query it. The site is
rendered from a config in `content/` (the default is the portfolio), so your content — not code — is
what makes it yours.

## ✨ Make yours in one click (no code)

Not a developer? Go to **`/make`**: type your name + email, and **any real source — a few lines of your
résumé, your LinkedIn URL, your website, GitHub, or YouTube channel** — click once, and you get a **live
portfolio with its own AI agent**, hosted on the shared network at `/p/<you>`. No fork, no deploy.
Recruiters can just *ask your agent* about you. Everything genuinely public is **read at make time**
and the result screen shows a per-source report — what was pulled, what
was blocked, what's login-walled by design.

**Helping someone non-technical?** Send them a **prefilled link** — put their name and source URLs right
in the address (`/make?name=Their%20Name&linkedin=…&youtube=…`): the form arrives already filled, they type
only their email and click once. (Their email is never taken from the link — it's what keys their page, and
re-making with the same email updates their page in place.)

**Not just for job-hunters.** `/make` asks one question first — *who is this page for?* —
and serves three kinds of maker with the same one-click pipeline:

- **🧑‍💻 Me (a person)** — engineer, nurse, artist, any professional. Grounded in your résumé or LinkedIn.
- **🏪 My business** — dentist, roofer, shop, practice. Grounded in a few honest lines about what you do;
  your agent answers visitors' questions and captures interested leads **only you** can read.
- **🤝 My community** — church, prayer group, running club. Grounded in who you are and when you meet;
  your agent welcomes newcomers 24/7.

See a **live demo** for each: [🎨 artist](https://agentic-portfolio-public.vercel.app/p/demo-artist) ·
[🦷 dentist](https://agentic-portfolio-public.vercel.app/p/demo-dentist) ·
[🏠 roofer](https://agentic-portfolio-public.vercel.app/p/demo-roofer) ·
[⛪ church](https://agentic-portfolio-public.vercel.app/p/demo-church) ·
[🏃 running club](https://agentic-portfolio-public.vercel.app/p/demo-running-club) — all
**clearly-labelled fictional examples** (every claim shows `unverified`; demos never join the real network directory).

**And it hunts, instead of waiting to be discovered.** Ask your agent to *"scout for opportunities"*
and it searches public discussions where you could genuinely help (a roofer finding after-storm
renovation threads), then **drafts a helpful, affiliation-disclosed reply for each** — in your voice,
grounded in your real offerings, with a built-in spam gate that refuses threads where a reply from
you wouldn't actually help. **Nothing is ever auto-posted**: you review, edit, and post from your own
account (bots get banned; a helpful human answer converts) — then tell your agent "mark it sent" so it
learns what works. Honest about the walls: Hacker News is searched live; Reddit is best-effort;
Facebook Groups, Skool, LinkedIn and X are login-walled — you watch those, and your agent drafts a
reply for anything you paste in.

> **What gets pulled, honestly.** At make time the Maker reads **everything genuinely public** you gave it —
> your website's text, your recent GitHub repos, your latest YouTube videos (public RSS), and your **public**
> LinkedIn profile metadata (the same info Google sees — no login, we never post as you) — and grounds your
> page on all of it, not just pasted résumé text. What it *can't* read, it says so: LinkedIn sometimes blocks
> server reads from datacenter IPs (paste a few lines and re-make to enrich), and **X / Instagram / Facebook are
> login-walled — no server can read them**, so they stay links and the report tells you to paste your highlights
> instead. Hosting the shared `/make` needs an LLM key + a Postgres/Neon
> store on the deploy (see [Deploy](#-deploy-free)); without them it hands back a downloadable pack.

**You own your page.** When you make a portfolio you get a **private owner link** (`/p/<you>?owner=…`) — save it.
Open it and you're in **🔓 Owner mode**: manage your portfolio and ask your agent to *show your leads* (everyone your
agent captured). Everyone else is a **🔒 visitor** — they can chat with your agent and it can capture *their* interest,
but only you can read your pipeline. Each portfolio has its own owner key; no one can see anyone else's.

**Keep it fresh — 1-click or on a schedule.** Add your **GitHub** and **YouTube** links and your portfolio
auto-pulls your latest repos + videos: ask your agent to *"sync my portfolio"* (1-click, owner-only), or let it
update itself on a **daily schedule** (a [Vercel Cron](https://vercel.com/docs/cron-jobs) in `vercel.json` hits
`/api/sync`; set `CRON_SECRET`). Re-syncing is idempotent (dedupe by URL). **Honest about the walls:** GitHub +
YouTube are public feeds a server can pull; **X and LinkedIn are paid/login-walled**, so those aren't auto-synced —
you add them in your browser (the harvester), never a server-side scrape.

Every page carries a small credit to the creator and a *make-your-own / join-the-network* invite — open source
and free, but each portfolio grows the network and the brand. That's the point.

## ⚡ Quick start

```bash
git clone https://github.com/wjlgatech/agentic-portfolio-public   # (your fork)
cd agentic-portfolio-public
npm install
cp .env.example .env.local      # add ONE free LLM key (see the table in .env.example)
npm run dev                     # → http://localhost:3000
npm run build                   # the real gate (TypeScript + Next compile)
npm test                        # the pure-logic unit tests
```

Without any key the site still renders fully; only the chat shows a "configure a key" hint.

## 🌐 The Network — the reason to join

A directory is linear; a **network** is superlinear — the value to each node rises with N. Visit
**`/network`**:

- **Ask the network** — one question fans out over every matching node's *live* A2A agent; each answers
  grounded in its own portfolio.
- **Browse by capability** — the registry is a marketplace: "who has shipped agent-verification tooling?"
- **Join in one paste** — add your portfolio URL (it just needs an A2A card, which this template ships).
  You're instantly discoverable + queryable, get **peer recommendations** (shared-skill nodes to reach),
  and an **embeddable badge** (`/api/badge` → a live SVG "🌐 agentic network · N nodes"). Every embed is
  a backlink → more people discover the network → more join. That's the self-propelling loop.

**Come for the tool (a great $0 agentic portfolio), stay for the network** (each site makes the next one
worth more).

### Grow it 1→2→4→8 — the honorable way

We grow **virally without ever touching your contacts.** No LinkedIn/Gmail/Facebook address-book import,
no OAuth into your connections, no bulk-spam. Instead:

- **The artifact is the invite.** Every hosted portfolio's footer carries a personal `?ref=<you>` link,
  and a **Share Studio** lets you broadcast **your own** portfolio — *you* click, on *your* feed.
- **An amazing thumbnail, automatically — everywhere.** Each portfolio gets a dynamic branded card
  (`/p/<slug>/opengraph-image`, 1200×630) built from your name + tagline, and the **home, `/network`,
  and `/society`** pages have their own cards too. Paste any link (X, LinkedIn, Slack, Discord) and it
  **unfurls the card with zero work** — or download it for YouTube/Instagram.
- **1-paste captions.** Ready-made, per-platform copy (X ≤280, LinkedIn long-form, YouTube description,
  Instagram caption) with a copy button each, plus **1-click post** intents for X/LinkedIn/Facebook/Bluesky.
  Honest where a platform takes no link post (YouTube/IG): download the image, paste the caption.
- **Referrals are earned, not sprayed.** When someone you invited actually **ships a live portfolio**,
  *your* [TRUE standing](#-the-true-society-invite-only) rises — credit flows only on a real result,
  never for sending an invite.
- **K is measured.** `GET /api/growth` computes the real viral coefficient **K** (live invites per active
  referrer — self-propelling at K≥1) and the depth of the tree, in code (`packages/core/src/referrals-types.ts`).

That's why a portfolio in this network is *trusted*: we never harvested anyone. **Privacy is the product.**

## 🗣 Tell the agent what to build — the feedback→feature loop

The roadmap listens. **Anyone** — a visitor, or a non-technical maker on their own `/p/<slug>` page —
can just *tell the on-page agent* a suggestion ("I wish it exported a PDF") or a complaint ("the theme
switcher confuses me"). The agent captures it verbatim (`sendFeedback` → `POST /api/feedback`, durable,
rate-limited) and asks once if you'd like a ship notice — leave an email **only** if you want one.

Then the loop runs:

1. **Weekly digest.** A cron (`.github/workflows/feedback-digest.yml` → `POST /api/feedback/digest`)
   clusters the batch into themes + a drafted feature proposal each. Honest by construction: every
   count is recomputed in code, the examples are contributors' real words, ungrounded clusters are dropped.
2. **The human gate.** The digest lands as a GitHub issue where each theme carries a ready-to-act
   **build directive**. A maintainer picks what's worth building, builds it (or hands the
   directive to a coding agent), and merges. **Nothing auto-merges.**
3. **The ship notice + 1-click update.** `POST /api/feedback/notify {themes}` emails exactly the people
   who asked for exactly what shipped — one transactional notice, never a list. And because hosted
   portfolios share the deploy's code while **your data lives in your portfolio's own store** (config,
   articles, leads, owner token — keyed by your slug), your portfolio *already runs* the new feature
   when you open the link. Nothing to migrate, nothing lost.

## 🎨 Make it yours

All copy is **data-driven** — never hardcoded in components. Edit these:

| To change… | Edit |
|---|---|
| Name, tagline, mission, values | [`content/profile.ts`](content/profile.ts) |
| Projects shown | [`content/projects.json`](content/projects.json) — every card links `view →` (private repos too) with a **🔥 Active 30d** badge + a **Public / 🔒 Private** filter. Owners get **⟳ Sync from GitHub** (a button + a weekly cron): pulls your repos (public + private with a `repo`-scoped `GITHUB_TOKEN`), updates live fields + adds new repos, **keeps your curation**. |
| Writing sources | [`content/portfolio.yaml`](content/portfolio.yaml) `writingSources` — **⟳ Sync feeds** (button + weekly cron) pulls **Substack / Medium / any RSS** server-side; **LinkedIn / X** are login-walled so the in-browser harvest surfaces as *Sync from LinkedIn*. Add a source by telling the agent (`addWritingSource`). |
| Section order / visibility / labels, theme, articles | [`content/portfolio.yaml`](content/portfolio.yaml) |
| The whole site config (advanced) | [`content/instances/portfolio.ts`](content/instances/) |

Theming is a **token seam**: components read `text-ink`/`bg-surface`/`accent` etc., mapped in
`tailwind.config.ts`; `app/themes.css` has 9 `[data-theme]` brand bodies. A new brand = one CSS block,
zero component edits. Live theme switcher included.

## 🚀 Deploy (free)

1. Import your fork at [vercel.com/new](https://vercel.com/new).
2. Set the environment variables below.
3. Deploy. Then open `/network` and **Join** with your new URL.

| Env var | Needed for | Notes |
|---|---|---|
| `GROQ_API_KEY` (or `GEMINI_API_KEY` / `OPENAI_API_KEY` / `NVIDIA_API_KEY`) | the chat agent **and** `/make` portfolio generation | at least one; free tiers work. Server-side only — never `NEXT_PUBLIC_*`. |
| `POSTGRES_URL` (or `DATABASE_URL`) | durable + **shared** hosting: `/make` → `/p/<slug>`, the Network registry, TRUE standing, the referral tree | a free Neon/Vercel Postgres. Without it, `/make` hands back a downloadable pack instead of hosting. |
| `NEXT_PUBLIC_SITE_URL` | share **thumbnails** unfurling on X/LinkedIn/Slack | your production URL, e.g. `https://your-app.vercel.app`. Falls back to Vercel's auto URL. |
| `PORTFOLIO_OWNER_TOKEN` | locking edits/owner routes to you | optional but recommended. The real security boundary. Forgot it? The 🔒 badge's prompt, left blank, emails you a magic link (needs the Resend keys below; sent to `PORTFOLIO_OWNER_EMAIL`, defaulting to your profile email). |
| `CRON_SECRET` | the daily **auto-sync** (`vercel.json` cron → `/api/sync`) | optional. Vercel sends it as a Bearer token to the cron path; without it the scheduled sync is disabled. (`SYNC_SECRET` does the same for the GitHub Action alternative.) |
| `RESEND_API_KEY` + `RESEND_FROM` | **email-based owner recovery** — a lost hosted owner link (`/api/recover`) *and* the root site's forgotten passphrase (`/api/owner/recover`) — plus feedback **ship notices** | optional. A free [Resend](https://resend.com) key + a verified `from` address. Without it, recovery degrades honestly: hosted → "re-make with the same name + email"; root → reset `PORTFOLIO_OWNER_TOKEN` in the hosting env. Ship notices are skipped honestly. |
| `FEEDBACK_SECRET` | the weekly **feedback digest** cron (`.github/workflows/feedback-digest.yml` → `/api/feedback/digest` + `/notify`) | optional. Also set it as a repo secret (with the `PORTFOLIO_URL` repo variable) so the Action can run the digest without the owner token. |

CLI alternative (after `vercel link`): `printf '%s' "<value>" | vercel env add GROQ_API_KEY production` (repeat per var), then `vercel --prod`.

## Architecture in one pass

- **`content/`** — your data (`profile.ts`, `projects.json`, `portfolio.yaml`, `instances/*`).
- **`app/page.tsx`** reads the data, builds the agent's grounding, and renders `<CopilotProvider><Portfolio/></CopilotProvider>`.
- **`packages/core/`** — the framework-agnostic contract (`InstanceConfig`, the registry model). Imported via `@core/*`.
- **`app/api/`** — the LLM route (key stays server-side), the A2A endpoint, and the **network registry + badge**.
- **`lib/voice/`** — a portable, dependency-free speech module.

## 🏛 The TRUE Society (invite-only)

Using this repo invites you to apply to a **selective builders' society** governed by the **TRUE** covenant —
*Transferable & Transformative · Reusable & Refinable · Understandable & U-loop (Theory U) · Experienceable &
Experimentable* — for humans **and** their agents (skill / plugin / workflow / hook). Standing is *earned*
from real artifacts, not granted; passivity forfeits it; every complaint becomes a 10X you own. See **`/society`**.

**Contribution compounds — the TRUE Merit + TRUE Hero Award.** `/society` spells out the payoff: you earn
**TRUE Merit** (an honorable, *non-transferable* reputation credit — it's your standing itself, never a coin you
buy or trade) by peer-attested contribution — referring someone who ships, contributing to another's portfolio,
feedback that's acted on, collaborating, teaching. Higher standing unlocks a **benefits ladder** (verified badge →
leaderboard + network matchmaking → spotlight + invite-only events; sponsor-backed compute/tickets/referrals as the
network grows), and the **quarterly TRUE Hero Award** honors the top contributor on each TRUE perspective, computed
from the standing ledger. Earned, never bought.

**Your standing = your leverage.** On `/society`, paste your portfolio URL and *check your standing*: it's
**measured, not claimed** — computed in code (`packages/core/src/society-types.ts`) from observed signals (is
your portfolio live? does it expose an A2A agent card with skills? does it teach?) plus reputation-weighted
vouches, with passivity decaying it automatically. The score maps to a **leverage multiplier (1×–10×)** — how
much AI + trusted people you can mobilize to *make any dream true in a fraction of the time & effort, backed
by people who trust you via the TRUE contract*. Rise a tier (applicant → member → steward → fellow) by
shipping, teaching, and lifting others — the `gaps` tell you exactly what to build next.

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: new `[data-theme]` brands, new
instance verticals (`content/instances/`), and network features.

MIT licensed. Built to be forked.
