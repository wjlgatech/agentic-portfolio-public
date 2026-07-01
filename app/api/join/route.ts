// ─────────────────────────────────────────────────────────────────────────────
// /api/join — the TRUE Society intake + the mailing list. A builder applies (name, email,
// portfolio URL, their first 10X contribution, and agreement to the TRUE covenant). Stored
// durably (KV) as the members' dispatch list. POST is public + rate-limited; GET is owner-gated
// (the list is the society's CRM, not public). Honest: no auto-admit — applying ≠ membership;
// standing is earned. Graceful: no KV → accepted but flagged non-durable.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "society:applications";
type Application = { name: string; email: string; portfolio: string; contribution: string; appliedAt: string };
const str = (v: unknown, cap = 400) => (typeof v === "string" ? v.trim().slice(0, cap) : "");

export async function GET(req: NextRequest) {
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Owner only — the members' dispatch list is the society's, not public." }, { status: 403 });
  }
  const apps = (await kvGetJSON<Application[]>(KEY)) ?? [];
  return NextResponse.json({ count: apps.length, durable: kvConfigured(), applications: apps }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`join:${clientKey(req)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: Record<string, unknown>;
  try { body = (await req.json()) ?? {}; } catch { return NextResponse.json({ error: "Send your application as JSON." }, { status: 400 }); }

  const email = str(body.email, 160);
  const name = str(body.name, 80);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Your name and a valid email are required." }, { status: 400 });
  }
  if (body.agree !== true) {
    return NextResponse.json({ error: "You must agree to the TRUE covenant to apply — this is a society of builders." }, { status: 400 });
  }
  const contribution = str(body.contribution, 600);
  if (contribution.length < 12) {
    return NextResponse.json({ error: "Tell us the ONE thing you'll build or 10X first — passivity isn't a way in." }, { status: 400 });
  }

  const app: Application = { name, email, portfolio: str(body.portfolio, 200), contribution, appliedAt: new Date().toISOString() };
  const existing = (await kvGetJSON<Application[]>(KEY)) ?? [];
  const merged = [app, ...existing.filter((a) => a.email.toLowerCase() !== email.toLowerCase())].slice(0, 5000);
  const durable = await kvSetJSON(KEY, merged);

  return NextResponse.json({
    ok: true,
    position: merged.length,
    durable,
    message: "Application received. Membership is earned, not granted — start building your first 10X and you'll be on our radar.",
  });
}
