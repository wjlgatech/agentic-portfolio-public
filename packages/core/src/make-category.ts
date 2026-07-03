// ─────────────────────────────────────────────────────────────────────────────
// make-category.ts — the /make category seam (pure, fs/network-free → plain-Node testable).
// The Maker serves three kinds of maker with ONE pipeline: an INDIVIDUAL (engineer, nurse,
// artist — grounded in a résumé/LinkedIn), a BUSINESS (dentist, roofer — grounded in a few
// lines about the business), and a COMMUNITY (church, prayer group, running club). The
// difference is DATA — which vertical, which intake wording, which generation prompt, which
// proof nouns and sections — never a code fork (the Agentize rule). This module holds that
// data + the pure spec lookup; app/api/make/route.ts consumes it.
// ─────────────────────────────────────────────────────────────────────────────
// Explicit .ts extension: this is core's first intra-package import, and the plain-Node test
// runner (type-stripping) requires it; tsconfig allows it via allowImportingTsExtensions.
import { VERTICALS, type Vertical } from "./instance-types.ts";

export const MAKE_CATEGORIES = ["individual", "business", "community"] as const;
export type MakeCategory = (typeof MAKE_CATEGORIES)[number];

export type CategorySpec = {
  category: MakeCategory;
  defaultVertical: Vertical;
  /** verticals a maker of this category may explicitly pick (all validated against VERTICALS) */
  verticals: Vertical[];
  /** the LLM system prompt that turns the intake text into grounded portfolio fields */
  genSystem: string;
  proof: { label: string; claimNoun: string };
  /** section list for buildInstance (ids must stay renderable by InstanceSite) */
  sections: { id: string; title: string; eyebrow: string }[];
  /** intake copy for the form — one wording per audience, same field underneath */
  intake: { aboutLabel: string; aboutPlaceholder: string; groundingError: string };
};

const GEN_SHARED = `Be truthful and specific — ground everything in the provided text; never invent names, numbers, or credentials. Output STRICT JSON only:
{"tagline":"3-8 words","blurb":"1-2 warm sentences","mission":"one sentence","principles":[{"title":"short","body":"one sentence"}],"skills":["a real offering/service/group"],"highlights":["a concrete claimed fact — will show as 'unverified'"],"values":[{"title":"short","body":"one sentence"}]}`;

const SPECS: Record<MakeCategory, CategorySpec> = {
  individual: {
    category: "individual",
    defaultVertical: "personal",
    verticals: ["personal", "consulting", "education"],
    genSystem: `You write a person's professional portfolio from their résumé. ${GEN_SHARED}`,
    proof: { label: "Highlights", claimNoun: "highlight" },
    sections: [
      { id: "practices", title: "About", eyebrow: "Who I am + how I work" },
      { id: "projects", title: "What I Do", eyebrow: "Skills & services" },
      { id: "receipts", title: "Highlights", eyebrow: "Claimed — verify before you trust" },
      { id: "writing", title: "Links", eyebrow: "Find me online" },
      { id: "values", title: "What I Value", eyebrow: "The why" },
    ],
    intake: {
      aboutLabel: "Your résumé / about you",
      aboutPlaceholder: "Optional if you gave LinkedIn above. Paste your résumé or a few paragraphs about your work, skills, and highlights…",
      groundingError: "Add your résumé (paste a few lines) OR your LinkedIn profile URL — we need something to ground your portfolio in.",
    },
  },
  business: {
    category: "business",
    defaultVertical: "services",
    verticals: ["services", "clinic", "agency", "hospitality", "retail", "consulting", "trading", "rnd", "fitness"],
    genSystem: `You write a small business's site copy from the owner's description. Speak AS the business (\"we\"), plain and local — no corporate fluff. ${GEN_SHARED}`,
    proof: { label: "Track Record", claimNoun: "outcome" },
    sections: [
      { id: "practices", title: "About Us", eyebrow: "Who we are + how we work" },
      { id: "projects", title: "Services", eyebrow: "What we offer" },
      { id: "receipts", title: "Track Record", eyebrow: "Claimed — ask us for references" },
      { id: "writing", title: "Links", eyebrow: "Find us online" },
      { id: "values", title: "Our Promise", eyebrow: "The why" },
    ],
    intake: {
      aboutLabel: "About your business",
      aboutPlaceholder: "What you do, your services, service area, hours, what makes you different… a few honest lines is enough.",
      groundingError: "Tell us a few lines about your business — services, area, what makes you different. That's what grounds your site.",
    },
  },
  community: {
    category: "community",
    defaultVertical: "ministry",
    verticals: ["ministry", "fitness", "education"],
    genSystem: `You write a community group's welcome page from the organizer's description (a church, a prayer group, a running club, a nonprofit). Warm, welcoming, zero jargon — everything invites a newcomer in. ${GEN_SHARED}`,
    proof: { label: "Community Impact", claimNoun: "outcome" },
    sections: [
      { id: "practices", title: "Who We Are", eyebrow: "Our story + what we believe" },
      { id: "projects", title: "Gatherings & Groups", eyebrow: "When + where we meet" },
      { id: "receipts", title: "Community Impact", eyebrow: "Claimed — come see for yourself" },
      { id: "writing", title: "Links", eyebrow: "Find us online" },
      { id: "values", title: "What We Hold To", eyebrow: "The why" },
    ],
    intake: {
      aboutLabel: "About your community",
      aboutPlaceholder: "Who you are, when and where you meet, who's welcome, what you do together… a few honest lines is enough.",
      groundingError: "Tell us a few lines about your community — who you are, when you meet, who's welcome. That's what grounds your page.",
    },
  },
};

/** Coerce any input to a known category (unknown → individual: the original /make behavior). */
export function toCategory(v: unknown): MakeCategory {
  const s = String(v ?? "").toLowerCase().trim();
  return (MAKE_CATEGORIES as readonly string[]).includes(s) ? (s as MakeCategory) : "individual";
}

export function categorySpec(category: unknown): CategorySpec {
  return SPECS[toCategory(category)];
}

/** Resolve the vertical: an explicitly-picked one wins IFF it's real and allowed for the category. */
export function resolveVertical(category: unknown, requested?: unknown): Vertical {
  const spec = categorySpec(category);
  const want = String(requested ?? "").toLowerCase().trim() as Vertical;
  return VERTICALS.includes(want) && spec.verticals.includes(want) ? want : spec.defaultVertical;
}
