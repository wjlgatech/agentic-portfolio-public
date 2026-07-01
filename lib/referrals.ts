// ─────────────────────────────────────────────────────────────────────────────
// lib/referrals.ts — the durable (KV) layer for the viral attribution tree. Server-only.
// Edges live in ONE key (`referrals:edges`) so we never need a scan. When an invitee ships a LIVE
// portfolio, the edge is marked live and the REFERRER's `society:contrib:<handle>` is bumped — a
// real, earned contribution that lifts their TRUE standing/leverage (see society-types). Honest:
// credit only flows when the invitee actually ships, never for merely sending an invite.
// Privacy: an edge is two public handles the user created by sharing their OWN portfolio. Never
// a contact list. The pure math lives in @core/referrals-types.
// ─────────────────────────────────────────────────────────────────────────────
import { kvGetJSON, kvSetJSON } from "@/lib/storage";
import type { ReferralEdge } from "@core/referrals-types";

const EDGES = "referrals:edges";
const CONTRIB = (handle: string) => `society:contrib:${handle}`;

export async function readEdges(): Promise<ReferralEdge[]> {
  return (await kvGetJSON<ReferralEdge[]>(EDGES)) ?? [];
}

// Record (or upgrade to live) an invite edge, and credit the referrer once when it goes live.
export async function recordReferral(from: string, to: string, live: boolean): Promise<void> {
  from = (from || "").trim(); to = (to || "").trim();
  if (!from || !to || from === to) return;

  const edges = await readEdges();
  const existing = edges.find((e) => e.from === from && e.to === to);
  const wasLive = existing?.live === true;

  if (existing) existing.live = existing.live || live;
  else edges.push({ from, to, live });

  await kvSetJSON(EDGES, edges.slice(-5000));

  // Credit the referrer exactly once — on the transition to live (not on the invite, not twice).
  if (live && !wasLive) {
    const n = (await kvGetJSON<number>(CONTRIB(from))) ?? 0;
    await kvSetJSON(CONTRIB(from), n + 1);
  }
}
