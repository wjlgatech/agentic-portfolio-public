// ─────────────────────────────────────────────────────────────────────────────
// content/instances/learning-center.ts — the FIRST new vertical pack: an Agentic
// Learning Center (teach tech / AI / trading). It reuses 100% of the core bricks;
// only this data changes. Note how each core brick is recast, not rebuilt:
//
//   Receipts → "Outcomes"  (audited student results, honest 'unverified' for the rest)
//   Compass  → next cohorts / new topics / guest instructors  (drafts, never enrolls)
//   A2A card → skills a PARENT/STUDENT agent would call: ask_program, verify_outcome, fit_check
//
// Deepest fit for Paul (12X #8 "teach what you build"). `import type` only → runtime-erased.
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig } from "@core/instance-types";

export const learningCenter: InstanceConfig = {
  slug: "learning-center",
  vertical: "education",
  entity: {
    name: "12X Agentic Academy",
    tagline: "Learn to build self-improving AI — by shipping it, in the open",
    blurb:
      "A learning center where students don't watch lectures — they ship agentic systems with a " +
      "loop that judges and refactors their work until it's real. Tracks: Agentic Engineering, " +
      "AI Trading, and Founder OS.",
    location: "Online · San Francisco Bay Area",
    links: {
      site: "https://example.com",
      community: "https://example.com/community",
      email: "learn@example.com",
    },
  },
  story: {
    mission:
      "Make mastery compound. Replace passive courses with self-correcting build loops, so every " +
      "student leaves with shipped, verified work — not a certificate of attendance.",
    principles: [
      { title: "Build, don't watch", body: "Every lesson ends in a shipped artifact, judged against a real benchmark." },
      { title: "Close the loop", body: "Generate → judge → refactor → re-judge. The grade is the green check, not the vibe." },
      { title: "Own your work", body: "Students keep the repos, the data, and the agents they build. Sovereignty is the syllabus." },
      { title: "Multiply others", body: "Seniors mentor juniors; the cohort is the curriculum." },
    ],
  },
  theme: "notion",
  agent: {
    persona: "A warm, exacting admissions-and-learning agent that speaks for the academy to prospective students, parents, and partner agents.",
    grounding:
      "Answers from the real curriculum and audited outcomes only. Unproven results are flagged " +
      "'unverified' (never inflated); private student data is never exposed — aggregate outcomes only.",
    skills: [
      { id: "ask_program", name: "Ask about a program", description: "Answer grounded questions about tracks, curriculum, format, schedule, and price.", tags: ["q&a", "admissions", "curriculum"], examples: ["What does the Agentic Engineering track cover?", "Is the AI Trading track live or self-paced?"] },
      { id: "verify_outcome", name: "Verify an outcome", description: "Check a claimed student outcome (shipped project, placement, benchmark) against audited evidence and return a verdict.", tags: ["verification", "outcomes", "evidence"], examples: ["Verify: 'graduates ship a production agent by week 8'", "How many alumni open-sourced their capstone?"] },
      { id: "fit_check", name: "Assess student fit", description: "Given a learner's goal and background, recommend a track and name honest prerequisites/gaps.", tags: ["advising", "fit", "matching"], examples: ["I'm a data analyst who wants to build trading agents — which track?", "Can a non-coder start the Founder OS track?"] },
    ],
  },
  sections: [
    { id: "practices", title: "How We Teach", eyebrow: "The build-loop method" },
    { id: "custom-tracks", title: "Tracks", eyebrow: "Agentic Engineering · AI Trading · Founder OS" },
    { id: "writing", title: "Lessons & Essays", eyebrow: "Learn in the open" },
    { id: "receipts", title: "Outcomes", eyebrow: "Audited student results — verified, not vibes" },
    { id: "compass", title: "What's Next", eyebrow: "Next cohorts & guest instructors" },
    { id: "values", title: "Why We Exist", eyebrow: "The mission under the curriculum" },
  ],
  proof: { enabled: true, label: "Outcomes", claimNoun: "student outcome", sources: ["github", "corpus", "manual"] },
  scout: { enabled: true, deepen: "deepen a track that's converting", widen: "add an adjacent topic students keep asking for", reach: "guest instructors & partner cohorts to invite" },
  network: { discoverable: true, peers: [] },
  owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
  storage: { kvPrefix: "learning-center" },

  // The corpus this instance's A2A agent answers from — its OWN material, not the portfolio's.
  // (Illustrative pack: outcomes are marked `unverified` on purpose — the agent must demonstrate
  // the honesty discipline, never fabricate audited student results. A real academy swaps in
  // audited numbers + flips verdicts to `corroborated` with a cited source.)
  content: {
    offerings: [
      { name: "Agentic Engineering", category: "Track · 8 weeks", summary: "Build a production AI agent end to end — tools, memory, a self-judging eval loop, and a deploy. Ship a public repo by week 8.", url: "https://example.com/tracks/agentic-engineering" },
      { name: "AI Trading", category: "Track · 10 weeks", summary: "Design, backtest, and paper-trade an agent strategy with honest risk accounting. The grade is an audited equity curve, not a backtest screenshot.", url: "https://example.com/tracks/ai-trading" },
      { name: "Founder OS", category: "Track · 6 weeks", summary: "Turn an idea into an agent-native product: a working MVP, a landing page, and your first 10 users — built in the open.", url: "https://example.com/tracks/founder-os" },
      { name: "Build-Loop Method", category: "Pedagogy", summary: "Every lesson ends in a shipped artifact judged against a real benchmark: generate → judge → refactor → re-judge. Mastery is the green check." },
    ],
    outcomes: [
      { claim: "Graduates ship a production-grade agent (public repo) by the end of the Agentic Engineering track.", verdict: "unverified" },
      { claim: "AI Trading students submit an audited paper-trading equity curve, not a cherry-picked backtest.", verdict: "unverified" },
      { claim: "Cohorts are capped so every student gets weekly 1:1 mentor review.", verdict: "unverified" },
    ],
    writings: [
      { title: "Why we grade the green check, not the lecture", url: "https://example.com/essays/green-check", category: "Pedagogy", summary: "Attendance certificates measure nothing. A passing benchmark measures everything." },
      { title: "The build-loop, applied to learning itself", url: "https://example.com/essays/build-loop", category: "Method", summary: "Generate → judge → refactor → re-judge — the same loop that makes agents better makes students better." },
    ],
  },
};
