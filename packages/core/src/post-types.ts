// ─────────────────────────────────────────────────────────────────────────────
// post-types.ts — HOSTED WRITING for a hosted portfolio (/p/<slug>): articles and ideas the owner
// writes ON the portfolio, not links to somewhere else. Pure: no fs, no fetch, no Next types —
// unit-tested by scripts/test-posts.mjs.
//
// Why it exists: a teammate's first ask was "a back office where I upload my own articles and ideas"
// (2026-10-07). Before this, a hosted owner could only add a LINK to writing hosted elsewhere.
//
// Safety model: the body is Markdown written by the owner and shown to every visitor, so the renderer
// is XSS-safe BY CONSTRUCTION — it HTML-escapes the whole input first, then emits only a fixed set of
// tags it builds itself; a link is emitted only for http(s) URLs. There is no raw-HTML pass-through.
// ─────────────────────────────────────────────────────────────────────────────

export type PostKind = "article" | "idea";

export type Post = {
  /** stable id, URL-safe: p-<base36 time><rand> (titles may be Chinese, so ids are not title slugs) */
  id: string;
  kind: PostKind;
  title: string;
  /** Markdown, any language */
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_POSTS = 200;
export const MAX_BODY = 40_000;
export const MAX_TITLE = 160;
export const postsKey = (slug: string) => `posts:${slug}`;

const str = (v: unknown, cap: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, cap) : "");

export function newPostId(now = Date.now(), rand = Math.random()): string {
  return `p-${now.toString(36)}${Math.floor(rand * 1296).toString(36).padStart(2, "0")}`;
}

/** Validate an owner-sent post. Returns the clean post or an error string. The server owns id + timestamps. */
export function cleanPost(raw: unknown, existing: Post | undefined, now = new Date(), id = newPostId(now.getTime())): Post | string {
  if (!raw || typeof raw !== "object") return "post must be an object";
  const o = raw as Record<string, unknown>;
  const kind: PostKind = o.kind === "idea" ? "idea" : "article";
  const body = str(o.body, MAX_BODY);
  if (!body) return "the post has no text";
  // An idea may be untitled: its first line (or first 60 chars) becomes the title.
  let title = str(o.title, MAX_TITLE);
  if (!title && kind === "idea") title = body.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60);
  if (!title) return "an article needs a title";
  const tags = Array.isArray(o.tags) ? o.tags.map((t) => str(t, 30)).filter(Boolean).slice(0, 8) : [];
  const stamp = now.toISOString();
  return {
    id: existing?.id ?? id,
    kind,
    title,
    body,
    ...(tags.length ? { tags } : {}),
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
}

/** Insert or replace by id; newest first; capped. */
export function upsertPost(all: Post[], post: Post): Post[] {
  const rest = all.filter((p) => p.id !== post.id);
  return [post, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_POSTS);
}

export function removePost(all: Post[], id: string): Post[] {
  return all.filter((p) => p.id !== id);
}

// ── rendering ────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Inline Markdown on ALREADY-ESCAPED text: `code`, **bold**, *italic*, [text](http(s)://url). */
function inline(escaped: string): string {
  const codes: string[] = [];
  let s = escaped.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => `<a href="${url}" rel="noopener nofollow" target="_blank">${text}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

/** Markdown → safe HTML. Supports headings (#–###), paragraphs, lists, quotes, fenced code, inline marks. */
export function renderMarkdown(md: string): string {
  const lines = esc(md.replace(/\r\n?/g, "\n")).split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { const n = h[1].length + 1; out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (/^&gt;\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ""));
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const re = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(re, ""))}</li>`);
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|&gt;|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join("<br>"))}</p>`);
  }
  return out.join("\n");
}

/** Plain-text excerpt for cards, meta descriptions and the agent's grounding. */
export function excerpt(md: string, cap = 220): string {
  const t = md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`_\[\]()-]/g, " ").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return t.length > cap ? `${t.slice(0, cap - 1)}…` : t;
}

/** What the portfolio's agent may quote from: titles + text, newest first, under a character budget. */
export function postsEvidence(posts: Post[], budget = 30_000): string {
  let used = 0;
  const parts: string[] = [];
  for (const p of posts) {
    const block = `[${p.kind === "idea" ? "Idea" : "Article"}] ${p.title} (${p.createdAt.slice(0, 10)})\n${p.body}`;
    if (used + block.length > budget) { parts.push(`[${p.kind}] ${p.title} — ${excerpt(p.body, 300)}`); used += 320; if (used > budget) break; continue; }
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}
