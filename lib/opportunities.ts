// ─────────────────────────────────────────────────────────────────────────────
// lib/opportunities.ts — the Opportunity Scout's server half: live PUBLIC-source searches +
// durable KV persistence (keyed per portfolio, like leads). Pure shapes/parsers/merge live in
// @core/opportunity-types; the LLM drafting happens in the route. Fetches are best-effort with
// tight timeouts — a blocked source returns [] honestly (never fabricated hits, never a crash).
// ─────────────────────────────────────────────────────────────────────────────
import { kvGetJSON, kvSetJSON, kvConfigured } from "@/lib/storage";
import { parseHnHits, parseRedditHits, type Opportunity } from "@core/opportunity-types";

const key = (slug: string) => `opps:${slug}`;

export async function listOpportunities(slug: string): Promise<Opportunity[]> {
  return (await kvGetJSON<Opportunity[]>(key(slug))) ?? [];
}

export async function writeOpportunities(slug: string, list: Opportunity[]): Promise<boolean> {
  const ok = await kvSetJSON(key(slug), list);
  return ok && kvConfigured();
}

async function getJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; agentic-portfolio scout)" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null; // 403/429 from a wall → honest empty, never invented
    return await r.json();
  } catch {
    return null;
  }
}

/** Hacker News via Algolia — reliably server-readable (probed). */
export async function searchHN(query: string): Promise<{ url: string; title: string; excerpt: string }[]> {
  const j = await getJson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`);
  return j ? parseHnHits(j) : [];
}

/** Reddit public JSON — usually 403-blocked from datacenter IPs; best-effort, degrades to []. */
export async function searchReddit(query: string): Promise<{ url: string; title: string; excerpt: string }[]> {
  const j = await getJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=5`);
  return j ? parseRedditHits(j) : [];
}
