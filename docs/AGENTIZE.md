# Agentize — one core, any business

This portfolio is **instance #0** of a meta-template. The thesis: a church, a climbing gym, a
restaurant, a learning center, an SEO agency, a trading school, and an R&D lab all need the *same*
machine — an entity with an on-page agent that answers grounded + honest, can be edited by talking
to it, proves itself with real evidence, scouts what's next, and federates with its peers. The only
thing that differs between them is **data**.

So we don't fork the code per business. We snap a **vertical pack** onto the existing bricks.

```
                      ┌─────────────── THE CORE (this codebase, unchanged) ───────────────┐
   vertical pack  →   │  owner gate · free-LLM survival chain · A2A card + /api/a2a ·      │
   (just data)        │  registry + federated fan-out · theme token seam · Receipts ·      │
                      │  Compass scout · KV durability · /api/health · rate-limits         │
                      └────────────────────────────────────────────────────────────────────┘
        ▲                                         ▲
   content/instances/learning-center.ts     content/instances/portfolio.ts   (instance #0)
```

## The Lego contract

`lib/instance-types.ts` defines `InstanceConfig` — the studs every pack must have, each mapping 1:1
onto a brick the core *already ships*:

| Stud (in the pack) | Snaps onto (existing brick) | What changes per vertical |
|---|---|---|
| `entity` | replaces `content/profile.ts` | name/tagline/blurb/links of the business |
| `story` | the mission + principles ("why") section | the entity's mission and operating principles |
| `theme` | the token seam (`app/themes.css`) | one of 9 brand bodies — rebrand = a string |
| `agent.skills` | the A2A card (`/api/agent-card`) + `/api/a2a` | the skills a *caller's* agent would invoke |
| `agent.grounding` | the copilot + A2A honesty rule | identical-in-spirit: grounded, honest, private-safe |
| `sections` | `content/portfolio.yaml` control surface | which sections, in what order (built-in + custom) |
| `proof` | **Receipts**, recast | `claim`→`student outcome`/`trade`/`engagement`; the audited NOUN |
| `scout` | **Compass**, recast | `collaborators`→`cohorts`/`leads`/`inventory`; drafts, never sends |
| `network` | registry + A2A federation | discoverability + which peers to register with |
| `owner` | the owner gate (`lib/owner.ts`) | which env var holds the secret (the real boundary) |
| `storage` | KV (`lib/storage.ts`) | a key prefix, so many instances share one durable store |

`validateInstance(raw)` is the **fit-check**: a pack either snaps on (`ok:true`) or is rejected with
the exact mis-fits (`errors[]`) — unknown theme, unknown vertical, missing skill, etc. A bad brick
never snaps on silently. `instanceToAgentCard(config, origin)` proves the federation stud: *any*
valid instance becomes a spec-shaped A2A Agent Card with zero vertical-specific code, so every
business is instantly discoverable and queryable by other agents the moment it launches.

Covered by `scripts/test-instance.mjs` (in `npm test`): the live portfolio AND the learning-center
pack both validate, the card stud emits a spec card, and malformed packs are rejected.

## The five seed verticals (chosen for fit + value)

Picked because they sit on the builder's moat (AI engineering, own-your-data, verification ethic,
"teach what you build") AND are high-transaction-value / high-frequency / high-demand:

1. **Agentic Learning Center** *(shipped as the reference pack — `content/instances/learning-center.ts`)*
   Receipts→audited **student outcomes**; Compass→next **cohorts** & guest instructors; A2A skills a
   parent/student agent calls (`ask_program`, `verify_outcome`, `fit_check`).
2. **Marketing / SEO Agency** — Receipts→audited **case studies / ROI**; Compass→next **leads & channels**.
3. **Trading / Investing School** — Receipts→audited **track record** (honest `unverified` is the moat);
   Compass→next **setups**.
4. **AI Consulting Clinic** — the agent qualifies + books; Receipts→**prior engagements**.
5. **Engineering R&D Firm** — Receipts→**shipped artifacts / benchmarks**; Compass→next **bets & hires**.

The contract is open-ended: a 6th vertical (food truck, gym, church…) is a new `vertical` string +
a content pack, never a code change. `scripts/test-instance.mjs` validates a food-truck pack as a
third example to prove that.

## The properties the user asked for, and where they live

- **Lego / efficient** — one core, packs are data. New business = clone + fill `InstanceConfig`. No
  duplicated logic; fix a brick once and every instance inherits it.
- **Scalable** — stateless app + KV (`lib/storage.ts`); each instance namespaces its KV keys via
  `storage.kvPrefix`, so one store can back many instances without collision.
- **Safe** — the **owner gate** (`lib/owner.ts`) is the one security boundary (visitor → proposal,
  owner → apply); the LLM key stays server-side; open routes are rate-limited; the self-proof never
  rubber-stamps and the scout never auto-sends or invents people.
- **High network effects** — the registry (`/api/registry`) + federated fan-out (`/api/registry/ask`)
  + A2A cards turn isolated instances into a queryable network. Cross-vertical referrals fall out of
  it: a gym's agent can ask a physio clinic's agent; an academy can route a student to a partner.
- **Self-aware** — `/api/health` reports providers, owner-gating, durability per instance.
- **Self-healing** — the free-LLM survival chain + `chatWithFailover()` (a throttled provider fails
  *over*, not the request); KV-over-seed and read-only-fs→localStorage degrade instead of breaking.
- **Self-expanding** — the agent can add custom sections, import content, and register peers, so an
  instance grows itself; and the template grows by adding packs.
- **Self-improving** — Compass scouts the next move; fixing the shared core lifts every instance at
  once (the derivative is the product — 12X #10/#12).

## Selecting the active business

`content/instances/index.ts` exposes `getActiveInstance()` — it reads the **`INSTANCE`** env var
(default `portfolio`), validates the named pack, and falls back to the portfolio on an unknown or
invalid pack (warns, never 500s). So one codebase serves many businesses; which one is just an env var:

```bash
npm start                            # INSTANCE unset → the portfolio (the live site)
INSTANCE=learning-center npm start   # the 12X Agentic Academy — same code, different business
```

## Sequence

- **Done — the contract + proof:** `lib/instance-types.ts`, two reference packs (portfolio #0 +
  learning-center), `validateInstance`/`instanceToAgentCard`, a validation test in `npm test`.
- **Done — the federation stud, wired live:** `getActiveInstance()` (`content/instances/index.ts`) +
  `app/api/agent-card` building from it. Verified live: `INSTANCE=learning-center` serves the academy's
  A2A card (education skills), default serves the portfolio's (recruiter skills) — same code, no branches.
- **Done — per-instance content packs (`/api/a2a` answers AS the business):** `InstanceContent`
  (offerings/outcomes/writings) + `instanceEvidence()` / `instanceStaticAnswer()`. A non-portfolio instance
  with a `content` pack answers from its own corpus; the portfolio keeps the original path byte-identical.
  Verified live: `INSTANCE=learning-center` answered with the academy's 3 tracks + build-loop grading; the
  default answered with Paul's real repos — same endpoint. The academy's outcomes are deliberately
  `unverified` (the agent demonstrates the honesty discipline; a real operator swaps in audited results).
- **Done — the VISUAL site (the last instance-bound surface):** `components/InstanceSite.tsx` renders any
  non-portfolio instance as a full website (hero + principles + offerings + writing + outcomes) straight from
  its `InstanceConfig` + `content`; `app/page.tsx` branches to it (the portfolio keeps its own `<Portfolio>`,
  byte-identical). Instance-specific strings (agent labels, grounding, prompt-starters, `<title>`/OG) are
  passed via props so nothing leaks. Verified live: `INSTANCE=learning-center` is a real academy site with
  zero portfolio references. **All four instance surfaces — card, A2A identity, A2A corpus, visual page —
  are now instance-aware.**
- **Then:** a `create-agentize` scaffolder (clone → answer prompts → a filled pack), cross-instance
  registry auto-join on launch (`network.peers`), and per-instance section ITEMS (so a vertical can add its
  own custom card sections beyond the offerings/writing/outcomes blocks).
