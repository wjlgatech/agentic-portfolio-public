# Split & Network Strategy — Agentize as a platform, the portfolio as a node

> First-principles memo. Decision: **separate concerns now (monorepo), repos later — and the
> network is the reason the platform must be its own thing.**

## 1. Why separate, and in what order

**Agentize is a platform; agentic-portfolio is one node on it.** A website doesn't own DNS.
Today the network/platform code (the InstanceConfig contract, registry, A2A federation, storage, the
survival LLM chain) lived *inside* "agentic-portfolio" — backwards. The portfolio should be a *peer*.

But a full two-repo split **now** is premature: today the platform is only the *contract + a weak
generic renderer*, while the rich capabilities (Receipts/proof, Compass/scout, the mindmaps, LinkedIn
import, the agent-editable layout) are portfolio-coupled. Split now → a thin platform + a rich vertical
+ permanent sync tax.

**Sequence — separate *concerns* before *repos*:**

1. **Monorepo with hard boundaries (in progress).** `packages/core` (the platform: contract → then
   storage, LLM chain, registry/A2A, trust, capability registry) consumed by the app. *This doc ships
   with the first slice: the pure contract layer (`instance-types` + the registry/verification/compass
   models) extracted to `packages/core`, imported via the `@core/*` alias.* The Next app stays at the
   repo root for now so the **Vercel deploy is unchanged**.
2. **Modularize the rich features into opt-in core modules** (Proof, Scout, Mindmap, Import, AgentEdit).
   The portfolio becomes a *thick* instance that opts into modules; a law firm opts into a different
   set. Only then is Agentize valuable (a module library, not a husk).
3. **`create-agentize` scaffolder** — clone → fill `InstanceConfig` → deploy. Adoption friction → 0.
4. **Repo split** when external contributors need core independently, release cadences diverge, or
   governance demands it. The portfolio stays the flagship reference node. (This is also where the Next
   app moves to `apps/portfolio` and the Vercel **Root Directory** is reconfigured — a deploy change,
   hence last.)

## 2. REAL network effects — first principles

A network effect is real only when **value to each node rises with N**, the connection gives something
a node **cannot get alone**, and **it compounds**. A *directory* (what the registry is today) is linear
— a phonebook. A *network* is superlinear: nodes **transact and co-improve through it**, and every
interaction leaves a **persistent, compounding trace** (reputation, adopted capability, referral history).

**The scarce, compounding asset:** in an age where producing claims/content/agents is ~free, the scarce
thing is **verified trust** and **proven capability**. A network that makes *both transferable between
agents* is what compounds — and it's *defensible*, because trust can't be faked at scale (verification
is the moat — already the "verify, don't vibe" ethic + Receipts).

**The law to build to:**

> A node's value ≈ **(its verifiable trust) × (the capability it can borrow) × (the liquidity of
> counterparties it can reach).** All three rise with N → superlinear.

Three compounding loops, each grounded in primitives that already exist:

- **Trust loop (the moat).** Generalize Receipts: every node's claims are verifiable against real
  artifacts, and nodes **vouch** for each other (vouches verifiable/staked) → a web-of-trust. More nodes
  → a richer, more-checkable trust graph → every node is *more* credible *because* it's on the network.
- **Capability loop (the "common-seminal tooling").** A node invents a better skill/workflow/hook →
  **publishes** to a capability marketplace → others adopt → improve → republish. The network gets
  *smarter as it grows*; each node free-rides on collective improvement. ("Compose OSes" + "build in
  public" + "multiply others" as a mechanism.)
- **Demand loop (liquidity).** Agent-mediated **referral & matchmaking** with a **referral ledger +
  reciprocity**: a dentist's agent routes an oral-surgery request to a surgeon node; a portfolio agent
  routes a Rust-role query to a Rust-dev node. Each new node = more counterparties for all.

**What makes them *propel one another*: shared measurement.** Every node sees its trust score, referral
in/outflow, adopted-capability count, and **profit attributable to the network**, plus **comparative
intelligence** ("your conversion is at the 60th percentile of agency nodes" — you can't benchmark
yourself alone). When a node *sees* the network makes it more profitable, it stays and recruits — the
viral loop, "measure the slope" applied to the network.

## 3. The honest hard parts (blind spots, named)

- **Cold-start / liquidity.** Seed **one dense cluster** first (your AI-engineer circle, or one vertical
  in one city) — never broad. "Come for the tool, stay for the network": each instance must be valuable
  **solo** (the portfolio already is); the network is upside.
- **Sybil / trust-gaming.** A reputation system with no cost to lie gets attacked. Anchor trust to
  **costly-to-fake artifacts** (GitHub, domains, licenses); make vouches **consequential** (stake/slash,
  reputation-weighted).
- **Referral incentive.** Why refer to a near-competitor? Reciprocity + reputation + value-exchange
  (referral credit). Design the incentive; altruism doesn't scale.
- **Business model that protects the effect.** Keep the **solo tool free/open** (maximize N → maximize
  moat); monetize the **network layer** (verified badges, matchmaking priority, analytics, a small cut
  of network-mediated transactions). Charging for the solo tool throttles the very N that creates the moat.

## 4. The endgame

Each entity has an agent that 24/7 **represents** it — markets, qualifies, refers, negotiates,
collaborates, learns — and the platform is **where these agents meet**. "100k portfolios" becomes
"100k agents transacting." The value of *your* agent rises with how many *other* agents it can
productively interact with: the phone-network effect, for autonomous economic agents, anchored by
verifiable trust.
