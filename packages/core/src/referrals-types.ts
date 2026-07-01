// ─────────────────────────────────────────────────────────────────────────────
// referrals-types.ts — the viral attribution tree, computed in code (pure, fs-free). Every
// portfolio made via someone's invite link is an EDGE from → to. From those edges we compute the
// honest growth stats: the real viral coefficient K (successful invites per referrer — counted
// ONLY when the invitee shipped a LIVE portfolio, never for merely sending), the depth of the
// 1→2→4→8 tree, and the top referrers. K is measured, not claimed. K>1 ⇒ the network self-propels.
//
// Privacy-by-design: an edge is just two public handles a user chose to create by sharing THEIR
// OWN portfolio. No contact lists, no address books, no third-party PII ever enters this graph.
// ─────────────────────────────────────────────────────────────────────────────

export type ReferralEdge = {
  from: string; // referrer handle (a portfolio slug)
  to: string;   // the new portfolio's handle (slug)
  live: boolean; // did the invitee actually ship a live portfolio? (only live edges count toward K)
};

export type GrowthStats = {
  nodes: number;        // distinct participants (referrers + referred)
  referred: number;     // portfolios that came via an invite
  live: number;         // referred portfolios that actually shipped (the ones that count)
  referrers: number;    // distinct people who invited ≥1 person who shipped
  k: number;            // viral coefficient = live invites / active referrers (rounded to 0.01)
  selfPropelling: boolean; // k >= 1 → the tree doubles on its own
  depthReached: number; // longest live referral chain — how deep the 1→2→4→8 tree goes
  topReferrers: { handle: string; live: number; total: number }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Longest chain of LIVE edges (the generational depth of the tree). Cycle-safe via a per-path set.
function longestChain(edges: ReferralEdge[]): number {
  const adj = new Map<string, string[]>();
  for (const e of edges) if (e.live) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  const memo = new Map<string, number>();
  const walk = (node: string, seen: Set<string>): number => {
    if (memo.has(node) && !seen.has(node)) return memo.get(node)!;
    let best = 0;
    for (const nxt of adj.get(node) ?? []) {
      if (seen.has(nxt)) continue; // guard cycles
      seen.add(nxt);
      best = Math.max(best, 1 + walk(nxt, seen));
      seen.delete(nxt);
    }
    if (seen.size === 0) memo.set(node, best);
    return best;
  };
  let depth = 0;
  for (const start of adj.keys()) depth = Math.max(depth, walk(start, new Set([start])));
  return depth;
}

export function growthStats(edges: ReferralEdge[]): GrowthStats {
  const clean = edges.filter((e) => e && e.from && e.to && e.from !== e.to);
  const participants = new Set<string>();
  for (const e of clean) { participants.add(e.from); participants.add(e.to); }

  const referredSet = new Set(clean.map((e) => e.to));
  const liveEdges = clean.filter((e) => e.live);

  // Tally per referrer (dedupe repeat edges to the same invitee).
  const byReferrer = new Map<string, { live: Set<string>; total: Set<string> }>();
  for (const e of clean) {
    const t = byReferrer.get(e.from) ?? { live: new Set<string>(), total: new Set<string>() };
    t.total.add(e.to);
    if (e.live) t.live.add(e.to);
    byReferrer.set(e.from, t);
  }
  const activeReferrers = [...byReferrer.values()].filter((t) => t.live.size > 0).length;
  const liveCount = new Set(liveEdges.map((e) => `${e.from}→${e.to}`)).size;
  const k = activeReferrers > 0 ? round2(liveCount / activeReferrers) : 0;

  const topReferrers = [...byReferrer.entries()]
    .map(([handle, t]) => ({ handle, live: t.live.size, total: t.total.size }))
    .sort((a, b) => b.live - a.live || b.total - a.total)
    .slice(0, 10);

  return {
    nodes: participants.size,
    referred: referredSet.size,
    live: new Set(liveEdges.map((e) => e.to)).size,
    referrers: activeReferrers,
    k,
    selfPropelling: k >= 1,
    depthReached: longestChain(clean),
    topReferrers,
  };
}

// One referrer's own view — their invites and how many shipped (the motivating scoreboard).
export function referrerView(edges: ReferralEdge[], handle: string): { invited: number; live: number; reach: string[] } {
  const mine = edges.filter((e) => e.from === handle && e.to !== handle);
  const live = mine.filter((e) => e.live).map((e) => e.to);
  return { invited: new Set(mine.map((e) => e.to)).size, live: new Set(live).size, reach: [...new Set(live)].slice(0, 24) };
}
