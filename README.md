<div align="center">

# 🌐 agentic-portfolio

### An open-source portfolio that is *itself an agent* — and joins a self-propelling network of other agent-portfolios.

**Fork it. Fill in your content. Deploy for $0. Your site now has an on-page AI agent (grounded in
your own material) and an A2A agent card, so other people's agents can discover and query yours.**

[Quick start](#-quick-start) · [The Network](#-the-network-the-reason-to-join) · [Make it yours](#-make-it-yours) · [Deploy](#-deploy-free) · [Contributing](CONTRIBUTING.md) · MIT

</div>

---

## What this is

A **Next.js 15 + CopilotKit** site where the content *is* the source of truth and an on-page agent
answers questions about you — grounded in `content/*`, backed by a **free-LLM survival chain** so it
runs at **$0**. It's also a **node on a network**: every site exposes an [A2A](https://a2a.dev) agent
card at `/.well-known/agent-card.json`, so agents (and people) can find and query it. One deploy = the
portfolio; set the `INSTANCE` env var and the *same code* renders a whole other business (a dentist, an
agency, a learning center…) from a data pack.

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
2. Add one free LLM key (e.g. `GROQ_API_KEY`). Optional: `PORTFOLIO_OWNER_TOKEN` to lock editing to you;
   a Postgres/Neon store to make Network joins durable + shared.
3. Deploy. Then open `/network` and **Join** with your new URL.

## Architecture in one pass

- **`content/`** — your data (`profile.ts`, `projects.json`, `portfolio.yaml`, `instances/*`).
- **`app/page.tsx`** reads the data, builds the agent's grounding, and renders `<CopilotProvider><Portfolio/></CopilotProvider>`.
- **`packages/core/`** — the framework-agnostic contract (`InstanceConfig`, the registry model). Imported via `@core/*`.
- **`app/api/`** — the LLM route (key stays server-side), the A2A endpoint, and the **network registry + badge**.
- **`lib/voice/`** — a portable, dependency-free speech module.

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: new `[data-theme]` brands, new
instance verticals (`content/instances/`), and network features.

MIT licensed. Built to be forked.
