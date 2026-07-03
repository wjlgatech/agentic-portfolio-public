// ─────────────────────────────────────────────────────────────────────────────
// content/instances/seeds.ts — the SEED DEMO packs: five fictional examples proving the
// one-core/any-category thesis (individual · clinic · trades · ministry · fitness), each on a
// different brand theme to show the token seam. They are DATA, not code (import type only).
//
// Honesty is structural: every pack is clearly labelled a fictional demo in its own blurb,
// and every outcome carries verdict "unverified" — a demo must never read as a real business.
// Served two ways with zero setup: `INSTANCE=demo-<x>` renders one as the deploy's site, and
// /p/<slug> falls back to these when KV has no hosted portfolio by that slug (read-only demos:
// no owner hash exists, so the owner badge honestly shows View-only).
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig } from "@core/instance-types";

const DEMO = "This is a fictional demo portfolio — an example of what /make builds for this category.";

export const SEED_PACKS: Record<string, InstanceConfig> = {
  "demo-dentist": {
    slug: "demo-dentist",
    vertical: "clinic",
    theme: "apple",
    entity: {
      name: "Brightside Dental Studio",
      tagline: "Gentle dentistry that answers your questions 24/7",
      blurb: `A neighborhood dental practice whose site can actually answer you — insurance, first visits, anxiety-friendly care. ${DEMO}`,
      location: "Maplewood",
      links: {},
    },
    story: {
      mission: "Make going to the dentist the least scary errand of your month.",
      principles: [
        { title: "Explain before we touch", body: "Every procedure gets a plain-words walkthrough and a written estimate first." },
        { title: "Anxiety-friendly by default", body: "Noise-cancelling headphones, hand-signal stops, and no lectures — ever." },
      ],
    },
    agent: {
      persona: "A calm, warm front-desk agent for a dental practice — answers about services, insurance, and first visits.",
      grounding: "Answer only from this practice's published material. Never give medical advice or diagnose; route clinical questions to a real appointment. Present claims as unverified.",
      skills: [
        { id: "ask_services", name: "Services & first visits", description: "What we treat, what a first visit looks like, how estimates work.", tags: ["q&a"], examples: ["Do you do same-day crowns?"] },
        { id: "capture_lead", name: "Request an appointment", description: "Take a visitor's contact + need so the front desk can follow up.", tags: ["lead"], examples: ["I need a cleaning next week."] },
      ],
    },
    sections: [
      { id: "practices", title: "About Us", eyebrow: "Who we are + how we work" },
      { id: "projects", title: "Services", eyebrow: "What we offer" },
      { id: "receipts", title: "Track Record", eyebrow: "Claimed — ask us for references" },
    ],
    proof: { enabled: true, label: "Track Record", claimNoun: "outcome", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: false, peers: [] }, // demos stay OUT of the real registry
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: "demo-dentist" },
    content: {
      offerings: [
        { name: "Checkup + cleaning", category: "Preventive", summary: "60 minutes, x-rays included, plain-words report at the end." },
        { name: "Same-day crowns", category: "Restorative", summary: "One visit, milled in-house — no temporary, no second trip." },
        { name: "Anxiety-friendly appointments", category: "Comfort", summary: "Longer slots, hand-signal stops, sedation options explained honestly." },
      ],
      outcomes: [
        { claim: "4.9-star average across 300+ patient reviews", verdict: "unverified" },
        { claim: "Most insurance claims filed same-day", verdict: "unverified" },
      ],
      writings: [],
    },
  },

  "demo-roofer": {
    slug: "demo-roofer",
    vertical: "services",
    theme: "brutalist",
    entity: {
      name: "Summit Ridge Roofing",
      tagline: "Roofs that outlive the mortgage",
      blurb: `A local roofing crew whose site answers the questions you'd actually call about — price ranges, timelines, storm damage. ${DEMO}`,
      location: "Cedar County",
      links: {},
    },
    story: {
      mission: "Fix it right, show the photos, charge what the estimate said.",
      principles: [
        { title: "Photos or it didn't happen", body: "Every job ends with a before/after photo set and the material receipts." },
        { title: "The estimate is the price", body: "Surprises on the roof get a phone call before they become a charge." },
      ],
    },
    agent: {
      persona: "A straight-talking estimator for a roofing company — answers about services, timelines, and what things roughly cost.",
      grounding: "Answer only from this company's published material. Give price RANGES only, never a quote — a real quote needs an inspection. Present claims as unverified.",
      skills: [
        { id: "ask_services", name: "Services & timelines", description: "Repairs, replacements, storm damage — what we do and how long it takes.", tags: ["q&a"], examples: ["How fast can you tarp a leak?"] },
        { id: "capture_lead", name: "Request an estimate", description: "Take a visitor's address + issue so the crew can schedule an inspection.", tags: ["lead"], examples: ["Hail hit us last night."] },
      ],
    },
    sections: [
      { id: "practices", title: "About Us", eyebrow: "Who we are + how we work" },
      { id: "projects", title: "Services", eyebrow: "What we offer" },
      { id: "receipts", title: "Track Record", eyebrow: "Claimed — ask us for references" },
    ],
    proof: { enabled: true, label: "Track Record", claimNoun: "outcome", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: false, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: "demo-roofer" },
    content: {
      offerings: [
        { name: "Emergency leak tarp", category: "Repair", summary: "Same-day tarp + inspection so the ceiling stays a ceiling." },
        { name: "Full replacement", category: "Replacement", summary: "Tear-off to ridge cap, typically 2–3 days, photo-documented." },
        { name: "Storm-damage claims help", category: "Insurance", summary: "We document, you file — honest reports, never inflated." },
      ],
      outcomes: [
        { claim: "500+ roofs replaced since 2015", verdict: "unverified" },
        { claim: "Zero unresolved warranty claims", verdict: "unverified" },
      ],
      writings: [],
    },
  },

  "demo-church": {
    slug: "demo-church",
    vertical: "ministry",
    theme: "notion",
    entity: {
      name: "Grace Community Church",
      tagline: "A church whose door answers before you knock",
      blurb: `A neighborhood church whose page can answer a newcomer's real questions — service times, kids, what to expect. ${DEMO}`,
      location: "West Side",
      links: {},
    },
    story: {
      mission: "Love God, love neighbors, serve the city — starting with whoever walks in next.",
      principles: [
        { title: "Come as you are", body: "No dress code, no quiz at the door. Coffee's in the lobby." },
        { title: "Serve first", body: "The building exists for the neighborhood, not the other way around." },
      ],
    },
    agent: {
      persona: "A warm, plain-spoken greeter for a neighborhood church — answers about services, groups, and what a first visit is like.",
      grounding: "Answer only from what this church has published. Be welcoming to every visitor regardless of background; never pressure. Present claims as unverified.",
      skills: [
        { id: "ask_visit", name: "Plan a first visit", description: "Service times, parking, kids check-in, what to expect.", tags: ["q&a"], examples: ["What time is Sunday service?"] },
        { id: "ask_groups", name: "Groups & serving", description: "Small groups, the men's prayer group, volunteering — when and where.", tags: ["groups"], examples: ["Is there a men's prayer group?"] },
      ],
    },
    sections: [
      { id: "practices", title: "Who We Are", eyebrow: "Our story + what we believe" },
      { id: "projects", title: "Gatherings & Groups", eyebrow: "When + where we meet" },
      { id: "receipts", title: "Community Impact", eyebrow: "Claimed — come see for yourself" },
    ],
    proof: { enabled: true, label: "Community Impact", claimNoun: "outcome", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: false, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: "demo-church" },
    content: {
      offerings: [
        { name: "Sunday gathering", category: "Services", summary: "Sundays 10am — music, a plain-spoken message, kids' rooms open." },
        { name: "Men's prayer group", category: "Groups", summary: "Saturdays 7am in the annex — coffee first, no experience needed." },
        { name: "Neighborhood meal night", category: "Serve", summary: "Thursdays 6pm — free dinner, everyone welcome, volunteers fed first." },
      ],
      outcomes: [
        { claim: "120 meals served weekly at meal night", verdict: "unverified" },
        { claim: "14 small groups meeting across the west side", verdict: "unverified" },
      ],
      writings: [],
    },
  },

  "demo-running-club": {
    slug: "demo-running-club",
    vertical: "fitness",
    theme: "google",
    entity: {
      name: "Riverside Running Crew",
      tagline: "Every pace. Every Saturday. Nobody runs alone.",
      blurb: `A free community running club whose page answers the only question that matters: can I show up as I am? (Yes.) ${DEMO}`,
      location: "Riverside Park",
      links: {},
    },
    story: {
      mission: "Get one more neighbor moving, one Saturday at a time.",
      principles: [
        { title: "No-drop rule", body: "Pace groups from walk-run to tempo; the last finisher gets the loudest cheer." },
        { title: "Free means free", body: "No dues, no gear checks, no signup wall — just show up at the fountain." },
      ],
    },
    agent: {
      persona: "An upbeat crew captain for a community running club — answers about runs, paces, and first-timer nerves.",
      grounding: "Answer only from what the crew has published. Never give medical or training-plan advice beyond what's posted. Present claims as unverified.",
      skills: [
        { id: "ask_runs", name: "Runs & paces", description: "When and where we run, pace groups, what to bring.", tags: ["q&a"], examples: ["I run 12-minute miles — will I fit in?"] },
        { id: "ask_join", name: "First-timer guide", description: "Exactly what a first Saturday looks like, from parking to coffee after.", tags: ["join"], examples: ["What should I expect my first time?"] },
      ],
    },
    sections: [
      { id: "practices", title: "Who We Are", eyebrow: "Our story + the no-drop rule" },
      { id: "projects", title: "Runs & Groups", eyebrow: "When + where we meet" },
      { id: "receipts", title: "Community Impact", eyebrow: "Claimed — come see for yourself" },
    ],
    proof: { enabled: true, label: "Community Impact", claimNoun: "outcome", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: false, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: "demo-running-club" },
    content: {
      offerings: [
        { name: "Saturday long run", category: "Weekly", summary: "8am at the fountain — 3, 5, and 8 mile routes, all paces, coffee after." },
        { name: "Couch-to-5K pod", category: "Beginners", summary: "A 9-week walk-run group that starts over every season. Zero judgment." },
        { name: "Race-day crew", category: "Events", summary: "We adopt one local race a quarter and cheer like maniacs." },
      ],
      outcomes: [
        { claim: "60+ runners on an average Saturday", verdict: "unverified" },
        { claim: "38 first-time 5K finishers last year", verdict: "unverified" },
      ],
      writings: [],
    },
  },

  "demo-artist": {
    slug: "demo-artist",
    vertical: "personal",
    theme: "anthropic",
    entity: {
      name: "Mara Lin",
      tagline: "Ceramics that remember your hands",
      blurb: `A studio ceramicist whose portfolio answers collectors and students directly — process, commissions, classes. ${DEMO}`,
      location: "Asheville",
      links: {},
    },
    story: {
      mission: "Make objects people use daily and notice weekly.",
      principles: [
        { title: "Wabi-sabi, honestly", body: "The irregular glaze is the point; seconds are sold as seconds." },
        { title: "Teach the failure", body: "Classes show the collapsed bowls too — that's where the learning is." },
      ],
    },
    agent: {
      persona: "A thoughtful studio assistant for a ceramic artist — answers about work, process, commissions, and classes.",
      grounding: "Answer only from the artist's published material. Quote commission lead times as posted; never promise dates. Present claims as unverified.",
      skills: [
        { id: "ask_work", name: "The work & process", description: "Series, glazes, firing process, what's currently available.", tags: ["q&a"], examples: ["What's the wait for a commission?"] },
        { id: "ask_classes", name: "Classes & studio visits", description: "Beginner wheel classes, open-studio Saturdays, gift certificates.", tags: ["classes"], examples: ["Do you teach beginners?"] },
      ],
    },
    sections: [
      { id: "practices", title: "About", eyebrow: "Who I am + how I work" },
      { id: "projects", title: "The Work", eyebrow: "Series & commissions" },
      { id: "receipts", title: "Highlights", eyebrow: "Claimed — verify before you trust" },
    ],
    proof: { enabled: true, label: "Highlights", claimNoun: "highlight", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: false, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: "demo-artist" },
    content: {
      offerings: [
        { name: "Dinnerware commissions", category: "Commissions", summary: "Full place settings in the studio's signature ash glaze; 8-week lead." },
        { name: "Beginner wheel class", category: "Classes", summary: "6 weeks, 8 seats, clay included — you leave with three finished pieces." },
        { name: "Seconds shelf", category: "Shop", summary: "Perfectly usable imperfects at half price, first Saturday monthly." },
      ],
      outcomes: [
        { claim: "Work carried by three regional galleries", verdict: "unverified" },
        { claim: "200+ students taught since 2019", verdict: "unverified" },
      ],
      writings: [],
    },
  },
};
