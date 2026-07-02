// ─────────────────────────────────────────────────────────────────────────────
// instance-types.ts — the site-config contract.
//
// A deploy is rendered from a config (an InstanceConfig). The difference between two sites is
// DATA, not code — the config's fields drive every seam:
//
//   entity   → replaces content/profile.ts          (who/what this agent represents)
//   theme    → the token seam (app/themes.css)       (rebrand = one [data-theme] block)
//   agent    → the A2A card + copilot grounding       (app/api/agent-card + /api/a2a)
//   sections → the page                               (content/portfolio.yaml control surface)
//   proof    → Receipts, recast per config          (audited outcomes / P&L / case studies)
//   scout    → Compass, recast per config           (next cohorts / leads / inventory)
//   network  → registry + A2A federation              (the network effect; lib/registry)
//   owner    → the owner gate (lib/owner.ts)          (the one real security boundary)
//   storage  → KV key prefix (lib/storage.ts)         (many instances, one durable store)
//
// PURE: no node:fs, no app imports — so a client component AND a plain-Node test can both
// import validateInstance(). validateInstance() is the "does this brick actually fit?" check:
// a pack either snaps on (ok:true) or is rejected with the exact mis-fits (errors[]).
// ─────────────────────────────────────────────────────────────────────────────

// The brand themes the token seam knows (must match THEMES in lib/portfolio.ts + themes.css).
export const VALID_THEMES = [
  "anthropic", "openai", "google", "apple", "vercel",
  "stripe", "swiss", "brutalist", "notion",
] as const;
export type Theme = (typeof VALID_THEMES)[number];

// The vertical families we seed first (high-value/high-frequency, fit-to-builder). Open-ended
// by design — adding a vertical is adding a string here + a content pack, never a code change.
export const VERTICALS = [
  "personal",    // the original portfolio (instance #0)
  "education",   // learning / training center
  "agency",      // marketing / SEO / creative agency
  "trading",     // trading / investing school
  "consulting",  // advisory / coaching clinic
  "rnd",         // engineering R&D firm / lab
  "clinic",      // dental / counseling / medical
  "fitness",     // gym / climbing / studio
  "hospitality", // restaurant / bar / food truck
  "retail",      // store / mart / chain
  "ministry",    // church / ministry / community
  "services",    // mechanic / roofing / detective / trades
] as const;
export type Vertical = (typeof VERTICALS)[number];

// One advertised A2A skill — the federation stud. An agent card is just entity + these.
export type A2ASkill = { id: string; name: string; description: string; tags?: string[]; examples?: string[] };

export type EntityIdentity = {
  name: string;
  tagline: string;
  blurb: string;
  location?: string;
  links?: Record<string, string>;
};

// The mission + principles that ground the agent's voice (generalizes profile.ts's
// mission/values/12X). principles render as the "why" section of any vertical.
export type EntityStory = {
  mission: string;
  principles: { title: string; body: string }[];
};

export type AgentSpec = {
  persona: string;      // one line: how the agent should speak FOR this entity
  grounding: string;    // the honesty/privacy rule (kept identical-in-spirit across verticals)
  skills: A2ASkill[];   // ≥1 — advertised on the agent card, answerable via /api/a2a
};

export type SectionKind = "builtin" | "custom";
export type SectionSpec = {
  id: string;           // built-in id OR custom-<slug>
  title: string;
  eyebrow?: string;
  visible?: boolean;
  kind?: SectionKind;
};

// Receipts, recast. Every vertical proves itself with evidence; only the NOUN changes.
export type ProofSpec = {
  enabled: boolean;
  label: string;        // "Receipts" | "Outcomes" | "Track Record" | "Case Studies"
  claimNoun: string;    // "claim" | "student outcome" | "trade" | "engagement"
  sources: ("github" | "corpus" | "manual")[]; // where evidence is audited from
};

// Compass, recast. Same human-in-the-loop drafts-never-sends discipline; vertical labels.
export type ScoutSpec = {
  enabled: boolean;
  deepen: string;       // "deepen a course" | "double down on a winning channel"
  widen: string;        // "add an adjacent topic" | "open a new market"
  reach: string;        // who to reach: "guest instructors" | "referral partners"
};

// The network effect. discoverable → other agents can find + query this instance;
// peers → registries / sibling instances to auto-register with on launch.
export type NetworkSpec = {
  discoverable: boolean;
  peers: string[];      // registry/instance URLs
};

// ── Per-instance CONTENT corpus ──────────────────────────────────────────────
// The material the agent ANSWERS from, generalized across verticals. For the portfolio
// this is projects.json + verified claims + articles; for a learning center it's tracks +
// audited outcomes + lessons; for a restaurant it's the menu. Optional: the portfolio
// instance keeps reading content/profile.ts + projects.json directly (no migration); a NEW
// vertical declares `content` so /api/a2a answers from ITS material, not the portfolio's.
export const VERDICTS = ["corroborated", "partial", "unverified", "contradicted"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Offering = { name: string; category: string; summary: string; url?: string; private?: boolean }; // a project / track / service / menu item
export type Outcome = { claim: string; verdict: Verdict };   // a Receipts/outcomes claim + its HONEST verdict
export type Writing = { title: string; url: string; category?: string; summary?: string }; // an article / lesson / post
export type InstanceContent = { offerings: Offering[]; outcomes: Outcome[]; writings: Writing[] };

export type InstanceConfig = {
  slug: string;         // kebab id, also the KV namespace + registry handle
  vertical: Vertical;
  entity: EntityIdentity;
  story: EntityStory;
  theme: Theme;
  agent: AgentSpec;
  sections: SectionSpec[];
  proof: ProofSpec;
  scout: ScoutSpec;
  network: NetworkSpec;
  owner: { gateEnv: string };        // env var holding the owner secret (default below)
  storage: { kvPrefix: string };     // KV key prefix so instances never collide
  content?: InstanceContent;         // the corpus the agent answers from (optional; portfolio uses fs content)
};

export const DEFAULT_OWNER_ENV = "PORTFOLIO_OWNER_TOKEN";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isKebab = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

function cleanSkill(raw: unknown): A2ASkill | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    description: str(o.description),
    ...(Array.isArray(o.tags) ? { tags: o.tags.map(str).filter(Boolean).slice(0, 12) } : {}),
    ...(Array.isArray(o.examples) ? { examples: o.examples.map(str).filter(Boolean).slice(0, 8) } : {}),
  };
}

function cleanOffering(raw: unknown): Offering | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = str(o.name);
  if (!name) return null;
  const url = str(o.url);
  return {
    name: name.slice(0, 120),
    category: str(o.category) || "General",
    summary: str(o.summary).slice(0, 400),
    ...(/^https?:\/\//i.test(url) ? { url } : {}),
    ...(o.private === true ? { private: true } : {}),
  };
}
function cleanOutcome(raw: unknown): Outcome | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const claim = str(o.claim);
  if (!claim) return null;
  const v = str(o.verdict) as Verdict;
  return { claim: claim.slice(0, 280), verdict: VERDICTS.includes(v) ? v : "unverified" };
}
function cleanWriting(raw: unknown): Writing | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = str(o.title), url = str(o.url);
  if (!title || !/^https?:\/\//i.test(url)) return null;
  return { title: title.slice(0, 200), url, ...(str(o.category) ? { category: str(o.category) } : {}), ...(str(o.summary) ? { summary: str(o.summary).slice(0, 300) } : {}) };
}
function cleanContent(raw: unknown): InstanceContent {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    offerings: (Array.isArray(o.offerings) ? o.offerings : []).map(cleanOffering).filter((x): x is Offering => x !== null).slice(0, 40),
    outcomes: (Array.isArray(o.outcomes) ? o.outcomes : []).map(cleanOutcome).filter((x): x is Outcome => x !== null).slice(0, 40),
    writings: (Array.isArray(o.writings) ? o.writings : []).map(cleanWriting).filter((x): x is Writing => x !== null).slice(0, 40),
  };
}

// The fit-check. Normalizes a raw pack and returns the exact mis-fits if it doesn't snap on.
// This is the Lego stud test: a content pack is valid IFF every required stud is present and
// every enum (theme, vertical) is one the core actually knows how to render.
export function validateInstance(raw: unknown): { ok: boolean; config: InstanceConfig | null; errors: string[] } {
  const errors: string[] = [];
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const slug = str(o.slug);
  if (!slug) errors.push("slug is required");
  else if (!isKebab(slug)) errors.push(`slug "${slug}" must be kebab-case (a-z, 0-9, hyphens)`);

  const vertical = str(o.vertical) as Vertical;
  if (!VERTICALS.includes(vertical)) errors.push(`vertical "${vertical}" is not one of: ${VERTICALS.join(", ")}`);

  const theme = str(o.theme) as Theme;
  if (!VALID_THEMES.includes(theme)) errors.push(`theme "${theme}" is not a known brand: ${VALID_THEMES.join(", ")}`);

  const entityRaw = (o.entity && typeof o.entity === "object" ? o.entity : {}) as Record<string, unknown>;
  const entity: EntityIdentity = {
    name: str(entityRaw.name),
    tagline: str(entityRaw.tagline),
    blurb: str(entityRaw.blurb),
    ...(str(entityRaw.location) ? { location: str(entityRaw.location) } : {}),
    ...(entityRaw.links && typeof entityRaw.links === "object"
      ? { links: Object.fromEntries(Object.entries(entityRaw.links as Record<string, unknown>).map(([k, v]) => [k, str(v)]).filter(([, v]) => v)) }
      : {}),
  };
  if (!entity.name) errors.push("entity.name is required");
  if (!entity.tagline) errors.push("entity.tagline is required");

  const storyRaw = (o.story && typeof o.story === "object" ? o.story : {}) as Record<string, unknown>;
  const story: EntityStory = {
    mission: str(storyRaw.mission),
    principles: (Array.isArray(storyRaw.principles) ? storyRaw.principles : [])
      .map((p) => ({ title: str((p as Record<string, unknown>)?.title), body: str((p as Record<string, unknown>)?.body) }))
      .filter((p) => p.title || p.body),
  };
  if (!story.mission) errors.push("story.mission is required");

  const agentRaw = (o.agent && typeof o.agent === "object" ? o.agent : {}) as Record<string, unknown>;
  const skills = (Array.isArray(agentRaw.skills) ? agentRaw.skills : []).map(cleanSkill).filter((s): s is A2ASkill => s !== null);
  if (skills.length === 0) errors.push("agent.skills must have at least one valid {id,name} skill (the A2A federation stud)");
  const agent: AgentSpec = { persona: str(agentRaw.persona), grounding: str(agentRaw.grounding), skills };
  if (!agent.grounding) errors.push("agent.grounding (the honesty/privacy rule) is required");

  const sections: SectionSpec[] = [];
  const ids = new Set<string>();
  for (const s of Array.isArray(o.sections) ? o.sections : []) {
    const sm = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const id = str(sm.id);
    if (!id) continue;
    if (ids.has(id)) errors.push(`duplicate section id "${id}"`);
    ids.add(id);
    sections.push({
      id,
      title: str(sm.title) || id,
      ...(str(sm.eyebrow) ? { eyebrow: str(sm.eyebrow) } : {}),
      visible: sm.visible !== false,
      kind: id.startsWith("custom-") ? "custom" : "builtin",
    });
  }
  if (sections.length === 0) errors.push("at least one section is required");

  const proofRaw = (o.proof && typeof o.proof === "object" ? o.proof : {}) as Record<string, unknown>;
  const proof: ProofSpec = {
    enabled: proofRaw.enabled !== false,
    label: str(proofRaw.label) || "Receipts",
    claimNoun: str(proofRaw.claimNoun) || "claim",
    sources: (Array.isArray(proofRaw.sources) ? proofRaw.sources : ["corpus"])
      .map(str)
      .filter((s): s is ProofSpec["sources"][number] => s === "github" || s === "corpus" || s === "manual"),
  };
  if (proof.enabled && proof.sources.length === 0) errors.push("proof.sources must list at least one of: github, corpus, manual");

  const scoutRaw = (o.scout && typeof o.scout === "object" ? o.scout : {}) as Record<string, unknown>;
  const scoutDeepen = str(scoutRaw.deepen), scoutWiden = str(scoutRaw.widen), scoutReach = str(scoutRaw.reach);
  const scoutHasLabels = Boolean(scoutDeepen && scoutWiden && scoutReach);
  // Scout is opt-in by content: enabled if explicitly on, OR if the pack supplied labels.
  // (So a minimal pack that omits scout simply has no scout — not a validation error.)
  const scoutEnabled = scoutRaw.enabled === false ? false : (scoutRaw.enabled === true || scoutHasLabels);
  const scout: ScoutSpec = { enabled: scoutEnabled, deepen: scoutDeepen, widen: scoutWiden, reach: scoutReach };
  if (scout.enabled && !scoutHasLabels) errors.push("scout requires deepen, widen, and reach labels when enabled");

  const networkRaw = (o.network && typeof o.network === "object" ? o.network : {}) as Record<string, unknown>;
  const network: NetworkSpec = {
    discoverable: networkRaw.discoverable !== false,
    peers: (Array.isArray(networkRaw.peers) ? networkRaw.peers : []).map(str).filter(Boolean).slice(0, 50),
  };

  const ownerRaw = (o.owner && typeof o.owner === "object" ? o.owner : {}) as Record<string, unknown>;
  const owner = { gateEnv: str(ownerRaw.gateEnv) || DEFAULT_OWNER_ENV };

  const storageRaw = (o.storage && typeof o.storage === "object" ? o.storage : {}) as Record<string, unknown>;
  const storage = { kvPrefix: str(storageRaw.kvPrefix) || slug || "instance" };

  const content = o.content ? cleanContent(o.content) : undefined;

  const config: InstanceConfig = { slug, vertical, entity, story, theme, agent, sections, proof, scout, network, owner, storage, ...(content ? { content } : {}) };
  return { ok: errors.length === 0, config: errors.length === 0 ? config : null, errors };
}

// Proof of the federation stud: ANY valid instance → a spec-shaped A2A Agent Card, with
// zero vertical-specific code. This is what app/api/agent-card builds by hand today; the
// instance-aware refactor will build it from here so every config is instantly queryable.
export function instanceToAgentCard(config: InstanceConfig, origin: string): Record<string, unknown> {
  return {
    name: `${config.entity.name} — Agent`,
    description: `${config.entity.blurb || config.entity.tagline} ${config.agent.grounding}`.trim(),
    url: `${origin}/api/a2a`,
    provider: { organization: config.entity.name, url: origin },
    version: "1.0.0",
    documentationUrl: `${origin}/a2a/SKILL.md`,
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    authentication: { schemes: [] },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json"],
    skills: config.agent.skills.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      ...(s.tags ? { tags: s.tags } : {}),
      ...(s.examples ? { examples: s.examples } : {}),
    })),
    "x-vertical": config.vertical,
  };
}

// The lean, budget-bounded EVIDENCE corpus an instance's A2A agent answers from — the
// generalization of /api/a2a's buildEvidence(). Private offerings share a highlight only
// (never a URL); outcomes carry their HONEST verdict so the model can't inflate them. Capped
// because a caller agent fires repeatedly and free-tier LLMs have tight TPM limits.
export function instanceEvidence(config: InstanceConfig, charBudget = 12000): string {
  const c = config.content ?? { offerings: [], outcomes: [], writings: [] };
  return JSON.stringify({
    entity: { name: config.entity.name, tagline: config.entity.tagline, blurb: config.entity.blurb, location: config.entity.location, links: config.entity.links },
    mission: config.story.mission,
    principles: config.story.principles.map((p) => p.title),
    offerings: c.offerings.map((o) => ({ name: o.name, category: o.category, summary: o.summary.slice(0, 160), private: o.private === true, url: o.private ? null : (o.url ?? null) })),
    outcomes: c.outcomes, // {claim, verdict} — the honest evidence base (unverified stays unverified)
    writings: c.writings.map((w) => ({ title: w.title, url: w.url })),
  }).slice(0, charBudget);
}

// No-LLM fallback: a grounded static summary built from the pack, so a caller still gets
// something real even when the operator hasn't set an LLM key.
export function instanceStaticAnswer(config: InstanceConfig): string {
  const c = config.content ?? { offerings: [], outcomes: [], writings: [] };
  const list = c.offerings.filter((o) => !o.private).slice(0, 8).map((o) => `- ${o.name} (${o.category}): ${o.summary}`).join("\n");
  return `${config.entity.name} — ${config.entity.tagline}.\n${config.entity.blurb}` +
    (list ? `\n\nOfferings:\n${list}` : "") +
    `\n\n(Note: this endpoint's LLM is not configured, so this is a static summary. For grounded Q&A, the operator should set a free LLM key.)`;
}
