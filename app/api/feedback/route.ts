// ─────────────────────────────────────────────────────────────────────────────
// /api/feedback — the capture half of the feedback→feature loop. A non-technical user tells
// the on-page copilot a suggestion or a complaint; the `sendFeedback` action POSTs it here and
// it lands durably in KV (batch-analyzed weekly by /api/feedback/digest). POST is public +
// rate-limited (any visitor may speak); GET is owner-gated (raw feedback can contain contact
// emails — it's the builders' inbox, not a public feed). Contact is optional and single-purpose:
// the ship notice when the theme lands. Graceful: no KV → accepted, durable:false.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured } from "@/lib/storage";
import { addFeedback, listFeedback } from "@/lib/feedback";
import { normalizeFeedbackItem } from "@core/feedback-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Owner only — raw feedback (with contacts) is the builders' inbox, not public." }, { status: 403 });
  }
  const items = await listFeedback();
  return NextResponse.json({ count: items.length, durable: kvConfigured(), items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`feedback:${clientKey(req)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Send feedback as JSON." }, { status: 400 }); }

  const item = normalizeFeedbackItem(body, new Date().toISOString());
  if (!item) {
    return NextResponse.json({ error: "Tell me a bit more — a sentence about what you want or what's not working." }, { status: 400 });
  }

  const { durable, total } = await addFeedback(item);
  return NextResponse.json({
    ok: true,
    id: item.id,
    durable,
    total,
    message: item.contact
      ? "Got it — it goes into this week's build review, and you'll get an email when it ships."
      : "Got it — it goes into this week's build review. Leave an email next time if you want a ship notice.",
  });
}
