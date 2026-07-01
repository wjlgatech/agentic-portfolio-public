// ─────────────────────────────────────────────────────────────────────────────
// lib/linkedin.ts — LinkedIn URL classification, shared + UNIT-TESTED.
//
// This is the logic the "fetch all" / pasted-feed-URL query depends on. It used to
// live inline in Portfolio.tsx with no test, so a regression could silently break
// the exact query a user reported. It's extracted here and covered by
// scripts/test-linkedin-url.mjs so that can't happen again.
//
// A LinkedIn FEED / activity / profile URL is login-walled and CANNOT be fetched
// server-side — the agent must route it to the harvester, not a fetch tool. An
// individual published post/article (/pulse/, /posts/, /feed/update/) IS fetchable.
// ─────────────────────────────────────────────────────────────────────────────

export function isLinkedInFeedUrl(u: string): boolean {
  const s = String(u);
  // Individual posts/articles are fetchable — NOT feed URLs.
  if (/\/(pulse|posts)\//i.test(s) || /\/feed\/update\//i.test(s)) return false;
  // Profile, /feed, or any …/recent-activity… page is the login-walled feed.
  return /linkedin\.com\/(in\/[^/?#]+|feed\/?|.*recent-activity)/i.test(s);
}

// Order posts newest-first for the slider. Items arrive in HARVEST order (LinkedIn
// serves the feed newest-first), so that order is already a reliable recency signal.
// We refine it with the decoded publish time WHERE available, and for posts with no
// decodable time (a /posts/ slug without an activity id, a ugcPost/share urn, etc.)
// we slot them into feed order instead of dumping them at the end — so a brand-new
// post that happens to lack a decodable id still lands on the LEFT, not buried right.
export function orderByRecency<T extends { url: string; date?: string }>(items: T[], now: number = Date.now()): T[] {
  const raw = items.map((it) => {
    const t = linkedinActivityTimeMs(it.url, now);
    if (t != null) return t;
    const d = it.date ? Date.parse(it.date) : NaN;
    return Number.isNaN(d) ? null : d;
  });
  // Fill gaps from the previous known time (feed order descends), keeping undatable
  // posts just after their datable predecessor; leading undatable posts sit near `now`.
  const eff = new Array<number>(items.length);
  let prev: number | null = null;
  let gap = 0;
  for (let i = 0; i < items.length; i++) {
    if (raw[i] != null) { eff[i] = raw[i] as number; prev = eff[i]; gap = 0; }
    else { gap++; eff[i] = (prev != null ? prev : now) - gap * 1000; }
  }
  return items
    .map((it, i) => ({ it, e: eff[i], i }))
    .sort((a, b) => b.e - a.e || a.i - b.i)
    .map((x) => x.it);
}

// LinkedIn activity IDs are Snowflake-style 64-bit ints whose top 41 bits are the
// publish time in ms since the Unix epoch. So `id >> 22` recovers the post's
// publish timestamp — which is how we sort imported posts that carry no date field.
// Returns ms, or null if the URL has no activity id or the result is implausible.
export function linkedinActivityTimeMs(url: string, now: number = Date.now()): number | null {
  const m = String(url).match(/(?:urn:li:activity:|activity[:-])(\d+)/i);
  if (!m) return null;
  try {
    const ms = Number(BigInt(m[1]) >> 22n);
    // Sanity-gate: LinkedIn activity feed era (2010) … just past now. Rejects fake/short ids.
    if (ms < 1262304000000 || ms > now + 2 * 86400000) return null;
    return ms;
  } catch {
    return null;
  }
}
