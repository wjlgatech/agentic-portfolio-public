// ─────────────────────────────────────────────────────────────────────────────
// /api/growth — the viral growth dashboard, MEASURED. GET returns the network's real growth
// stats from the attribution tree: the viral coefficient K (self-propelling when ≥1), how deep
// the 1→2→4→8 tree goes, and the top referrers. Add ?handle=<slug> for that referrer's own
// scoreboard (invited vs actually shipped). Public + rate-limited; the aggregate is computed in
// code (@core/referrals-types), never claimed. No PII — edges are public handles only.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { readEdges } from "@/lib/referrals";
import { growthStats, referrerView } from "@core/referrals-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`growth:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const edges = await readEdges();
  const stats = growthStats(edges);
  const handle = (req.nextUrl.searchParams.get("handle") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);
  const you = handle ? referrerView(edges, handle) : null;

  return NextResponse.json({ stats, you }, { headers: { "Cache-Control": "no-store" } });
}
