// ─────────────────────────────────────────────────────────────────────────────
// projects-types.ts — the Projects model + the GitHub-sync merge. PURE (fs-free), so the
// client `Projects.tsx`, the server `lib/projects.ts`, and a plain-Node test all import it.
//
// The merge is the careful part: a sync updates the LIVE/objective fields (language, stars,
// pushed, private, url) but PRESERVES the owner's curation (category, highlight, featured) for
// repos already listed. New repos come in with the GitHub description as a high-level highlight
// and a default category. Nothing is ever deleted (a partial/failed fetch must not wipe curation).
// Private repos keep url:null — the "view →" link is DERIVED from the owner's base at render, so a
// private URL is never persisted (matches Projects.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export type Project = {
  name: string;
  category: string;
  highlight: string;
  featured: boolean;
  private: boolean;
  language: string | null;
  stars: number;
  pushed: string; // YYYY-MM-DD
  url: string | null;
};

// The minimal shape we read off the GitHub REST repo object.
export type GithubRepo = {
  name?: unknown;
  description?: unknown;
  language?: unknown;
  stargazers_count?: unknown;
  pushed_at?: unknown;
  private?: unknown;
  html_url?: unknown;
  fork?: unknown;
  archived?: unknown;
};

// New repos land here until the owner recategorizes (a safe existing bucket; shows under "All").
export const DEFAULT_CATEGORY = "AI Products & Applications";

const str = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown): boolean => v === true;

export function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = str(o.name, 120);
  if (!name) return null;
  return {
    name,
    category: str(o.category, 80) || DEFAULT_CATEGORY,
    highlight: str(o.highlight, 300),
    featured: bool(o.featured),
    private: bool(o.private),
    language: typeof o.language === "string" ? o.language : null,
    stars: Number.isFinite(Number(o.stars)) ? Math.max(0, Math.floor(Number(o.stars))) : 0,
    pushed: str(o.pushed, 10),
    url: typeof o.url === "string" && /^https?:\/\//.test(o.url) ? o.url : null,
  };
}

// Clean an array, drop invalid, newest-pushed first (stable output).
export function normalizeProjects(raw: unknown): Project[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map(normalizeProject)
    .filter((p): p is Project => p !== null)
    .sort((a, b) => (b.pushed ?? "").localeCompare(a.pushed ?? ""));
}

// Map a GitHub repo → the live fields we sync (curated fields handled by the merge).
function liveFields(r: GithubRepo): Pick<Project, "language" | "stars" | "pushed" | "private" | "url"> {
  const isPrivate = bool(r.private);
  return {
    language: typeof r.language === "string" ? r.language : null,
    stars: Number.isFinite(Number(r.stargazers_count)) ? Math.max(0, Math.floor(Number(r.stargazers_count))) : 0,
    pushed: typeof r.pushed_at === "string" ? r.pushed_at.slice(0, 10) : "",
    private: isPrivate,
    // Keep private url null (link is derived at render). Public repos store their real url.
    url: isPrivate ? null : typeof r.html_url === "string" && /^https?:\/\//.test(r.html_url) ? r.html_url : null,
  };
}

export type MergeResult = { merged: Project[]; added: string[]; updated: string[]; skipped: number };
// `addNewSince` (YYYY-MM-DD): a NEW repo is only added if pushed on/after this date — keeps the
// curated grid from filling with old scratch repos. Existing repos always update regardless.
export type MergeOptions = { addNewSince?: string };

// Merge a fresh GitHub repo list into the current projects. Preserves curated fields
// (category, highlight, featured) for EXISTING repos; updates their live fields; never deletes.
// A NEW repo is added only if it's informative (has a description) and recent enough
// (`addNewSince`) — forks + archived repos are always skipped.
export function mergeGithubRepos(current: Project[], repos: GithubRepo[], opts: MergeOptions = {}): MergeResult {
  const byKey = new Map<string, Project>();
  for (const p of normalizeProjects(current)) byKey.set(p.name.toLowerCase(), p);

  const added: string[] = [];
  const updated: string[] = [];
  let skipped = 0;

  for (const r of Array.isArray(repos) ? repos : []) {
    if (bool(r.fork) || bool(r.archived)) continue;
    const name = str(r.name, 120);
    if (!name) continue;
    const key = name.toLowerCase();
    const live = liveFields(r);
    const existing = byKey.get(key);

    if (existing) {
      // Always update an already-curated repo's live fields; keep its curation.
      const next: Project = { ...existing, ...live };
      if (JSON.stringify(next) !== JSON.stringify(existing)) updated.push(name);
      byKey.set(key, next);
      continue;
    }

    // New repo: only surface it if it's informative + recent, so the curated grid stays lean.
    const description = str(r.description, 200);
    if (!description) { skipped++; continue; }
    if (opts.addNewSince && live.pushed && live.pushed < opts.addNewSince) { skipped++; continue; }
    byKey.set(key, { name, category: DEFAULT_CATEGORY, highlight: description, featured: false, ...live });
    added.push(name);
  }

  return { merged: normalizeProjects([...byKey.values()]), added, updated, skipped };
}
