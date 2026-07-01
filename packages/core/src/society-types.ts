// ─────────────────────────────────────────────────────────────────────────────
// society-types.ts — the TRUE standing engine (pure, computed-in-code, like the jobfit/BRACE
// scorers). Standing is MEASURED from a member's real artifacts + reputation-weighted vouches,
// never asserted. Passivity DECAYS it automatically. The overall score maps to LEVERAGE — how
// much AI capability + human trust you can mobilize — i.e. the "make any dream true in 1/10 the
// time & effort, backed by AI + people who trust you via the TRUE contract" coefficient.
// ─────────────────────────────────────────────────────────────────────────────

export type TrueKey = "T" | "R" | "U" | "E";
export const TRUE_KEYS: TrueKey[] = ["T", "R", "U", "E"];

export type Tier = "applicant" | "member" | "steward" | "fellow";

// A vouch is reputation-weighted: weight = the voucher's own standing/100, so an endorsement from
// a high-standing member counts more, and low-trust vouch-rings can't inflate a score (Sybil-resistant).
export type Vouch = { from: string; weight: number };

export type MemberSignals = {
  handle: string;
  hasAgentCard: boolean; // T — a callable, transferable capability (A2A agent card exists)
  skillCount: number;    // R — reusable capabilities declared
  hasContent: boolean;   // U — teaches/explains (writings / grounded agent)
  isLive: boolean;       // E — portfolio is live + queryable (experienceable)
  contributions: number; // shipped 10X contributions (self- + peer-logged)
  vouches: Vouch[];      // peer endorsements
  lastActiveDaysAgo: number;
};

export type Standing = {
  handle: string;
  byTenet: Record<TrueKey, number>; // 0..100 each
  base: number;        // mean of the four tenets
  vouchBoost: number;  // reputation-weighted vouches, capped
  decay: number;       // 0..1 multiplier from passivity (the vote-out gravity)
  overall: number;     // 0..100, computed
  tier: Tier;
  leverage: number;    // 1x..10x — the "1/10 time" coefficient (AI + trust you can mobilize)
  gaps: string[];      // honest, specific: what to do to rise
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

function scoreTenets(s: MemberSignals): Record<TrueKey, number> {
  return {
    // T — Transferable: a callable capability others' agents can use.
    T: s.hasAgentCard ? clamp(70 + s.skillCount * 10) : 20,
    // R — Reusable: declared reusable capabilities + shipped, reused contributions.
    R: clamp(s.skillCount * 20 + s.contributions * 10),
    // U — Understandable: teaches/explains; each teach-back-style contribution adds.
    U: clamp((s.hasContent ? 80 : 30) + Math.min(20, s.contributions * 5)),
    // E — Experienceable: a live, queryable thing people can try.
    E: s.isLive ? 90 : 20,
  };
}

export function scoreStanding(s: MemberSignals): Standing {
  const byTenet = scoreTenets(s);
  const base = TRUE_KEYS.reduce((a, k) => a + byTenet[k], 0) / TRUE_KEYS.length;

  // Reputation-weighted vouches, capped at +20 so status still has to be earned by artifacts.
  const vouchBoost = Math.min(20, s.vouches.reduce((a, v) => a + Math.max(0, Math.min(1, v.weight)), 0) * 5);

  // Passivity forfeits standing: full for ~30 days, then linear decay to a 0.4 floor by ~5 months.
  const days = Math.max(0, s.lastActiveDaysAgo);
  const decay = days <= 30 ? 1 : Math.max(0.4, 1 - (days - 30) / 120);

  const overall = clamp(round((base + vouchBoost) * decay));
  const tier: Tier = overall >= 85 ? "fellow" : overall >= 65 ? "steward" : overall >= 40 ? "member" : "applicant";
  const leverage = Math.round((1 + (overall / 100) * 9) * 10) / 10; // 1.0x .. 10.0x

  const gaps: string[] = [];
  if (byTenet.T < 70) gaps.push("Transferable: expose an A2A agent card + declare skills others can call.");
  if (byTenet.R < 60) gaps.push("Reusable: ship a versioned skill/theme/instance others reuse.");
  if (byTenet.U < 70) gaps.push("Understandable: publish a teach-back and run a U-loop on a real problem.");
  if (byTenet.E < 70) gaps.push("Experienceable: put a live, queryable thing people can try.");
  if (vouchBoost < 8) gaps.push("Trust: earn vouches by making 3 other members 10X.");
  if (decay < 1) gaps.push(`Active: you've been quiet ${days}d — standing is decaying. Ship one 10X to reset it.`);

  return { handle: s.handle, byTenet, base: round(base), vouchBoost: round(vouchBoost), decay: Math.round(decay * 100) / 100, overall, tier, leverage, gaps };
}

// Convert an already-computed member standing into the vouch weight it lends to others.
export function vouchWeight(overall: number): number {
  return clamp(overall, 0, 100) / 100;
}
