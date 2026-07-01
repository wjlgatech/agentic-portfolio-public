// ─────────────────────────────────────────────────────────────────────────────
// /api/lead — the agent's real WORK (more than a chatbot): capture a qualified lead the
// on-page agent collected while chatting, and let the OWNER read the pipeline it generated.
// This is the owner↔visitor split made concrete:
//   • VISITOR: POST is public (rate-limited) — the agent captures their interest frictionlessly,
//     no form. Durable (KV), instance-scoped (never mixes businesses).
//   • OWNER:   GET is owner-gated (x-portfolio-owner) — reads the captured leads (the pipeline the
//     agent built). A visitor GET → 403.
// On-brand for UnmaskLeads (a lead-gen product) and generic for any Agentize instance.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { getActiveInstance } from "@/content/instances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lead = { name: string; email: string; company: string; need: string; capturedAt: string };

function leadsKey(): string {
  return `leads:${getActiveInstance().storage.kvPrefix}`;
}

const str = (v: unknown, cap = 200) => (typeof v === "string" ? v.trim().slice(0, cap) : "");

export async function GET(req: NextRequest) {
  // OWNER only — reading the pipeline is the owner's payoff.
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Owner only. The captured pipeline is visible to the owner (x-portfolio-owner)." }, { status: 403 });
  }
  const leads = (await kvGetJSON<Lead[]>(leadsKey())) ?? [];
  return NextResponse.json({ instance: getActiveInstance().slug, count: leads.length, durable: kvConfigured(), leads }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  // VISITOR — public, but rate-limited so it can't be spammed.
  const rl = rateLimit(`lead:${clientKey(req)}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send { email, name?, company?, need? }." }, { status: 400 });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const email = str(o.email, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required to capture the lead." }, { status: 400 });
  }
  const lead: Lead = { name: str(o.name), email, company: str(o.company), need: str(o.need, 400), capturedAt: new Date().toISOString() };

  const existing = (await kvGetJSON<Lead[]>(leadsKey())) ?? [];
  // Dedupe by email (keep the newest need); newest first, cap the stored list.
  const merged = [lead, ...existing.filter((l) => l.email.toLowerCase() !== email.toLowerCase())].slice(0, 500);
  const persisted = await kvSetJSON(leadsKey(), merged);

  return NextResponse.json({ ok: true, captured: { name: lead.name, email: lead.email, company: lead.company }, total: merged.length, durable: persisted });
}
