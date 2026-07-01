// ─────────────────────────────────────────────────────────────────────────────
// practices-map.ts — the 1 → 3 → 12 structure behind the "12X Future Practices"
// mindmap. PURE data (no fs), so the client mindmap + a plain-Node test both import it.
//
// 1 root ("How I compound") → 3 clusters (Aim / Loop / Compound) → 12 practices.
// Each practice must pass the TRUE test, shown on click:
//   T — Transferable & Transformative
//   R — Reusable & Refinable
//   U — Understandable & U-loop (Theory U, the MIT sense→presence→realize model)
//   E — Experienceable & Experimentable
// …for a HUMAN (you) AND for an AGENT (as a skill / plugin / dynamic workflow / hook).
// The practice names/bodies live in content/profile.ts (futurePractices); this maps each
// `n` to its cluster + TRUE detail.
// ─────────────────────────────────────────────────────────────────────────────

export type TrueKey = "T" | "R" | "U" | "E";
export type TrueFacets = Record<TrueKey, string>;
export type PracticeDetail = { facets: TrueFacets; human: string; agent: string };
export type PracticeCluster = { id: string; glyph: string; label: string; gist: string; ns: number[] };

export const TRUE_LEGEND: { key: TrueKey; title: string }[] = [
  { key: "T", title: "Transferable & Transformative" },
  { key: "R", title: "Reusable & Refinable" },
  { key: "U", title: "Understandable & U-loop" },
  { key: "E", title: "Experienceable & Experimentable" },
];

export const CLUSTERS: PracticeCluster[] = [
  { id: "aim", glyph: "①", label: "Aim", gist: "set the 12X target & the base case", ns: [1, 10, 11] },
  { id: "loop", glyph: "②", label: "Loop", gist: "the self-improving engine", ns: [2, 4, 9, 12] },
  { id: "compound", glyph: "③", label: "Compound", gist: "multiply & open", ns: [3, 5, 6, 7, 8] },
];

export const PRACTICE_DETAILS: Record<number, PracticeDetail> = {
  // ── ① Aim ──
  1: {
    facets: {
      T: "A 10x-not-10% target transfers to any domain and forces a different machine, not just more effort.",
      R: "Re-aim every cycle; the target is a dial you raise as the loop converges.",
      U: "Incremental goals fit incremental thinking — pick one your current method literally can't reach.",
      E: "Write the 12X version of a goal beside the 12% one and feel which demands a new system.",
    },
    human: "You pick the audacious number and let it redesign the plan.",
    agent: "A skill that reframes any goal as its 12X version + names the capability gap to close it.",
  },
  10: {
    facets: {
      T: "Rate-of-improvement is a metric that transfers across projects, people, and agents.",
      R: "Re-measure each cycle; the slope itself is the thing you refine.",
      U: "Track the derivative (how fast you improve), not the value (where you are today).",
      E: "Log a score every iteration and watch the trend line, not the snapshot.",
    },
    human: "You judge progress by acceleration, not by today's number.",
    agent: "A hook that records each run's score so the agent reports its own learning curve.",
  },
  11: {
    facets: {
      T: "Anchoring ambition in the people you love transfers meaning to every other practice.",
      R: "Returned to daily; the base case is re-affirmed, not outgrown.",
      U: "Recursion needs a base case — the value that stops the optimization from eating you.",
      E: "Name who the compounding is FOR before you start; revisit when it drifts.",
    },
    human: "You ground the 12X in faith + family so the slope stays worth climbing.",
    agent: "A guardrail hook: surface the 'why / for-whom' before a high-stakes autonomous action.",
  },
  // ── ② Loop ──
  2: {
    facets: {
      T: "Generate → judge → refactor → re-judge transfers to code, writing, learning — anything.",
      R: "It IS the reuse engine: every pass refines the last.",
      U: "A launch is a point, a loop is a slope — never ship what you can't re-run.",
      E: "Add a judge + a re-run to any task and watch quality climb.",
    },
    human: "You stop shipping one-offs and start running cycles.",
    agent: "A dynamic workflow: produce → evaluate → revise until a gate passes.",
  },
  4: {
    facets: {
      T: "Probing each rung transfers to any chain of claims or steps.",
      R: "A reusable check you run every time; refine it as you learn its blind spots.",
      U: "A chain of unverified steps is theater — an honest ❌ beats a fake ✅.",
      E: "Pick one claim and try to disprove it before believing it.",
    },
    human: "You demand evidence at your own altitude, not the label.",
    agent: "A skill/hook that adversarially checks an output before it's accepted.",
  },
  9: {
    facets: {
      T: "A provider-agnostic survival chain transfers to any LLM-backed system.",
      R: "Reused across every agent; refine the chain order for correctness + cost.",
      U: "Cost + rate limits kill loops — wire a free fallback so the loop never starves.",
      E: "Pull your key and confirm the app fails over, not falls over.",
    },
    human: "You keep building even at $0, never blocked by a quota.",
    agent: "A plugin: route calls through a failover chain (Groq → Gemini → NIM → OpenAI).",
  },
  12: {
    facets: {
      T: "Turning the loop on the loop transfers to any improvement process.",
      R: "The ultimate reusable: the system that upgrades its own upgrader.",
      U: "Second-order beats first-order — improve the thing that improves things.",
      E: "After a cycle, ask 'what would make the NEXT cycle better?' and do that.",
    },
    human: "You invest in better tools-for-making-tools, not just outputs.",
    agent: "A meta-workflow that critiques + edits its own prompts/skills between runs.",
  },
  // ── ③ Compound ──
  3: {
    facets: {
      T: "Designing surfaces an agent can drive transfers to every product you build.",
      R: "A reusable interface contract; refine it as agents get more capable.",
      U: "Build for an agent operator, not just a human clicker.",
      E: "Try to drive your own feature end-to-end via an API / agent.",
    },
    human: "You design so a human OR an agent can run it.",
    agent: "The app exposes actions/skills so an agent can operate it natively.",
  },
  5: {
    facets: {
      T: "Local, user-owned data transfers sovereignty to any app.",
      R: "A reusable zero-trust pattern; refine what stays local vs shared.",
      U: "The most personal layer stays private-by-default — power should be private.",
      E: "Move one sensitive flow into the user's own browser/device.",
    },
    human: "You keep your most personal data local and owned.",
    agent: "An in-user-session tool (extension/hook), not a credential-borrowing server.",
  },
  6: {
    facets: {
      T: "Open engines transfer — others stand on them and extend your substrate.",
      R: "Reused by the community; refined by their PRs + issues.",
      U: "Knowledge wants to be stood upon — ship the engine, not just the demo.",
      E: "Open-source one component and watch what others build on it.",
    },
    human: "You default to transparency so compounding is shared.",
    agent: "Publish skills/plugins other agents can discover + call (A2A, registries).",
  },
  7: {
    facets: {
      T: "Substrates (not apps) transfer — many capabilities snap onto one base.",
      R: "The OS is reused by every capability; refine the substrate, lift them all.",
      U: "Don't build apps, build OSes — a base many things plug into.",
      E: "Factor a repeated pattern into a shared substrate + plug two things in.",
    },
    human: "You build platforms, not one-offs.",
    agent: "A plugin SDK/host so skills + workflows compose on one runtime.",
  },
  8: {
    facets: {
      T: "Teaching transfers mastery — a cohort, a course, a kid at the table.",
      R: "A reusable curriculum; refined every cohort by what students miss.",
      U: "Multiplying others is the highest-leverage loop you can run.",
      E: "Teach one thing you built this week and see what breaks.",
    },
    human: "You raise students, founders, and your two sons as wealth-creators.",
    agent: "A learning workflow: the agent explains, quizzes, and adapts to the learner.",
  },
};

// All practice numbers, grouped — used by the test + the mindmap to guarantee the 3 clusters
// cover exactly the 12 with no gaps or overlaps.
export const ALL_PRACTICE_NS = CLUSTERS.flatMap((c) => c.ns);
