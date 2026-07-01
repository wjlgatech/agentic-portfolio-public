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
import { isOwnerRequest, ownerTokenConfigured } from "@/lib/owner";
import { ownerHashMatches, ownerKey } from "@/lib/portfolio-owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { getActiveInstance } from "@/content/instances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lead = { name: string; email: string; company: string; need: string; capturedAt: string };

const slugRe = /^[a-z0-9-]{1,64}$/i;
// A hosted portfolio (/p/<slug>) keys leads by its slug (kvPrefix === slug); the deploy's own
// active instance keeps its existing kvPrefix key (backward-compatible).
function leadsKeyFor(slug?: string): string {
  return slug ? `leads:${slug}` : `leads:${getActiveInstance().storage.kvPrefix}`;
}

// Owns THIS instance? The deploy admin (global PORTFOLIO_OWNER_TOKEN) owns any; otherwise the
// caller must present the per-portfolio owner token that matches owner:<slug> (multi-tenant safe).
async function ownsInstance(req: NextRequest, slug?: string): Promise<boolean> {
  // Admin bypass ONLY when a global token is actually configured AND matches — never the un-gated
  // dev shortcut (else a deploy without PORTFOLIO_OWNER_TOKEN would leave every tenant's data open).
  if (ownerTokenConfigured() && isOwnerRequest(req)) return true;
  if (!slug) return false;
  const provided = req.headers.get("x-portfolio-owner") ?? "";
  if (!provided) return false;
  const hash = await kvGetJSON<string>(ownerKey(slug));
  return hash ? ownerHashMatches(provided, hash) : false;
}

const str = (v: unknown, cap = 200) => (typeof v === "string" ? v.trim().slice(0, cap) : "");
const instanceParam = (v: string | null): string | undefined => (v && slugRe.test(v) ? v.toLowerCase() : undefined);

export async function GET(req: NextRequest) {
  const slug = instanceParam(req.nextUrl.searchParams.get("instance"));
  // OWNER only — reading the pipeline is the owner's payoff. Per-portfolio for hosted sites.
  if (!(await ownsInstance(req, slug))) {
    return NextResponse.json({ error: "Owner only. Open your portfolio with ?owner=<your token> to read its pipeline." }, { status: 403 });
  }
  const leads = (await kvGetJSON<Lead[]>(leadsKeyFor(slug))) ?? [];
  return NextResponse.json({ instance: slug || getActiveInstance().slug, count: leads.length, durable: kvConfigured(), leads }, { headers: { "Cache-Control": "no-store" } });
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
  const slug = instanceParam(typeof o.instance === "string" ? o.instance : null);
  const email = str(o.email, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required to capture the lead." }, { status: 400 });
  }
  const lead: Lead = { name: str(o.name), email, company: str(o.company), need: str(o.need, 400), capturedAt: new Date().toISOString() };

  const key = leadsKeyFor(slug); // the lead belongs to the portfolio the visitor is on
  const existing = (await kvGetJSON<Lead[]>(key)) ?? [];
  // Dedupe by email (keep the newest need); newest first, cap the stored list.
  const merged = [lead, ...existing.filter((l) => l.email.toLowerCase() !== email.toLowerCase())].slice(0, 500);
  const persisted = await kvSetJSON(key, merged);

  return NextResponse.json({ ok: true, captured: { name: lead.name, email: lead.email, company: lead.company }, total: merged.length, durable: persisted });
}
