// ─────────────────────────────────────────────────────────────────────────────
// content/instances/unmaskleads.ts — an Agentize instance for UnmaskLeads (Mike Hawn):
// an AI demand-intelligence product that de-anonymizes website visitors. This is a REAL
// agentic app — a visitor (or their agent) can chat with the UnmaskLeads agent, grounded
// in the product's own material. Reuses 100% of the core bricks; only this data changes:
//
//   Receipts → "Proof"   (the 98%-match etc. are UnmaskLeads' OWN claims → verdict
//                          `unverified` on purpose: the agent presents them as claimed,
//                          not independently proven. Honest by design — swap to
//                          `corroborated` with a cited case study to flip them.)
//   Compass  → "What's Next"  (expansion moves — drafts, never auto-sends)
//   A2A card → skills a BUYER'S agent would call: describe_product, assess_fit,
//              explain_compliance, book_demo
//
// Built from the public unmaskleads.io content as a prospect demo. `import type` only → erased.
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig } from "@core/instance-types";

export const unmaskleads: InstanceConfig = {
  slug: "unmaskleads",
  vertical: "agency",
  entity: {
    name: "UnmaskLeads",
    tagline: "Your best leads are already on your site — you just can't see them",
    blurb:
      "UnmaskLeads is an AI demand-intelligence platform that identifies your anonymous website " +
      "visitors in real time, enriches them into named leads, and fires automated omni-channel " +
      "follow-up — from a single pixel. Founded by Mike Hawn.",
    location: "Online · United States",
    links: {
      site: "https://unmaskleads.io",
      email: "hello@unmaskleads.io",
    },
  },
  story: {
    mission:
      "Turn the ~97% of website traffic that leaves anonymous into named, actionable pipeline — so " +
      "marketing and sales teams reach the buyers who were already interested, not just the few who filled a form.",
    principles: [
      { title: "Identify in real time", body: "Anonymous traffic resolves to named people the moment they land — not days later in a report." },
      { title: "Act, don't just observe", body: "Every identified high-intent visitor can trigger automated follow-up across email, direct mail, and ads." },
      { title: "One pixel, no project", body: "Install a single tag; the dashboard fills immediately. No engineering lift." },
      { title: "Compliant by design", body: "CCPA / HIPAA controls built in, so regulated teams can move without fear." },
    ],
  },
  theme: "vercel",
  agent: {
    persona:
      "A sharp, honest demand-intelligence agent that speaks for UnmaskLeads to prospective customers " +
      "and to the AI agents doing their research — explains the product, assesses fit, and routes to a demo.",
    grounding:
      "Answers only from UnmaskLeads' real product material. The headline metrics (e.g. up to 98% match) " +
      "are UnmaskLeads' OWN claims and are presented as claimed, not independently verified — it never " +
      "inflates them or invents case studies. It is honest about where visitor de-anonymization does NOT fit.",
    skills: [
      { id: "describe_product", name: "Describe UnmaskLeads", description: "Explain what UnmaskLeads does — real-time visitor identification, omni-channel follow-up, one-pixel install — grounded, no fabrication.", tags: ["product", "demand-intelligence", "visitor-identification"], examples: ["What does UnmaskLeads actually do?", "How does the pixel identify visitors?"] },
      { id: "assess_fit", name: "Assess fit for a business", description: "Given a company's traffic and goals, honestly assess whether visitor de-anonymization + automated follow-up is a fit — and where it isn't.", tags: ["qualification", "fit", "use-case"], examples: ["We get 40k visits/mo but few forms — is this for us?", "Does this work for low-traffic niche B2B?"] },
      { id: "explain_compliance", name: "Explain compliance posture", description: "Explain UnmaskLeads' CCPA / HIPAA compliance controls for regulated industries.", tags: ["compliance", "ccpa", "hipaa", "privacy"], examples: ["Is this CCPA compliant?", "Can a healthcare marketer use it?"] },
      { id: "book_demo", name: "Route to a demo", description: "Point a qualified prospect to the UnmaskLeads demo / booking flow.", tags: ["demo", "sales", "conversion"], examples: ["I want to see it on my site", "How do I start a trial?"] },
    ],
  },
  sections: [
    { id: "practices", title: "How It Works", eyebrow: "One pixel → named leads → follow-up" },
    { id: "custom-features", title: "What You Get", eyebrow: "Identify · enrich · act — in real time" },
    { id: "receipts", title: "Proof", eyebrow: "The claims, shown honestly (verify before you buy)" },
    { id: "compass", title: "What's Next", eyebrow: "Where UnmaskLeads is headed" },
    { id: "values", title: "Why UnmaskLeads", eyebrow: "The mission under the pixel" },
  ],
  proof: { enabled: true, label: "Proof", claimNoun: "product claim", sources: ["corpus", "manual"] },
  scout: { enabled: true, deepen: "double down on the highest-converting ICP", widen: "an adjacent channel or vertical to expand into", reach: "integration + agency partners to recruit" },
  network: { discoverable: true, peers: [] },
  owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
  storage: { kvPrefix: "unmaskleads" },

  // The corpus this instance's agent answers from — UnmaskLeads' OWN material. Outcomes are the
  // product's claims, marked `unverified` on purpose: the agent presents them as claimed, never as
  // independently proven. Flip to `corroborated` with a cited case study to make them green.
  content: {
    offerings: [
      { name: "Real-time visitor identification", category: "Core", summary: "Resolve anonymous website traffic to named people the instant they visit — up to a 98% match rate on identifiable traffic (UnmaskLeads' claim).", url: "https://unmaskleads.io" },
      { name: "Automated follow-up", category: "Conversion", summary: "Trigger outreach the moment a high-intent visitor is identified, to lift conversion without manual work." },
      { name: "Omni-channel outreach", category: "Reach", summary: "Email, direct mail, and digital advertising driven from one identity graph." },
      { name: "Behavioral intelligence", category: "Insight", summary: "Built-in heat-mapping and intent signals so you prioritize the hottest leads." },
      { name: "Compliance controls", category: "Trust", summary: "CCPA / HIPAA controls for regulated industries." },
      { name: "One-pixel install", category: "Setup", summary: "Drop a single tag; the dashboard populates with identified visitors immediately — no engineering project." },
    ],
    outcomes: [
      { claim: "Identifies up to 98% of identifiable website traffic in real time.", verdict: "unverified" },
      { claim: "Turns anonymous visitors into named, enriched leads from a single pixel.", verdict: "unverified" },
      { claim: "Automated follow-up lifts conversion on identified visitors.", verdict: "unverified" },
    ],
    writings: [
      { title: "See the real product", url: "https://unmaskleads.io", category: "Product", summary: "The live UnmaskLeads site — book a demo and see it identify your own traffic." },
    ],
  },
};
