// ─────────────────────────────────────────────────────────────────────────────
// sync-types.ts — keep a portfolio fresh from its PUBLIC sources (pure, fs/network-free → testable).
// Feasibility is honest and encoded here (from real probes): GitHub + YouTube expose public feeds a
// server can pull (API / RSS, no key); X and LinkedIn are paid/login-walled, so they are NOT
// server-syncable — they degrade to in-browser harvest or manual paste. We never claim a pull a
// wall forbids. Parsers take raw text (JSON/XML) so they unit-test with fixtures; the fetch layer
// (lib/sync.ts) is a thin wrapper. Merge is dedupe-by-url, newest-first, capped (idempotent re-sync).
// ─────────────────────────────────────────────────────────────────────────────

export type SourceKind = "github" | "youtube" | "x" | "linkedin";
export type SyncItem = { source: SourceKind; title: string; url: string; date?: string; summary?: string; category?: string };

// The honest capability map — computed, not vibes.
export function sourceFeasibility(kind: SourceKind): { serverSyncable: boolean; how: string } {
  switch (kind) {
    case "github": return { serverSyncable: true, how: "Public GitHub API — your recent repos + activity." };
    case "youtube": return { serverSyncable: true, how: "Public channel RSS feed — no API key, no login." };
    case "x": return { serverSyncable: false, how: "X needs a paid API or login — add posts in your browser or paste them; not auto-synced server-side." };
    case "linkedin": return { serverSyncable: false, how: "LinkedIn's feed is login-walled — import posts in YOUR browser (the harvester), never a server." };
  }
}

const stripSlash = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "");

export function githubUserFromUrl(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    if (!/(^|\.)github\.com$/i.test(u.hostname)) return null;
    const seg = u.pathname.split("/").filter(Boolean)[0];
    return seg && /^[a-z0-9-]{1,39}$/i.test(seg) ? seg : null;
  } catch { return null; }
}

// A YouTube URL may carry the channel id directly (/channel/UC…) or a handle (/@name, /c/name, /user/name)
// that must be resolved to a channel id by the fetch layer.
export function youtubeRefFromUrl(url: string): { channelId?: string; handle?: string } | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    if (!/(^|\.)youtube\.com$/i.test(u.hostname) && !/(^|\.)youtu\.be$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && /^UC[\w-]{20,}$/.test(parts[1] || "")) return { channelId: parts[1] };
    if (parts[0]?.startsWith("@")) return { handle: parts[0] };
    if ((parts[0] === "c" || parts[0] === "user") && parts[1]) return { handle: parts[1] };
    if (parts[0]?.startsWith("@") === false && parts.length === 1 && parts[0]) return { handle: `@${parts[0].replace(/^@/, "")}` };
    return null;
  } catch { return null; }
}

// Extract a channelId from a fetched YouTube channel HTML page (for handle URLs).
export function channelIdFromHtml(html: string): string | null {
  const m = html.match(/"channelId":"(UC[\w-]{20,})"/) || html.match(/channel\/(UC[\w-]{20,})/);
  return m ? m[1] : null;
}

export function normalizeGitHubRepos(reposJson: unknown, cap = 6): SyncItem[] {
  const arr = Array.isArray(reposJson) ? reposJson : [];
  return arr
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !(r as Record<string, unknown>).fork && !(r as Record<string, unknown>).private)
    .map((r) => ({
      source: "github" as const,
      title: String(r.name ?? "").slice(0, 120),
      url: String(r.html_url ?? ""),
      date: typeof r.pushed_at === "string" ? r.pushed_at : undefined,
      summary: typeof r.description === "string" ? r.description.slice(0, 240) : undefined,
      category: "GitHub",
    }))
    .filter((i) => i.title && /^https?:\/\//.test(i.url))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, cap);
}

export function normalizeYouTubeFeed(xml: string, cap = 6): SyncItem[] {
  const items: SyncItem[] = [];
  const entries = xml.split(/<entry>/).slice(1);
  for (const e of entries) {
    const title = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const url = e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
    const date = e.match(/<published>([^<]+)<\/published>/)?.[1];
    if (title && /^https?:\/\//.test(url)) items.push({ source: "youtube", title: decodeXml(title).slice(0, 160), url, date, category: "YouTube" });
  }
  return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, cap);
}

function decodeXml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

// Merge incoming items over existing: dedupe by URL (incoming wins), newest-first, capped. Idempotent.
export function mergeFeed(existing: SyncItem[], incoming: SyncItem[], cap = 24): SyncItem[] {
  const byUrl = new Map<string, SyncItem>();
  for (const it of existing) if (it?.url) byUrl.set(stripSlash(it.url), it);
  for (const it of incoming) if (it?.url) byUrl.set(stripSlash(it.url), it);
  return [...byUrl.values()]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, cap);
}
