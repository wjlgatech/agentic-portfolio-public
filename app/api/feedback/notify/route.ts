// ─────────────────────────────────────────────────────────────────────────────
// /api/feedback/notify — the close of the feedback→feature loop. When a digest theme SHIPS
// (a human merged the build), this emails the contributors who left a contact for exactly that
// theme: what shipped + the link. For a hosted /p/<slug> portfolio the "1-click update" is the
// link itself — the code is shared and their data (config, articles, leads, owner token) lives
// in KV keyed by their slug, so their portfolio already runs the new feature with nothing lost.
//
// Consent boundary: contact was volunteered for THIS purpose (the sendFeedback action asks
// "want a ship notice?"), one transactional email per shipped theme, never marketing, never a
// harvested list (the privacy-first growth rule). Auth: owner OR FEEDBACK_SECRET (cron).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { sendEmail, emailConfigured } from "@/lib/email";
import { listFeedback, readFeedbackDigest } from "@/lib/feedback";
import { contributorsFor } from "@core/feedback-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (isOwnerRequest(req)) return true;
  const secret = process.env.FEEDBACK_SECRET;
  return Boolean(secret) && req.headers.get("x-feedback-secret") === secret;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not authorized. Owner token or x-feedback-secret required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = ((await req.json()) as Record<string, unknown>) ?? {}; } catch { return NextResponse.json({ error: "Send JSON: { themes: string[], url?, note? }." }, { status: 400 }); }

  const themes = Array.isArray(body.themes) ? body.themes.map((t) => String(t)).filter(Boolean).slice(0, 20) : [];
  if (themes.length === 0) return NextResponse.json({ error: "Name at least one shipped theme (from the digest)." }, { status: 400 });
  const url = typeof body.url === "string" && /^https?:\/\//.test(body.url) ? body.url.slice(0, 300) : new URL(req.url).origin;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  const digest = await readFeedbackDigest();
  if (!digest) return NextResponse.json({ error: "No digest yet — run /api/feedback/digest first." }, { status: 409 });

  const contributors = contributorsFor(digest, await listFeedback(), themes);
  if (!emailConfigured()) {
    return NextResponse.json({ ok: true, notified: 0, contributors: contributors.length, emailConfigured: false, message: "Email isn't configured (RESEND_API_KEY) — no notices sent." });
  }

  let notified = 0;
  const failures: string[] = [];
  for (const c of contributors) {
    const themeList = c.themes.map((t) => `<li>${esc(t)}</li>`).join("");
    const html =
      `<p>You asked for it — it shipped.</p>` +
      `<ul>${themeList}</ul>` +
      (note ? `<p>${esc(note)}</p>` : "") +
      `<p><a href="${esc(url)}">Open your portfolio</a> — it already runs the update. ` +
      `Your content, articles, leads, and owner access are untouched: your data lives in your portfolio's own store, and features arrive underneath it.</p>` +
      `<p style="color:#888;font-size:12px">You get this one notice because you left an email with your feedback. No list, no marketing.</p>`;
    const r = await sendEmail(c.email, `Your feedback shipped: ${c.themes[0]}${c.themes.length > 1 ? ` (+${c.themes.length - 1} more)` : ""}`, html);
    if (r.sent) notified++;
    else failures.push(`${c.email}: ${r.reason}`);
  }

  return NextResponse.json({ ok: true, notified, contributors: contributors.length, emailConfigured: true, failures });
}
