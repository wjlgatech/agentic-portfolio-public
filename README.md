<div align="center">

# 🌐 agentic-portfolio

### An open-source portfolio that is *itself an agent* — and joins a self-propelling network of other agent-portfolios.

**Fork it. Fill in your content. Deploy for $0. Your site now has an on-page AI agent (grounded in
your own material) and an A2A agent card, so other people's agents can discover and query yours.**

[See it live](#-see-it-live--then-make-your-own) · [Quick start](#-quick-start) · [The Network](#-the-network-the-reason-to-join) · [Make it yours](#-make-it-yours) · [Deploy](#-deploy-free) · [Contributing](CONTRIBUTING.md) · MIT

</div>

---

## ▶ See it live — then make your own

**A real, interactive example — open it and chat with the agent:**
### 👉 [Paul Jialiang Wu's agentic portfolio ↗](https://agentic-portfolio-lovat.vercel.app/)
Ask its on-page agent *"what has Paul built?"* or *"is he a fit for a staff ML role?"* — it answers grounded in his real work. It's also a live network node other agents query ([its A2A agent card ↗](https://agentic-portfolio-lovat.vercel.app/api/agent-card)).

| See it | Open | What to try |
|---|---|---|
| 🧑‍💻 **A live portfolio** | [agentic-portfolio-lovat.vercel.app ↗](https://agentic-portfolio-lovat.vercel.app/) | Chat with the agent; open **Receipts** (claims audited against public GitHub). |
| 🌐 **The network** | [/network ↗](https://agentic-portfolio-lovat.vercel.app/network) | Browse agent-portfolios; ask one question and every node's agent answers. |
| ✨ **Make your own** | **`/make`** — live once you [deploy this repo (~2 min)](#-deploy-free) | Give **name + email + your résumé _or_ just your LinkedIn URL** → your own live portfolio in the same style, customized to you. |

**The whole idea in one line:** open the example above → like it? → go to `/make`, paste **a portfolio you want yours to look like** (e.g. `https://agentic-portfolio-lovat.vercel.app/`) plus **your résumé or LinkedIn link** → in ~60s you have your own agentic portfolio in that style, customized to you, on the network. No code.

---

## What this is

A **Next.js 15 + CopilotKit** site where the content *is* the source of truth and an on-page agent
answers questions about you — grounded in `content/*`, backed by a **free-LLM survival chain** so it
runs at **$0**. It's also a **node on a network**: every site exposes an [A2A](https://a2a.dev) agent
card at `/.well-known/agent-card.json`, so agents (and people) can find and query it. One deploy = the
portfolio; set the `INSTANCE` env var and the *same code* renders a whole other business (a dentist, an
agency, a learning center…) from a data pack.

## ✨ Make yours in one click (no code)

Not a developer? Go to **`/make`**: type your name + email, and **either paste a few lines of your résumé OR
give your LinkedIn profile URL** — click once, and you get a **live portfolio with its own AI agent**, hosted on
the shared network at `/p/<you>`. No fork, no deploy. Recruiters can just *ask your agent* about you.

> **LinkedIn auto-fill** reads only your **public** profile metadata (the same info Google sees — no login, we
> never post as you). LinkedIn sometimes blocks server reads from datacenter IPs; if so, your portfolio is a
> starter and you just paste a few lines to enrich it. Hosting the shared `/make` needs an LLM key + a Postgres/Neon
> store on the deploy (see [Deploy](#-deploy-free)); without them it hands back a downloadable pack.

**You own your page.** When you make a portfolio you get a **private owner link** (`/p/<you>?owner=…`) — save it.
Open it and you're in **🔓 Owner mode**: manage your portfolio and ask your agent to *show your leads* (everyone your
agent captured). Everyone else is a **🔒 visitor** — they can chat with your agent and it can capture *their* interest,
but only you can read your pipeline. Each portfolio has its own owner key; no one can see anyone else's.

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

## 🎨 Make it yours

All copy is **data-driven** — never hardcoded in components. Edit these:

| To change… | Edit |
|---|---|
| Name, tagline, mission, values | [`content/profile.ts`](content/profile.ts) |
| Projects shown | [`content/projects.json`](content/projects.json) |
| Section order / visibility / labels, theme, articles | [`content/portfolio.yaml`](content/portfolio.yaml) |
| A whole other business ("agentize" any vertical) | add a pack in [`content/instances/`](content/instances/) + set `INSTANCE=<slug>` |

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
| `PORTFOLIO_OWNER_TOKEN` | locking edits/owner routes to you | optional but recommended. The real security boundary. |

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
