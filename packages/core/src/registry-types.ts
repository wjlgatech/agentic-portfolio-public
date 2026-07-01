// ─────────────────────────────────────────────────────────────────────────────
// lib/registry-types.ts — the PURE core of the Portfolio Registry (the network's DNS):
// the entry type, normalization, and the search/rank function. NO node:fs, so the
// client /network page can import searchRegistry directly. The fs read/write layer
// lives in lib/registry.ts.
//
// An entry indexes one A2A agent-portfolio (discovered from its /.well-known agent
// card). The registry turns a pile of isolated portfolios into a searchable network:
// "find people who shipped agent-verification tooling" → ranked, each queryable via A2A.
// ─────────────────────────────────────────────────────────────────────────────

export type RegistrySkill = { id: string; name: string };

export type RegistryEntry = {
  handle: string; // stable slug/id
  name: string;
  url: string; // the portfolio origin
  cardUrl: string; // the /.well-known agent-card URL
  a2aUrl: string; // the JSON-RPC endpoint (so anyone can query this agent)
  description: string;
  skills: RegistrySkill[];
  tags: string[];
  addedAt: string; // ISO
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function cleanEntry(raw: unknown): RegistryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const url = str(o.url);
  const name = str(o.name);
  if (!name || !/^https?:\/\//i.test(url)) return null;
  const handle = (str(o.handle) || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "node";
  const skills = (Array.isArray(o.skills) ? o.skills : [])
    .map((s) => ({ id: str((s as Record<string, unknown>)?.id), name: str((s as Record<string, unknown>)?.name) }))
    .filter((s) => s.id || s.name)
    .slice(0, 20);
  const tags = (Array.isArray(o.tags) ? o.tags : []).map(str).filter(Boolean).slice(0, 20);
  return {
    handle,
    name: name.slice(0, 120),
    url,
    cardUrl: str(o.cardUrl) || `${url.replace(/\/+$/, "")}/.well-known/agent-card.json`,
    a2aUrl: str(o.a2aUrl) || `${url.replace(/\/+$/, "")}/api/a2a`,
    description: str(o.description).slice(0, 500),
    skills,
    tags,
    addedAt: str(o.addedAt) || "",
  };
}

export function normalizeRegistry(raw: unknown): RegistryEntry[] {
  const arr = Array.isArray(raw) ? raw : Array.isArray((raw as Record<string, unknown>)?.entries) ? (raw as Record<string, unknown>).entries : [];
  const seen = new Set<string>();
  const out: RegistryEntry[] = [];
  for (const e of arr as unknown[]) {
    const c = cleanEntry(e);
    if (!c) continue;
    const key = c.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// Score an entry against a free-text query: weighted matches across name/handle/skills/
// tags/description. 0 = no match. This is the index-search MVP of "federated search";
// the 10x upgrade fans out an A2A message/send to the top matches for grounded answers.
export function scoreEntry(e: RegistryEntry, q: string): number {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1; // empty query → everything, stable order
  const name = e.name.toLowerCase();
  const handle = e.handle.toLowerCase();
  const skills = e.skills.map((s) => `${s.id} ${s.name}`).join(" ").toLowerCase();
  const tags = e.tags.join(" ").toLowerCase();
  const desc = e.description.toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (name.includes(t)) score += 5;
    if (handle.includes(t)) score += 4;
    if (tags.includes(t)) score += 4;
    if (skills.includes(t)) score += 3;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

export function searchRegistry(entries: RegistryEntry[], q: string): RegistryEntry[] {
  const query = q.trim();
  return entries
    .map((e) => ({ e, s: scoreEntry(e, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.e.addedAt < b.e.addedAt ? 1 : -1))
    .map((x) => x.e);
}

// ── The self-propelling network: growth, a capability marketplace, and reciprocity ──────────
// Every node makes the next join more valuable — this is what a network (not a directory) means.

const skillKey = (e: RegistryEntry): string[] =>
  Array.from(new Set(e.skills.map((s) => (s.name || s.id).trim()).filter(Boolean)));

// The Metcalfe framing: value ≈ the number of possible connections, which grows with N².
export function networkStats(entries: RegistryEntry[]): { nodes: number; skills: number; connections: number } {
  const skills = new Set<string>();
  for (const e of entries) for (const s of skillKey(e)) skills.add(s.toLowerCase());
  const n = entries.length;
  return { nodes: n, skills: skills.size, connections: (n * (n - 1)) / 2 };
}

// The capability marketplace: which nodes offer each skill, most-offered first. Turns the
// directory into "who can do X?" — the demand loop that makes joining worth it.
export function skillIndex(entries: RegistryEntry[]): { skill: string; nodes: RegistryEntry[] }[] {
  const map = new Map<string, RegistryEntry[]>();
  for (const e of entries) {
    for (const key of skillKey(e)) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
  }
  return [...map.entries()]
    .map(([skill, nodes]) => ({ skill, nodes }))
    .sort((a, b) => b.nodes.length - a.nodes.length || a.skill.localeCompare(b.skill));
}

// Peers "like" a node (shared skills/tags) — the reciprocity nudge shown right after you join,
// so a new node immediately sees who to connect with (and every peer gains a potential edge).
export function peersLike(entry: RegistryEntry, entries: RegistryEntry[], limit = 3): RegistryEntry[] {
  const terms = (e: RegistryEntry) => new Set<string>([...skillKey(e).map((s) => s.toLowerCase()), ...e.tags.map((t) => t.toLowerCase())]);
  const mine = terms(entry);
  return entries
    .filter((e) => e.url.replace(/\/+$/, "").toLowerCase() !== entry.url.replace(/\/+$/, "").toLowerCase())
    .map((e) => {
      const theirs = terms(e);
      let overlap = 0;
      for (const m of mine) if (theirs.has(m)) overlap++;
      return { e, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((x) => x.e);
}
