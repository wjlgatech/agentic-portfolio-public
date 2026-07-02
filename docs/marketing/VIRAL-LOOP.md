# The closed viral-marketing loop — loop engineering applied to marketing

The same closed-loop discipline the codebase uses for features (draft → test → human
gate → ship → observe → improve), pointed at media content. Installed as the
`/viral-loop` agent skill; this file is the repo-side spec so any agent or human can run
it. See `media/infographic-viral-loop.png` for the visual.

## Hard rules

1. **Draft, never send.** No auto-posting, auto-DM, auto-comment, auto-reply — not via
   API, not via browser automation. LinkedIn/X ToS prohibit it; the brand ("privacy is
   the product", drafts-never-sends) prohibits it twice. Output = paste-ready copy and
   1-click share-intent URLs the human clicks.
2. **No invented facts.** Every claim traces to the product, the repo, or a real
   citation; illustrative stories are framed as illustrative.
3. **Metrics are computed, never claimed.** The ledger holds numbers a human pasted
   from platform analytics; derived rates are arithmetic. (Same rule as the product: K
   from `/api/growth` is computed in code.)
4. **Learnings must be earned.** A rule enters `LEARNINGS.md` only with ≥3 posts of
   evidence (cited by id); below that it's a hypothesis with a named next test.

## The six stages

| # | Stage | Who | What happens |
|---|---|---|---|
| 1 | **MAKE** | auto | Read `LEARNINGS.md` first (active rules constrain the draft). Draft the artifact + per-platform copy (X ≤280 w/ URL@23, LinkedIn, YouTube, IG), one hook, one ask, grounded in the real repo/product. Visuals match the brand card language (`lib/og.tsx`); chart palettes validated (dataviz method). |
| 2 | **AUTO-REVIEW** | auto | Score 1–5 on hook / specificity / honesty / CTA / platform-fit; iterate until avg ≥4.0 (max 3 revisions). Report the scorecard honestly — never inflate. |
| 3 | **HUMAN GATE** | 🔑 human | The human reads the final draft + scorecard + assets, edits, and approves or kills. Nothing proceeds without an explicit go. |
| 4 | **PUBLISH + ENGAGE** | assisted | Paste-ready copy + share-intent links; the human posts. Incoming comments (pasted in) each get a drafted reply in the owner's voice — answer, thank, never argue, route qualified people to `OUTREACH.md`'s DM flow. **The human sends.** |
| 5 | **MEASURE** | auto | Append a `ledger.md` row at a consistent checkpoint (48h): impressions, reactions, comments, shares, clicks, makes. Compute rates in code/arithmetic. Record K from `GET /api/growth` when relevant. |
| 6 | **LEARN** | auto | Compare vs the ledger; extract ≤2 lessons (RULE if n≥3, else HYPOTHESIS + the concrete next test). Prune contradicted rules. Next MAKE starts from the updated rules — the loop compounds. |

## Relationship to the product's own loops

This is the marketing instance of the same pattern the repo already ships:

- **feedback→feature loop** (`/api/feedback` → weekly digest → human-gated build → ship
  notice) — users' words in, features out.
- **viral growth loop** (`?ref=` edges → `growthStats()` K) — artifacts as invites,
  measured in code.
- **viral-marketing loop** (this) — content out, engagement in, lessons banked.

All three close on measurement, keep a human at the irreversible step, and never touch
a contact list.
