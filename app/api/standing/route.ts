// ─────────────────────────────────────────────────────────────────────────────
// /api/standing — compute a member's TRUE standing from OBSERVED signals (their live portfolio's
// A2A agent card + whether it's reachable) plus stored vouches/contributions. Standing is
// measured, not claimed; the overall maps to LEVERAGE (the 1/10-time coefficient). Public +
// rate-limited. The pure scoring lives in @core/society-types.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvGetJSON } from "@/lib/storage";
import { scoreStanding, type MemberSignals, type Vouch } from "@core/society-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = "agentic-portfolio TRUE-standing (reads public agent cards)";

function handleFor(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 48) || "node";
  } catch {
    return "node";
  }
}

async function get(u: string): Promise<{ ok: boolean; body: string }> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
    return { ok: r.ok, body: r.ok ? await r.text() : "" };
  } catch {
    return { ok: false, body: "" };
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`standing:${clientKey(req)}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let url = "";
  try { url = String((await req.json())?.url ?? "").trim(); } catch { return NextResponse.json({ error: "Send { url } — your portfolio URL." }, { status: 400 }); }
  let origin = "";
  try { origin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin; } catch { return NextResponse.json({ error: `Couldn't parse "${url}".` }, { status: 400 }); }

  // OBSERVED signals: is the portfolio live? does it expose an A2A agent card with skills + a description?
  const live = await get(origin);
  const card = await get(`${origin}/.well-known/agent-card.json`) ;
  let hasAgentCard = false, skillCount = 0, hasContent = false;
  if (card.ok && card.body) {
    try {
      const c = JSON.parse(card.body) as { name?: string; description?: string; skills?: unknown[] };
      hasAgentCard = Boolean(c.name && Array.isArray(c.skills));
      skillCount = Array.isArray(c.skills) ? c.skills.length : 0;
      hasContent = Boolean((c.description && c.description.trim().length > 20) || skillCount > 0);
    } catch { /* malformed card → not a valid card */ }
  }

  const handle = handleFor(origin);
  const vouches = (await kvGetJSON<Vouch[]>(`society:vouches:${handle}`)) ?? [];
  const contributions = (await kvGetJSON<number>(`society:contrib:${handle}`)) ?? 0;

  const signals: MemberSignals = {
    handle,
    hasAgentCard,
    skillCount,
    hasContent,
    isLive: live.ok,
    contributions,
    vouches,
    lastActiveDaysAgo: 0, // checking-in counts as activity (this is a live probe of a live artifact)
  };

  const standing = scoreStanding(signals);
  return NextResponse.json({ url: origin, standing, signals: { hasAgentCard, skillCount, hasContent, isLive: live.ok } });
}
