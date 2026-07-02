// ─────────────────────────────────────────────────────────────────────────────
// lib/writing-sync.ts — server side of the Writing sync: fetch a server-rss source's feed and
// parse it into Articles. Bounded + SSRF-guarded (reuses lib/source-fetch). Browser-harvest
// sources (LinkedIn/X) are NOT fetched here — they run in the owner's browser. Pure parsing +
// the registry live in @core/writing-sources.
// ─────────────────────────────────────────────────────────────────────────────
import { resolveFeedUrl, parseFeedArticles, type WritingSource } from "@core/writing-sources";
import { isBlockedHost } from "@/lib/source-fetch";

type Article = { title: string; url: string; date: string; category: string; summary: string };

async function fetchFeed(url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if ((u.protocol !== "http:" && u.protocol !== "https:") || isBlockedHost(u.hostname)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": "agentic-portfolio writing-sync (reads public feeds)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 500_000);
  } catch {
    return null;
  }
}

export type SourceResult = { kind: string; label: string; method: "server-rss" | "browser-harvest" | "mcp"; count: number; error?: string };

// Sync ONE source. Server-rss → fetch + parse. Anything else → no items (caller reports it as
// "harvest in your browser" for LinkedIn/X, or "MCP" for the long tail).
export async function syncOneSource(source: WritingSource): Promise<{ items: Article[]; result: SourceResult }> {
  const feed = resolveFeedUrl(source);
  const base: SourceResult = { kind: source.kind, label: source.label, method: feed ? "server-rss" : source.kind === "linkedin" || source.kind === "x" ? "browser-harvest" : "mcp", count: 0 };
  if (!feed) return { items: [], result: base };
  const xml = await fetchFeed(feed);
  if (!xml) return { items: [], result: { ...base, error: "couldn't fetch the feed" } };
  const items = parseFeedArticles(xml, source.label);
  return { items, result: { ...base, count: items.length } };
}

// Sync every server-rss source in the registry; return all fetched items + a per-source report.
export async function syncWritingSources(sources: WritingSource[]): Promise<{ items: Article[]; results: SourceResult[] }> {
  const settled = await Promise.all((Array.isArray(sources) ? sources : []).map((s) => syncOneSource(s)));
  return { items: settled.flatMap((s) => s.items), results: settled.map((s) => s.result) };
}
