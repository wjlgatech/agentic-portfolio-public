---
name: agentic-portfolio
description: >-
  Generate an agentic personal portfolio for any GitHub user — a Next.js + CopilotKit
  site whose on-page AI agent answers questions about the person's work, grounded in the
  repo's own content and powered by a FREE-LLM survival chain (NVIDIA NIM → Groq → Gemini
  → OpenAI), so it runs at $0. It pulls the user's active repos from the last 12 months
  (public AND private, IP-safe highlights for private), scaffolds mission/values/12X
  practices, and a self-updating LinkedIn-articles section. Use when someone wants to
  "build my portfolio", "make an agentic portfolio site", "turn my GitHub into a website",
  or "a personal site with an AI chat that knows my projects". Triggers on 'portfolio',
  'personal site', 'agentic portfolio', 'free-llm portfolio'. Reference build:
  github.com/wjlgatech/agentic-portfolio (the template this skill scaffolds).
argument-hint: "[github-login] [optional: repo-name]"
---

# /agentic-portfolio — build an agentic, free-LLM-powered portfolio for any GitHub user

This skill scaffolds the **`agentic-portfolio`** app (Next.js 15 App Router + CopilotKit +
the `/free-llm` survival chain). The reference implementation is
**github.com/wjlgatech/agentic-portfolio** — clone it as the template, then repopulate the
`content/` data for the target user. Everything personal is data; the app code is reusable
as-is.

## 0. Inputs & prerequisites

- **GitHub login** (e.g. `wjlgatech`). For private repos + highlights, run `gh auth status`
  — the user must be authenticated with `repo` scope. Public-only works without auth.
- `node >= 18`, `npm`, `gh`, `python3`.

## 1. Pull the active repos (last 12 months)

```bash
SINCE=$(python3 -c "import datetime as d;print((d.date.today()-d.timedelta(days=365)).isoformat())")
gh api -X GET 'user/repos?per_page=100&sort=pushed&affiliation=owner' --paginate \
  --jq ".[] | select(.pushed_at >= \"$SINCE\") | {name,private,fork,lang:.language,desc:.description,pushed:.pushed_at[0:10],stars:.stargazers_count,url:.html_url}" \
  > repos.ndjson
# For another user's PUBLIC repos: gh api "users/<login>/repos?per_page=100&sort=pushed" ...
```

Exclude forks (`fork: true`) and meta repos (`dotfiles`, an existing `portfolio`).

## 2. Curate into `content/projects.json`

For each kept repo emit `{name, category, highlight, featured, private, language, stars, pushed, url}`:
- **Category** — group into a small set (e.g. *Agentic OS · Frameworks & Tooling · AI
  Products · Faith/Family · Open Knowledge*); pick names that fit the user's actual work.
- **highlight** — one IP-safe line. For **private** repos: high-level only, and set
  **`url: null`** (never link or expose internals).
- **featured** — flag the ~15–18 strongest for the default view.

## 3. Fill `content/profile.ts` and `content/portfolio.yaml`

- `profile.ts`: name, tagline, **mission**, **values**, **love**, and the **12X Future
  Practices** (a dozen compounding disciplines). Draft from the user's bio + repo themes;
  mark clearly that it's theirs to edit.
- `portfolio.yaml`: the control surface — section order/visibility/labels, theme, and the
  **articles** list (start empty). The owner fills articles by *talking to the agent*
  ("add my LinkedIn article …") or by hand. LinkedIn is auth-walled — ask the user to
  paste their posts, or accept public article URLs and WebFetch each.
- Set `PORTFOLIO_OWNER_TOKEN` on the deploy so only the owner can apply agent edits
  (visitors stay view-only). Unset = un-gated local dev.

## 4. App code — copy from the template, don't rewrite

The reusable parts (identical for every user):
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `app/api/copilotkit/route.ts` + `lib/llm.ts` (the free-LLM chain — key server-side only)
- `components/Copilot.tsx`, `components/Projects.tsx`, `components/Articles.tsx`
- configs: `package.json` (pin Next to a patched 15.x), `tailwind.config.ts`, `tsconfig.json`,
  `postcss.config.mjs`, `.env.example`

## 5. Verify, then ship

```bash
npm install && npm run build      # must be GREEN before pushing
gh repo create <login>/<repo-name> --public --source=. --remote=origin --push
```

Then deploy on Vercel (import repo → add one free key, e.g. `NVIDIA_API_KEY` → deploy).

## Guardrails

- **Never leak private IP.** Private repos: highlight only, `url: null`.
- **Key stays server-side.** Only `app/api/copilotkit/route.ts` reads the LLM key.
- **Free tiers first.** Keep the `lib/llm.ts` order NIM → Groq → Gemini → paid.
- **Build must be green** before any push. Report the build status honestly.
- **Human-gate the repo push** unless the user has said "create & push".
