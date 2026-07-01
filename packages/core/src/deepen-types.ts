// ─────────────────────────────────────────────────────────────────────────────
// packages/core/src/deepen-types.ts — the PURE model for the "deepen" INBOUND contract:
// what super-u's flywheel (POST /creator/transform → kgfy + skillfy) hands to this node.
// No node:fs, so components/Deepen.tsx can import it. The fs layer is lib/deepen.ts.
//
// SEPARATION OF CONCERNS (docs/DEEPEN-PIPELINE.md): agentic-portfolio does NOT build the
// knowledge graph or forge the skills — super-u owns that. This node RECEIVES the distilled
// artifact, GROUNDS it (validate + provenance), PRESENTS it (a deepen card), and EDUCATES
// the user. The shapes mirror super-u's real output (KnowledgeGraph{nodes,edges}, the skillfy
// Skill with honest `not_good_at` edges) so the contract is faithful, not invented.
//
// Honesty rule (Receipts ethic): a forged skill arrives `verified:false` and is shown as
// UNPROVEN until super-u's outcome loop confirms it — the node never rubber-stamps a tool.
// ─────────────────────────────────────────────────────────────────────────────

export type DeepenSource = {
  title: string;
  kind: string; // "repo" | "paper" | "repo+paper" | "video" | "article" | ...
  url: string; // the fetchable source (GitHub/arXiv) — NOT the login-walled pointer
  discoveredVia: string; // where it surfaced (e.g. the LinkedIn post) — provenance, not fetched
};

// Mirrors super-u GraphNode / GraphEdge (creator/bridge.py).
export type KGNode = { id: string; type: string; name: string; summary: string };
export type KGEdge = { source: string; target: string; type: string };
export type KnowledgeGraph = {
  title: string;
  nodes: KGNode[];
  edges: KGEdge[];
  graphUrl: string; // link to super-u's full interactive artifact (the node only previews)
};

// A lean projection of the skillfy Skill (skillfy/extract.py) — enough to present + be honest.
export type DeepSkill = {
  id: string;
  name: string;
  oneLine: string;
  mechanism: string;
  characteristicMove: string; // the counter-intuitive expert move ([] → "")
  goodAt: string[];
  notGoodAt: string[]; // the HONEST edge — required to be meaningful
  useWhen: string[];
  verified: boolean; // false until super-u's outcome loop proves it — shown as UNPROVEN
  kind: string; // "skill" | "plugin" | "workflow" | "hook"
};

export type DeepenArtifact = {
  id: string; // stable id for the card (slug of source)
  source: DeepenSource;
  digest: string; // plain-language "educate me" summary (from the flywheel's artifact_text)
  graph: KnowledgeGraph;
  skills: DeepSkill[];
  producedBy: string; // "super-u" | "seed-example"
  generatedAt: string; // ISO; "" when never run
};

export type DeepenFeed = { artifacts: DeepenArtifact[] };

export const EMPTY_DEEPEN: DeepenFeed = { artifacts: [] };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isHttp = (u: string) => /^https?:\/\//i.test(u);
const strArr = (v: unknown, cap = 8) => (Array.isArray(v) ? v : []).map(str).filter(Boolean).slice(0, cap);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const NODE_CAP = 40;
const EDGE_CAP = 60;
const SKILL_CAP = 12;
const KINDS = ["skill", "plugin", "workflow", "hook"];

function cleanNode(raw: unknown): KGNode | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id) || slug(str(o.name));
  const name = str(o.name) || id;
  if (!id || !name) return null;
  return { id, type: str(o.type) || "concept", name, summary: str(o.summary).slice(0, 280) };
}

function cleanEdge(raw: unknown, ids: Set<string>): KGEdge | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = str(o.source);
  const target = str(o.target);
  // Drop dangling edges — an edge to a node that isn't in the graph is not groundable.
  if (!source || !target || !ids.has(source) || !ids.has(target)) return null;
  return { source, target, type: str(o.type) || "relates-to" };
}

function cleanSkill(raw: unknown): DeepSkill | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id) || slug(str(o.name));
  const name = str(o.name);
  if (!id || !name) return null;
  const notGoodAt = strArr(o.notGoodAt);
  // Honesty gate: a "skill" with no stated limits is a marketing claim, not a skill — drop it.
  if (notGoodAt.length === 0) return null;
  const kind = KINDS.includes(str(o.kind)) ? str(o.kind) : "skill";
  return {
    id,
    name,
    oneLine: str(o.oneLine).slice(0, 200),
    mechanism: str(o.mechanism).slice(0, 400),
    characteristicMove: str(o.characteristicMove).slice(0, 300),
    goodAt: strArr(o.goodAt),
    notGoodAt,
    useWhen: strArr(o.useWhen),
    verified: o.verified === true, // default UNPROVEN
    kind,
  };
}

function cleanGraph(raw: unknown): KnowledgeGraph {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const nodes = (Array.isArray(o.nodes) ? o.nodes : []).map(cleanNode).filter((n): n is KGNode => n != null).slice(0, NODE_CAP);
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(o.edges) ? o.edges : []).map((e) => cleanEdge(e, ids)).filter((e): e is KGEdge => e != null).slice(0, EDGE_CAP);
  const graphUrl = str(o.graphUrl);
  return { title: str(o.title), nodes, edges, graphUrl: isHttp(graphUrl) ? graphUrl : "" };
}

// Coerce one inbound artifact into a safe, groundable card. Returns null if it isn't
// groundable (no source url, no title) — the node refuses to surface ungrounded knowledge.
export function normalizeArtifact(raw: unknown): DeepenArtifact | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sraw = (o.source && typeof o.source === "object" ? o.source : {}) as Record<string, unknown>;
  const url = str(sraw.url);
  const title = str(sraw.title);
  if (!title || !isHttp(url)) return null; // must be grounded in a real, fetchable source

  const source: DeepenSource = { title, kind: str(sraw.kind) || "source", url, discoveredVia: str(sraw.discoveredVia) };
  const skills = (Array.isArray(o.skills) ? o.skills : []).map(cleanSkill).filter((s): s is DeepSkill => s != null).slice(0, SKILL_CAP);
  return {
    id: str(o.id) || slug(title),
    source,
    digest: str(o.digest).slice(0, 1200),
    graph: cleanGraph(o.graph),
    skills,
    producedBy: str(o.producedBy) || "super-u",
    generatedAt: str(o.generatedAt),
  };
}

export function normalizeDeepen(raw: unknown): DeepenFeed {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const artifacts: DeepenArtifact[] = [];
  for (const a of Array.isArray(o.artifacts) ? o.artifacts : []) {
    const c = normalizeArtifact(a);
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      artifacts.push(c);
    }
  }
  return { artifacts: artifacts.slice(0, 50) };
}

// Merge a freshly-ingested artifact into the feed (newest first, dedup by id).
export function upsertArtifact(feed: DeepenFeed, artifact: DeepenArtifact): DeepenFeed {
  const rest = feed.artifacts.filter((a) => a.id !== artifact.id);
  return normalizeDeepen({ artifacts: [artifact, ...rest] });
}

// Small helper for the UI/agent: counts that summarize a card.
export function artifactStats(a: DeepenArtifact): { nodes: number; edges: number; skills: number; proven: number } {
  return { nodes: a.graph.nodes.length, edges: a.graph.edges.length, skills: a.skills.length, proven: a.skills.filter((s) => s.verified).length };
}
