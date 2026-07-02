// ─────────────────────────────────────────────────────────────────────────────
// lib/github-repos.ts — fetch the OWNER's repos for the Projects sync. Unlike lib/sync.ts
// (which pulls PUBLIC repos of a hosted portfolio), this uses the authenticated endpoint so it
// includes PRIVATE repos — gated on GITHUB_TOKEN (owner's, server-side only). Graceful: any
// failure yields []. The caller (POST /api/sync-projects) merges the result via @core.
// ─────────────────────────────────────────────────────────────────────────────
import type { GithubRepo } from "@core/projects-types";

const UA = "agentic-portfolio projects-sync";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": UA };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function getJSON(url: string): Promise<unknown[] | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { headers: ghHeaders(), signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// The owner's repos. With GITHUB_TOKEN: the authenticated `/user/repos` (public + private, owned).
// Without a token: falls back to the public `/users/<handle>/repos` (public only, so a token-less
// deploy still syncs the public set rather than erroring). Paginates up to `maxPages`.
export async function fetchOwnerRepos(handle: string, maxPages = 3): Promise<GithubRepo[]> {
  const authed = Boolean(process.env.GITHUB_TOKEN);
  const out: GithubRepo[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = authed
      ? `https://api.github.com/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner`
      : `https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=100&page=${page}&sort=pushed`;
    const batch = await getJSON(url);
    if (!batch || batch.length === 0) break;
    out.push(...(batch as GithubRepo[]));
    if (batch.length < 100) break;
  }
  return out;
}
