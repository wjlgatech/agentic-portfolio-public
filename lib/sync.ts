// ─────────────────────────────────────────────────────────────────────────────
// lib/sync.ts — the network layer for portfolio sync (server-only). Pulls the two genuinely-public
// sources: GitHub (public API) and YouTube (public channel RSS — resolving @handle → channelId when
// needed). Thin wrappers over the pure parsers in @core/sync-types; every fetch is timeboxed and
// GRACEFUL (a failure yields []). X and LinkedIn are not fetched here — they're not server-syncable
// (see sourceFeasibility); the route reports their honest status instead.
// ─────────────────────────────────────────────────────────────────────────────
import {
  githubUserFromUrl, youtubeRefFromUrl, channelIdFromHtml,
  normalizeGitHubRepos, normalizeYouTubeFeed, type SyncItem,
} from "@core/sync-types";

const UA = "agentic-portfolio sync (reads public feeds)";

async function get(url: string, accept: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

export async function syncGitHub(profileUrl: string, cap = 6): Promise<SyncItem[]> {
  const user = githubUserFromUrl(profileUrl);
  if (!user) return [];
  const body = await get(`https://api.github.com/users/${user}/repos?per_page=30&sort=updated`, "application/vnd.github+json");
  if (!body) return [];
  try { return normalizeGitHubRepos(JSON.parse(body), cap); } catch { return []; }
}

export async function syncYouTube(channelUrl: string, cap = 6): Promise<SyncItem[]> {
  const ref = youtubeRefFromUrl(channelUrl);
  if (!ref) return [];
  let channelId = ref.channelId;
  if (!channelId && ref.handle) {
    // Resolve the handle → channelId from the public channel page.
    const html = await get(`https://www.youtube.com/${ref.handle.startsWith("@") ? ref.handle : "@" + ref.handle}`, "text/html");
    channelId = (html && channelIdFromHtml(html)) || undefined;
  }
  if (!channelId) return [];
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, "application/atom+xml");
  return xml ? normalizeYouTubeFeed(xml, cap) : [];
}

// Pull everything server-syncable for a portfolio, given its links map. Returns items + per-source counts.
export async function syncSources(links: Record<string, string | undefined>, cap = 6): Promise<{ items: SyncItem[]; counts: Record<string, number> }> {
  const [gh, yt] = await Promise.all([
    links.github ? syncGitHub(links.github, cap) : Promise.resolve([]),
    links.youtube ? syncYouTube(links.youtube, cap) : Promise.resolve([]),
  ]);
  return { items: [...gh, ...yt], counts: { github: gh.length, youtube: yt.length } };
}
