// ─────────────────────────────────────────────────────────────────────────────
// /api/repo-activity — recent PR activity per repo, for ranking the Projects grid by
// "most frequent PR in the last 30 days." Efficient: ONE GitHub search (the owner's
// PRs created in the window) aggregated by repo, instead of N per-repo calls.
// Public data; degrades to empty counts on throttle/error (the grid still sorts by date).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { profile } from "@/content/profile";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const MAX_PAGES = 3; // up to 300 PRs

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`repo-activity:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.`, counts: {} }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const counts: Record<string, number> = {};
  let total = 0;
  try {
    const q = encodeURIComponent(`author:${profile.handle} is:pr created:>=${since}`);
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`https://api.github.com/search/issues?q=${q}&per_page=100&page=${page}`, {
        headers: ghHeaders(),
        cache: "no-store",
      });
      if (!res.ok) break; // rate-limited / error → return what we have
      const data = (await res.json()) as { items?: Array<{ repository_url?: string }>; total_count?: number };
      const items = data.items ?? [];
      for (const it of items) {
        const name = String(it.repository_url ?? "").split("/").pop() ?? "";
        if (name) counts[name] = (counts[name] ?? 0) + 1;
      }
      total += items.length;
      if (items.length < 100) break; // last page
    }
  } catch {
    /* network error → empty counts */
  }

  return NextResponse.json(
    // `authed` lets the UI self-diagnose: without a token the PR search is public-only, so
    // PRIVATE repos' PR counts come back 0 (GitHub won't return them unauthenticated).
    { since, windowDays: WINDOW_DAYS, total, counts, authed: Boolean(process.env.GITHUB_TOKEN) },
    { headers: { "Cache-Control": "public, max-age=900" } }, // 15-min cache
  );
}
