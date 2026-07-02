// ─────────────────────────────────────────────────────────────────────────────
// writing-sources.ts — the Writing sync registry + a generic RSS/Atom → Article parser. PURE
// (fs-free), so the client, the server route, and a plain-Node test all import it.
//
// Each source declares a SYNC METHOD, so "many sources" plug in without new code:
//   • server-rss     — a public feed the server can pull (Substack, Medium, any RSS/Atom URL)
//   • browser-harvest — login-walled, must run in the owner's browser (LinkedIn; X is walled/paid)
//   • mcp             — reserved: a source fetched via an MCP tool (the long-tail path; see AGENTS.md)
// A new server-rss source = one registry entry + a feed URL. No parser change.
// ─────────────────────────────────────────────────────────────────────────────

export type SyncMethod = "server-rss" | "browser-harvest" | "mcp";
export type WritingSourceKind = "linkedin" | "x" | "substack" | "medium" | "rss";

export type WritingSource = {
  kind: WritingSourceKind;
  ref: string; // a handle ("@me", "myblog") or a full feed/profile URL
  label: string; // display + article category
};

// One row per kind: its method + how to turn `ref` into a fetchable feed URL (server-rss only).
export const SOURCE_CATALOG: Record<WritingSourceKind, { method: SyncMethod; label: string; feed?: (ref: string) => string | null }> = {
  substack: {
    method: "server-rss",
    label: "Substack",
    feed: (ref) => {
      const r = ref.trim().replace(/^@/, "");
      if (/^https?:\/\//i.test(r)) return `${r.replace(/\/+$/, "")}/feed`;
      const host = r.includes(".") ? r : `${r}.substack.com`;
      return `https://${host.replace(/\/+$/, "")}/feed`;
    },
  },
  medium: {
    method: "server-rss",
    label: "Medium",
    feed: (ref) => {
      const r = ref.trim();
      if (/^https?:\/\//i.test(r)) return r.includes("/feed/") ? r : r.replace("medium.com/", "medium.com/feed/");
      const handle = r.startsWith("@") ? r : `@${r}`;
      return `https://medium.com/feed/${handle}`;
    },
  },
  rss: { method: "server-rss", label: "RSS", feed: (ref) => (/^https?:\/\//i.test(ref.trim()) ? ref.trim() : null) },
  linkedin: { method: "browser-harvest", label: "LinkedIn" },
  x: { method: "browser-harvest", label: "X" },
};

export function sourceMethod(kind: WritingSourceKind): SyncMethod {
  return SOURCE_CATALOG[kind]?.method ?? "browser-harvest";
}

// The feed URL for a server-rss source, or null (browser-harvest / bad ref).
export function resolveFeedUrl(source: WritingSource): string | null {
  const entry = SOURCE_CATALOG[source.kind];
  if (!entry || entry.method !== "server-rss" || !entry.feed) return null;
  const url = entry.feed(source.ref);
  return url && /^https?:\/\//i.test(url) ? url : null;
}

// ── generic feed parsing (RSS <item> + Atom <entry>) → Article ────────────────
type Article = { title: string; url: string; date: string; category: string; summary: string };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

// Unwrap CDATA BEFORE stripping tags (else the `]]>` marker leaks into the text), then decode.
const stripTags = (s: string) =>
  decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const first = (block: string, tags: string[]): string => {
  for (const t of tags) {
    const m = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, "i"));
    if (m?.[1]) return m[1].trim();
  }
  return "";
};

// RSS <link>url</link>; Atom <link href="url"/> (prefer rel="alternate"/no rel).
const linkOf = (block: string): string => {
  const rss = block.match(/<link>\s*([\s\S]*?)\s*<\/link>/i)?.[1]?.trim();
  if (rss && /^https?:\/\//i.test(rss)) return decode(rss);
  const atoms = [...block.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/gi)];
  const alt = atoms.find((m) => /rel="alternate"/i.test(m[0])) ?? atoms.find((m) => !/rel="/i.test(m[0])) ?? atoms[0];
  return alt?.[1] ? decode(alt[1]) : "";
};

const toYearMonth = (raw: string): string => {
  if (!raw) return "";
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// Parse an RSS or Atom feed body into Articles (newest first, capped). `category` tags every item.
export function parseFeedArticles(xml: string, category: string, cap = 20): Article[] {
  if (typeof xml !== "string" || !xml) return [];
  const blocks = xml.includes("<item") ? xml.split(/<item[\s>]/i).slice(1) : xml.split(/<entry[\s>]/i).slice(1);
  const out: Article[] = [];
  for (const b of blocks) {
    const title = stripTags(first(b, ["title"]));
    const url = linkOf(b);
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const date = toYearMonth(first(b, ["pubDate", "published", "updated", "dc:date"]));
    const summary = stripTags(first(b, ["description", "summary", "content"])).slice(0, 280);
    out.push({ title: title.slice(0, 200), url, date, category: category || "Writing", summary });
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, cap);
}

// Merge incoming articles into existing, dedupe by url (existing wins — keeps owner edits).
export function mergeArticles(existing: Article[], incoming: Article[]): { merged: Article[]; added: number } {
  const seen = new Set((Array.isArray(existing) ? existing : []).map((a) => a.url));
  let added = 0;
  const merged = [...(Array.isArray(existing) ? existing : [])];
  for (const a of Array.isArray(incoming) ? incoming : []) {
    if (!a?.url || seen.has(a.url)) continue;
    seen.add(a.url);
    merged.push(a);
    added++;
  }
  return { merged, added };
}
