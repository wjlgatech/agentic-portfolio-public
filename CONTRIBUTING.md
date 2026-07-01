# Contributing to agentic-portfolio

Thanks for building the agentic web with us. This project is meant to be forked, remixed, and improved.

## Ground rules (what keeps it good)

- **Content is data, never hardcoded.** Copy lives in `content/*`; components read it. Don't bake a
  name/tagline into a component.
- **The LLM key stays server-side.** It only ever lives in `app/api/copilotkit/route.ts` (via `lib/llm.ts`).
  Never `NEXT_PUBLIC_*` a provider key. Open LLM/GitHub routes must stay rate-limited.
- **Free-first LLM chain.** Keep the free providers (Groq/Gemini/NVIDIA) ahead of paid ones — the project
  runs at $0 by design.
- **Honesty over hype.** If a feature makes a claim, it should be able to show its work. Prefer
  `unverified` to a fabricated result.
- **Theme via tokens.** New brand = one `[data-theme]` block in `app/themes.css`, zero component edits.

## Dev loop

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # the real gate — must stay green
npm test             # pure-logic unit tests (add one when you add pure logic)
```

## Good first contributions

- **A new brand theme** — add a `[data-theme="yourbrand"]` block to `app/themes.css` + the id to
  `tailwind.config.ts`.
- **A new instance vertical** — a data pack in `content/instances/` (see the examples) renders a whole
  new kind of site with zero code. Or drop a JSON pack at `content/instances/<slug>.json`.
- **Network features** — anything on `/network` that makes joining more valuable (better search, richer
  A2A fan-out, reputation, matchmaking). This is where the compounding lives.

## PRs

1. Fork, branch, and keep `npm run build` + `npm test` green.
2. Describe *what changed and why* (one paragraph is fine). Screenshots/GIFs for UI.
3. Small, focused PRs merge fastest.

By contributing you agree your contributions are MIT-licensed.
