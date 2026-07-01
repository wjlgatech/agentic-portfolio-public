// ─────────────────────────────────────────────────────────────────────────────
// profile.ts — the single source of truth for everything personal on this site.
// 👉 THIS IS A TEMPLATE. Replace the placeholder values below with your own.
// Edit THIS file to update the hero, mission, values, and the 12X practices.
// (Projects come from projects.json; articles + layout from portfolio.yaml.)
// ─────────────────────────────────────────────────────────────────────────────

export const profile = {
  name: "Your Name",
  handle: "yourhandle",
  tagline: "What you do · in a few sharp words",
  blurb:
    "One or two sentences on what you build and why. This is the hero blurb your on-page agent " +
    "answers from — keep it true, specific, and yours. Replace this whole file with your own story.",
  location: "Your City",
  links: {
    github: "https://github.com/yourhandle",
    linkedin: "https://www.linkedin.com/in/yourhandle/",
    email: "you@example.com",
  },
} as const;

// ── Mission ──────────────────────────────────────────────────────────────────
export const mission =
  "Make human flourishing compound. I turn frontier AI into operating systems that let " +
  "individuals, families, and companies improve themselves 12X — self-correcting loops that " +
  "get better every cycle, owned by the people they serve, built transparently so others can " +
  "stand on them.";

// ── Values ───────────────────────────────────────────────────────────────────
export const values: { title: string; body: string }[] = [
  {
    title: "Build in the open",
    body: "Default to transparency. Knowledge wants to be stood upon — ship the engine, not just the demo.",
  },
  {
    title: "Loops over launches",
    body: "A launch is a point; a loop is a slope. I design systems that judge and refactor themselves to convergence.",
  },
  {
    title: "Ownership & zero-trust",
    body: "The most personal data stays local and owned by the user. Power should be private by default.",
  },
  {
    title: "Verify, don't vibe",
    body: "Every claim earns a check. Reality-grounded benchmarks beat confident hand-waving.",
  },
  {
    title: "Multiply others",
    body: "The real 12X is in the people you raise — students, founders, and my two sons.",
  },
];

// ── Love ─────────────────────────────────────────────────────────────────────
// What I'm devoted to — the "why" under the work.
export const love =
  "Family and faith first — raising Daniel and David to be wealth creators and Kingdom builders. " +
  "Then the craft: the quiet joy of a loop that finally closes, a benchmark that finally goes green, " +
  "and handing someone a tool that makes their next year unrecognizably better than their last.";

// ── 12X Future Practices ─────────────────────────────────────────────────────
// The dozen disciplines I use to compound a 12X future. Edit freely.
export const futurePractices: { n: number; name: string; body: string }[] = [
  { n: 1, name: "Pick a 12X target, not a 12% one", body: "Aim where incremental thinking can't follow — the constraint forces a different machine." },
  { n: 2, name: "Close the loop", body: "Generate → judge → refactor → re-judge. Never ship an output you can't measure and re-run." },
  { n: 3, name: "Make it agent-native", body: "Design every surface so an agent — not just a human — can drive it end to end." },
  { n: 4, name: "Verify before you trust", body: "A chain of unverified steps is theater. Probe each rung; an honest ❌ beats a fake ✅." },
  { n: 5, name: "Own your data", body: "Keep the most personal layer local and zero-trust. Sovereignty is a feature." },
  { n: 6, name: "Build in public", body: "Open the engine. Compounding is faster when others can extend your substrate." },
  { n: 7, name: "Compose operating systems", body: "Don't build apps; build OSes — substrates that many capabilities snap onto." },
  { n: 8, name: "Teach what you build", body: "A cohort, a course, a kid at the table. Multiplying others is the highest-leverage loop." },
  { n: 9, name: "Free the model layer", body: "Wire every agent to a free-LLM survival chain so cost and rate limits never kill the loop." },
  { n: 10, name: "Measure the slope, not the point", body: "Track the rate of self-improvement. The derivative is the product." },
  { n: 11, name: "Faith & family as the base case", body: "Anchor the ambition in the people you love; that's what keeps the compounding worth it." },
  { n: 12, name: "Self-improve the self-improver", body: "Turn the loop on the loop. The system that upgrades its own upgrader wins the decade." },
];
