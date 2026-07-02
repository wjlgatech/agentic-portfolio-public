// ─────────────────────────────────────────────────────────────────────────────
// /api/feedback/digest — the analysis half of the feedback→feature loop. On a cadence
// (weekly GitHub Action) or on demand (owner), it clusters the recent feedback batch into
// themes + drafted feature proposals. The LLM only GROUPS and DRAFTS: every count is
// recomputed in code from the real items, examples are contributors' real words, and each
// cluster carries a deterministic `anyagent` build command — the handoff a HUMAN approves
// (the cron opens an issue/PR; nothing auto-merges — same ethic as scout/verified-resume).
//
// Auth: the owner (x-portfolio-owner) OR the cron secret (x-feedback-secret == FEEDBACK_SECRET),
// mirroring /api/scout. GET returns the latest stored digest (same auth — raw excerpts inside).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { chatWithFailover } from "@/lib/llm-complete";
import { listFeedback, readFeedbackDigest, writeFeedbackDigest } from "@/lib/feedback";
import { itemsInWindow, normalizeDigest } from "@core/feedback-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are triaging user feedback for a small product team. You get a JSON batch of feedback items (each with an id, kind: suggestion|complaint, and the user's verbatim text). Cluster them into at most 8 THEMES and draft ONE concrete feature proposal per theme.

Rules:
- Ground every cluster in the actual items: list the exact "itemIds" that belong to it. Never invent an id.
- A theme is a short, specific name (e.g. "Export portfolio as PDF"), never vague ("improve UX").
- "proposal" is 1-3 sentences: WHAT to build and the smallest version that addresses the feedback. Only propose what the feedback asks for — no invented scope.
- Prioritize by how many items a theme covers; drop one-off noise you can't group honestly (better fewer, grounded clusters).

Produce STRICT JSON only:
{ "clusters": [ { "theme": "...", "itemIds": ["..."], "proposal": "..." } ], "note": "one honest line (e.g. items too thin to cluster)" }`;

function authorized(req: NextRequest): boolean {
  if (isOwnerRequest(req)) return true;
  const secret = process.env.FEEDBACK_SECRET;
  return Boolean(secret) && req.headers.get("x-feedback-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not authorized. Owner token or x-feedback-secret required." }, { status: 403 });
  }
  const digest = await readFeedbackDigest();
  return NextResponse.json({ digest }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not authorized. Owner token or x-feedback-secret required." }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = ((await req.json()) as Record<string, unknown>) ?? {}; } catch { /* empty body is fine — defaults apply */ }
  const windowDays = Math.min(90, Math.max(1, Number(body.windowDays) || 7));

  const now = new Date();
  const batch = itemsInWindow(await listFeedback(), now.getTime(), windowDays);

  // Honest empty digest — no LLM call, nothing to cluster.
  if (batch.length === 0) {
    const digest = normalizeDigest({ note: `No feedback in the last ${windowDays} day(s).` }, [], now.toISOString(), windowDays);
    const durable = await writeFeedbackDigest(digest);
    return NextResponse.json({ digest, durable });
  }

  // Budget-bound the batch for free-tier TPM (same discipline as scout/verify corpora).
  const corpus = JSON.stringify({
    items: batch.map((f) => ({ id: f.id, kind: f.kind, text: f.text, page: f.page ?? null })),
  }).slice(0, 22000);

  let parsed: unknown = {};
  let provenance: string | undefined;
  try {
    const r = await chatWithFailover(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: corpus },
      ],
      { temperature: 0.3, jsonMode: true },
    );
    parsed = JSON.parse(r.text);
    provenance = `${r.provider}:${r.model}`;
  } catch (e) {
    return NextResponse.json({ error: `Digest failed: ${(e as Error).message}` }, { status: 502 });
  }

  const digest = normalizeDigest(parsed, batch, now.toISOString(), windowDays, provenance);
  const durable = await writeFeedbackDigest(digest);
  return NextResponse.json({ digest, durable });
}
