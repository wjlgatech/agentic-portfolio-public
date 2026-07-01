// ─────────────────────────────────────────────────────────────────────────────
// lib/compass-types.ts — the PURE core of "Compass": the proactive scout that, on a
// cadence, surfaces the next PROJECT to deepen/widen and the next COLLABORATOR to
// reach. NO node:fs here, so client components (components/Compass.tsx) can import
// it. The fs read/write layer lives in lib/compass.ts (which re-exports this).
//
// Discipline: human-in-the-loop (career-os) — the scout DRAFTS the next move
// (a first step, a suggested intro); the human acts on it. Nothing auto-sends.
// The jobs lane is a documented fast-follow that hands off to career-os.
// ─────────────────────────────────────────────────────────────────────────────

// The four GROWTH VECTORS — the directions a body of work can compound. The user's
// mental model (deepen/widen/lengthen/heighten), grounded in named strategy frameworks.
// Together they're the quadrants of explore↔exploit (March) × concrete↔abstract.
export type ProjectKind = "deepen" | "widen" | "lengthen" | "heighten";

export const GROWTH_VECTORS: Record<ProjectKind, { glyph: string; label: string; gist: string; framework: string }> = {
  deepen:   { glyph: "↓", label: "Deepen",   gist: "more fundamental, seminal — to the roots", framework: "first-principles / foundational research" },
  widen:    { glyph: "↔", label: "Widen",    gist: "new applications, features, markets",       framework: "Ansoff · Innovation Ambition Matrix" },
  lengthen: { glyph: "→", label: "Lengthen", gist: "evolve it to robustness, scale, commodity",  framework: "McKinsey Three Horizons · Wardley evolution" },
  heighten: { glyph: "↑", label: "Heighten", gist: "generalize, abstract, compress the mechanism", framework: "abstraction laddering · compression (MDL)" },
};

export const PROJECT_KINDS = Object.keys(GROWTH_VECTORS) as ProjectKind[];

export type ProjectIdea = {
  title: string;
  kind: ProjectKind;
  rationale: string; // why now — grounded in a real strength / whitespace / lifecycle stage
  basis: string; // the repo it builds on (deepen/lengthen) OR the adjacent area it enters (widen/heighten)
  firstStep: string; // the concrete first move (a drafted next action, not a vibe)
};

export type CollaboratorLead = {
  handle: string; // GitHub handle, no "@"
  url: string; // https://github.com/<handle>
  whyMatch: string; // the case for the match
  sharedGround: string; // the overlapping topic / repo that connects you
  suggestedIntro: string; // a drafted 2-3 sentence outreach (you approve + send)
};

export type CompassConfig = {
  cadence: "weekly" | "monthly"; // display label; the GitHub Action cron is the source of truth
  widenInterests: string[]; // optional adjacent areas the owner wants to push into
};

export type CompassReport = {
  generatedAt: string; // ISO; "" when never run
  model: string;
  cadence: string;
  deepen: ProjectIdea[];
  widen: ProjectIdea[];
  lengthen: ProjectIdea[];
  heighten: ProjectIdea[];
  collaborators: CollaboratorLead[]; // "Reach" — the orthogonal who
  note: string; // honest note (e.g. "no fresh collaborator candidates this run")
};

export const EMPTY_COMPASS: CompassReport = {
  generatedAt: "", model: "", cadence: "weekly", deepen: [], widen: [], lengthen: [], heighten: [], collaborators: [], note: "",
};

// The number of project ideas across all four vectors (collaborators are counted separately).
export const ideaCount = (r: CompassReport): number => r.deepen.length + r.widen.length + r.lengthen.length + r.heighten.length;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const cap = <T>(a: unknown, n: number, f: (x: unknown) => T | null): T[] =>
  (Array.isArray(a) ? a : []).map(f).filter((x): x is T => x !== null).slice(0, n);

function cleanIdea(kind: ProjectKind) {
  return (raw: unknown): ProjectIdea | null => {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const title = str(o.title);
    if (!title) return null;
    return { title, kind, rationale: str(o.rationale), basis: str(o.basis), firstStep: str(o.firstStep) };
  };
}

function cleanCollaborator(raw: unknown): CollaboratorLead | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const handle = str(o.handle).replace(/^@/, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(handle)) return null; // valid GitHub handle only
  const url = str(o.url) || `https://github.com/${handle}`;
  if (!/^https:\/\/github\.com\//i.test(url)) return null; // never let a model inject an arbitrary link
  return { handle, url, whyMatch: str(o.whyMatch), sharedGround: str(o.sharedGround), suggestedIntro: str(o.suggestedIntro) };
}

// Coerce arbitrary input (an LLM JSON blob or the seed file) into a safe report,
// capping every lane so a runaway model can't bloat the page.
export function normalizeCompass(raw: unknown): CompassReport {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    generatedAt: str(o.generatedAt),
    model: str(o.model),
    cadence: str(o.cadence) || "weekly",
    deepen: cap(o.deepen, 6, cleanIdea("deepen")),
    widen: cap(o.widen, 6, cleanIdea("widen")),
    lengthen: cap(o.lengthen, 6, cleanIdea("lengthen")),
    heighten: cap(o.heighten, 6, cleanIdea("heighten")),
    collaborators: cap(o.collaborators, 12, cleanCollaborator),
    note: str(o.note),
  };
}

export function normalizeConfig(raw: unknown): CompassConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const cadence = o.cadence === "monthly" ? "monthly" : "weekly";
  const widenInterests = (Array.isArray(o.widenInterests) ? o.widenInterests : [])
    .map((x) => str(x))
    .filter(Boolean)
    .slice(0, 12);
  return { cadence, widenInterests };
}
