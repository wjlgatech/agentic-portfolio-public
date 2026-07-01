// ─────────────────────────────────────────────────────────────────────────────
// content/instances/portfolio.ts — instance #0: the ORIGINAL agentic-portfolio,
// expressed as an InstanceConfig. Its only job is proof: the live site that already
// works snaps onto the Lego contract with no special-casing. If this validates, the
// contract is a real generalization, not a learning-center-shaped mold.
//
// `import type` only → erased at runtime, so a plain-Node test can load this file.
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig } from "@core/instance-types";

export const portfolioInstance: InstanceConfig = {
  slug: "portfolio",
  vertical: "personal",
  entity: {
    name: "Paul Jialiang Wu",
    tagline: "AI/ML/DS Lead · Inventor · Investor · Entrepreneur · Creator",
    blurb:
      "An A2A endpoint for Paul Jialiang Wu. Ask grounded questions about his work, verify a " +
      "résumé claim against real evidence, and assess role fit.",
    location: "San Francisco Bay Area",
    links: {
      github: "https://github.com/wjlgatech",
      linkedin: "https://www.linkedin.com/in/jialiang-wu-67aa7179/",
      email: "wjlgatech@gmail.com",
    },
  },
  story: {
    mission:
      "Make human flourishing compound — turn frontier AI into operating systems that let people " +
      "and companies improve themselves 12X, owned by the people they serve.",
    principles: [
      { title: "Build in the open", body: "Ship the engine, not just the demo." },
      { title: "Loops over launches", body: "A launch is a point; a loop is a slope." },
      { title: "Verify, don't vibe", body: "Every claim earns a check. An honest ❌ beats a fake ✅." },
    ],
  },
  theme: "anthropic",
  agent: {
    persona: "A grounded, candid agent that represents Paul to recruiters, peers, and other agents.",
    grounding:
      "Answers are evidence-grounded and honest: unprovable claims are flagged 'unverified', " +
      "private projects share a high-level highlight only.",
    skills: [
      { id: "ask_candidate", name: "Ask about the candidate", description: "Answer any grounded question about the candidate's work, projects, skills, mission, and values.", tags: ["q&a", "candidate", "portfolio", "screening"], examples: ["What are his flagship agentic-OS projects?", "Does he have production TypeScript experience?", "Summarize his work on agent verification."] },
      { id: "verify_claim", name: "Verify a claim", description: "Check a specific claim against the candidate's real evidence and return a verdict: corroborated / partial / unverified / contradicted, with citations.", tags: ["verification", "evidence", "screening", "due-diligence"], examples: ["Verify: 'built a reality-grounded benchmark for agent CLIs'", "Is it true he ships self-improving agent loops?"] },
      { id: "role_fit", name: "Assess role fit", description: "Given a role or job description, assess fit from the candidate's VERIFIED strengths and name the honest gaps.", tags: ["recruiting", "fit", "matching"], examples: ["Fit for: Staff AI Engineer building agent platforms in Python?", "Would he fit a Rust systems role?"] },
    ],
  },
  sections: [
    { id: "practices", title: "12X Future Practices", eyebrow: "How I compound" },
    { id: "projects", title: "Projects", eyebrow: "Built in the open" },
    { id: "writing", title: "Writing", eyebrow: "Long-form on LinkedIn" },
    { id: "receipts", title: "Resume Verification", eyebrow: "Proof, not claims" },
    { id: "compass", title: "Next Projects", eyebrow: "Four growth vectors + who to reach" },
    { id: "values", title: "Values & Love", eyebrow: "The why under the work" },
  ],
  proof: { enabled: true, label: "Receipts", claimNoun: "claim", sources: ["github", "corpus"] },
  scout: { enabled: true, deepen: "deepen a flagship project", widen: "open an adjacent domain", reach: "collaborators to reach" },
  network: { discoverable: true, peers: [] },
  owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
  storage: { kvPrefix: "portfolio" },
};
