// ─────────────────────────────────────────────────────────────────────────────
// lib/github-collab.ts — discover REAL collaborator candidates from public GitHub.
//
// The scout must never invent a person. So we DISCOVER real handles here (via a few
// bounded GitHub repo searches in the user's topic neighborhood), and the LLM may
// only rank/explain handles that appear in this candidate set — anything else is
// filtered out in the route. Rate-limit aware (unauthenticated search is ~10/min;
// GITHUB_TOKEN raises it). Degrades gracefully to [] on throttle/empty.
// ─────────────────────────────────────────────────────────────────────────────

export type CollabCandidate = {
  handle: string;
  url: string;
  viaRepo: string; // the repo that surfaced them
  viaRepoUrl: string;
  viaTopic: string; // the query that found them
  repoDescription: string;
  repoStars: number;
};

const MAX_QUERIES = 4;
const PER_QUERY = 10;

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

// `selfHandle` is excluded from results. `topics` are searched in order, bounded.
export async function discoverCollaborators(selfHandle: string, topics: string[]): Promise<CollabCandidate[]> {
  const self = selfHandle.toLowerCase();
  const seen = new Set<string>([self]);
  const out: CollabCandidate[] = [];

  for (const topic of topics.slice(0, MAX_QUERIES)) {
    const q = encodeURIComponent(`${topic} stars:>5 pushed:>2026-01-01`);
    try {
      const res = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=updated&per_page=${PER_QUERY}`, {
        headers: ghHeaders(),
        cache: "no-store",
      });
      if (!res.ok) continue; // rate-limited or bad query — skip this topic
      const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
      for (const repo of data.items ?? []) {
        const owner = repo.owner as Record<string, unknown> | undefined;
        const handle = String(owner?.login ?? "");
        if (!handle || seen.has(handle.toLowerCase())) continue;
        if (owner?.type !== "User") continue; // people, not orgs, for "collaborators"
        seen.add(handle.toLowerCase());
        out.push({
          handle,
          url: String(owner?.html_url ?? `https://github.com/${handle}`),
          viaRepo: String(repo.full_name ?? repo.name ?? ""),
          viaRepoUrl: String(repo.html_url ?? ""),
          viaTopic: topic,
          repoDescription: String(repo.description ?? "") || "",
          repoStars: Number(repo.stargazers_count ?? 0),
        });
      }
    } catch {
      /* network error — skip */
    }
  }
  return out;
}
