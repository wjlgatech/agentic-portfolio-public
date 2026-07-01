// ─────────────────────────────────────────────────────────────────────────────
// lib/github-evidence.ts — live public-GitHub evidence for résumé verification.
//
// Proof is only as good as the corpus, so for the "Receipts" verifier we read the
// user's PUBLIC repos straight from api.github.com: real languages, real last-push
// dates, real README text. This is what turns "claims a repo exists" into "here is
// the repo, in this language, last touched this month, whose README says X."
//
// Rate-limit aware: ONE list call gets every repo; READMEs are fetched only for a
// capped set of the most relevant repos. Unauthenticated GitHub allows 60 req/hr;
// set GITHUB_TOKEN to raise it. Any failure degrades gracefully to metadata-only.
// ─────────────────────────────────────────────────────────────────────────────

export type RepoEvidence = {
  name: string;
  description: string;
  language: string | null;
  pushedAt: string; // ISO
  stars: number;
  topics: string[];
  url: string;
  readme?: string; // truncated, only for the capped relevant set
};

const README_CAP = 4; // how many repos to pull READMEs for (rate-limit + token budget)
const README_CHARS = 700; // free-tier LLMs have tight TPM limits; keep excerpts short

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

// Build the evidence corpus for `handle`. `prioritize` (repo names from the
// portfolio, e.g. featured public projects) decides which repos get their README read.
export async function buildGithubEvidence(handle: string, prioritize: string[] = []): Promise<RepoEvidence[]> {
  let list: RepoEvidence[] = [];
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=pushed`,
      { headers: ghHeaders(), cache: "no-store" },
    );
    if (!res.ok) return [];
    const repos = (await res.json()) as Array<Record<string, unknown>>;
    list = repos
      .filter((r) => r && !r.private && !r.fork)
      .map((r) => ({
        name: String(r.name ?? ""),
        description: String(r.description ?? "") || "",
        language: (r.language as string | null) ?? null,
        pushedAt: String(r.pushed_at ?? ""),
        stars: Number(r.stargazers_count ?? 0),
        topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
        url: String(r.html_url ?? `https://github.com/${handle}/${r.name}`),
      }))
      .filter((r) => r.name);
  } catch {
    return [];
  }

  // Choose which repos to deep-read: prioritized names first, then most-recent.
  const wanted = new Set(prioritize.map((n) => n.toLowerCase()));
  const ordered = [...list].sort((a, b) => {
    const pa = wanted.has(a.name.toLowerCase()) ? 1 : 0;
    const pb = wanted.has(b.name.toLowerCase()) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (b.pushedAt || "").localeCompare(a.pushedAt || "");
  });

  await Promise.all(
    ordered.slice(0, README_CAP).map(async (r) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${handle}/${r.name}/readme`, {
          headers: { ...ghHeaders(), Accept: "application/vnd.github.raw" },
          cache: "no-store",
        });
        if (res.ok) r.readme = (await res.text()).slice(0, README_CHARS);
      } catch {
        /* leave readme undefined — metadata still counts as evidence */
      }
    }),
  );

  return ordered;
}
