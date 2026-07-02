# docs/marketing — everything that promotes the project, in one place

Loop engineering applied to marketing: content is drafted and reviewed by machines,
**published and replied to by a human**, then measured and learned from — so every post
starts smarter than the last. The privacy-first growth rules (AGENTS.md) apply here in
full: no auto-posting, no contact harvesting, no invented facts, metrics computed never
claimed.

| File | What it is |
|---|---|
| [`VIRAL-LOOP.md`](VIRAL-LOOP.md) | **The closed viral-marketing loop** — MAKE → AUTO-REVIEW → HUMAN GATE → PUBLISH+ENGAGE → MEASURE → LEARN. The operating manual (also installed as the `/viral-loop` agent skill). |
| [`OUTREACH.md`](OUTREACH.md) | The founder outreach playbook — onboard the first 10 by hand: ICP + fit-score, wedge post, DM template, sourced target list, drafts-never-sends agent. |
| [`POST-RESUME-IS-DEAD.md`](POST-RESUME-IS-DEAD.md) | The long-form LinkedIn article ("The Résumé Is Dead. Long Live the Living Portfolio.") — story + real citations + the 10-minute CTA. |
| [`ledger.md`](ledger.md) | **The metrics ledger** — one row per published artifact; rates computed from pasted platform numbers, never estimated. |
| [`LEARNINGS.md`](LEARNINGS.md) | **Banked lessons** — rules (n≥3 posts of evidence) the next draft must obey + hypotheses to test next. The compounding half of the loop. |
| [`media/`](media/) | The share assets: `article-thumbnail.png` (1200×628) + three infographics (1080×1350, LinkedIn portrait). Sources are HTML art-boards in `media/src/`; re-render with `node docs/marketing/media/src/render.mjs` (Playwright, 2×). Palette validated for contrast + CVD on the dark brand surface. |

## The loop in one glance

```
MAKE (auto) → AUTO-REVIEW (rubric ≥4/5) → 🔑 HUMAN GATE → PUBLISH+ENGAGE (assisted)
     ↑                                                            ↓
   LEARN (auto) ←──────────── MEASURE (auto, real numbers) ←──────┘
```

**The hard rule:** machines draft, review, measure, and learn. A human owns Send —
always. Auto-posting/auto-DM/auto-reply bots violate platform ToS and the brand.
