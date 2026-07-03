// ─────────────────────────────────────────────────────────────────────────────
// opportunity-types.ts — the Opportunity Scout's pure core (fs/network-free → testable).
// The proactive half of a portfolio: instead of waiting to be discovered, the agent MONITORS
// public discussions relevant to the owner's mission (an after-storm thread for a roofer, a
// first-5K thread for a running club), and DRAFTS a genuinely helpful, affiliation-disclosed
// reply the OWNER posts from their own account. The hard line, same as scout/compass/outreach:
// the machine hunts and drafts at scale; a human always owns Send. Nothing here (or in the
// route) ever posts to a third-party platform — that's a ToS violation and a brand killer.
//
// Sources are PUBLIC-read only (probed, honest): HN's Algolia API works server-side; Reddit's
// public JSON usually 403s from datacenter IPs (best-effort, degrades honestly); login-walled
// communities (Facebook groups, Skool, LinkedIn) are NOT server-readable and never claimed.
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig } from "./instance-types.ts";

export const OPP_SOURCES = ["hn", "reddit"] as const;
export type OppSource = (typeof OPP_SOURCES)[number];

export const OPP_STATUSES = ["drafted", "sent", "skipped"] as const;
export type OppStatus = (typeof OPP_STATUSES)[number];

export type Opportunity = {
  id: string;        // deterministic hash of the thread url → dedupe across scout runs
  source: OppSource;
  url: string;       // the live discussion the OWNER opens to post
  title: string;
  excerpt: string;   // what the thread says (capped)
  query: string;     // which watch-query surfaced it
  at: string;        // ISO: when the scout found it
  draft: string;     // the drafted, affiliation-disclosed reply (owner reviews, edits, posts)
  status: OppStatus; // drafted → sent|skipped, set by the OWNER (closes the measure loop)
};

export const MAX_OPPORTUNITIES = 200;
export const MAX_NEW_PER_RUN = 6; // LLM drafting is budget-bounded (free-tier TPM)

// djb2 → hex (same convention as feedback-types): deterministic, not cryptographic.
export function oppId(url: string): string {
  let h = 5381;
  const s = url.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

const str = (v: unknown, cap: number) => (typeof v === "string" ? v.trim().slice(0, cap) : "");

/** Derive watch-queries from what the instance actually offers — grounded, deterministic. */
export function buildQueries(config: InstanceConfig, extra: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (q: string) => {
    const c = q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (c.length >= 3 && !seen.has(c)) { seen.add(c); out.push(c); }
  };
  for (const e of extra) add(String(e ?? ""));
  for (const o of config.content?.offerings ?? []) add(o.name);
  add(config.entity.tagline);
  return out.slice(0, 5); // capped: each query is a live search + potential LLM drafts
}

/** Validate + cap a raw hit from any source into an Opportunity (draft attached separately). */
export function normalizeHit(raw: unknown, source: OppSource, query: string, nowIso: string): Omit<Opportunity, "draft" | "status"> | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const url = str(o.url, 400);
  const title = str(o.title, 200);
  if (!/^https?:\/\//i.test(url) || !title) return null;
  return { id: oppId(url), source, url, title, excerpt: str(o.excerpt, 500), query: query.slice(0, 80), at: nowIso };
}

/** Parse HN Algolia search JSON → hits (pure; the fetch lives in lib). */
export function parseHnHits(json: unknown): { url: string; title: string; excerpt: string }[] {
  const o = (json ?? {}) as Record<string, unknown>;
  const hits = Array.isArray(o.hits) ? o.hits : [];
  return hits
    .map((h) => {
      const r = (h ?? {}) as Record<string, unknown>;
      const id = str(r.objectID, 20);
      if (!id) return null;
      return {
        url: `https://news.ycombinator.com/item?id=${id}`, // the DISCUSSION (where a reply goes), not the article
        title: str(r.title, 200) || str(r.story_title, 200),
        excerpt: str(r.story_text, 500) || str(r.comment_text, 500) || str(r.url, 300),
      };
    })
    .filter((x): x is { url: string; title: string; excerpt: string } => x !== null && x.title.length > 0);
}

/** Parse Reddit public search JSON → hits (pure; usually 403-blocked server-side — best-effort). */
export function parseRedditHits(json: unknown): { url: string; title: string; excerpt: string }[] {
  const o = (json ?? {}) as Record<string, unknown>;
  const data = (o.data ?? {}) as Record<string, unknown>;
  const children = Array.isArray(data.children) ? data.children : [];
  return children
    .map((c) => {
      const d = (((c ?? {}) as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
      const permalink = str(d.permalink, 300);
      if (!permalink.startsWith("/")) return null;
      return { url: `https://www.reddit.com${permalink}`, title: str(d.title, 200), excerpt: str(d.selftext, 500) };
    })
    .filter((x): x is { url: string; title: string; excerpt: string } => x !== null && x.title.length > 0);
}

/** Merge new opportunities into the stored list: existing ids win (their status is the owner's), cap. */
export function upsertOpportunities(existing: Opportunity[], fresh: Opportunity[]): Opportunity[] {
  const have = new Set(existing.map((o) => o.id));
  const add = fresh.filter((o) => !have.has(o.id));
  return [...add, ...existing].slice(0, MAX_OPPORTUNITIES);
}

/** The owner closes the loop: drafted → sent|skipped. Unknown id/status → unchanged. */
export function markOpportunity(list: Opportunity[], id: string, status: unknown): { list: Opportunity[]; changed: boolean } {
  const s = String(status ?? "") as OppStatus;
  if (!OPP_STATUSES.includes(s)) return { list, changed: false };
  let changed = false;
  const next = list.map((o) => (o.id === id && o.status !== s ? ((changed = true), { ...o, status: s }) : o));
  return { list: next, changed };
}

/** Honest per-source feasibility — computed, shown to the owner, never faked (sync-types ethic). */
export function oppSourceFeasibility(): Record<string, { serverReadable: boolean; note: string }> {
  return {
    hn: { serverReadable: true, note: "Hacker News (Algolia API) — searched live." },
    reddit: { serverReadable: false, note: "Reddit's public JSON usually blocks datacenter IPs — tried best-effort; open reddit.com/search in your browser for full coverage." },
    facebook: { serverReadable: false, note: "Facebook Groups are login-walled — not server-readable. Watch your groups in your own browser; your agent will draft replies for anything you paste in." },
    skool: { serverReadable: false, note: "Skool communities are login-walled — same: you watch, your agent drafts." },
    linkedin: { serverReadable: false, note: "LinkedIn is login-walled — same: you watch, your agent drafts." },
    x: { serverReadable: false, note: "X search requires a paid API — not pulled. Paste a thread and your agent drafts the reply." },
  };
}
