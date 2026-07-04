// ─────────────────────────────────────────────────────────────────────────────
// /api/owner/recover — forgot-passphrase recovery for the ROOT portfolio (the
// PORTFOLIO_OWNER_TOKEN gate; the hosted /p/<slug> equivalent is /api/recover).
// The env token can't be re-minted at runtime, so recovery grants a SIGNED
// SESSION instead of revealing the secret:
//   POST {}        → INITIATE: email a 30-min HMAC-signed magic link to the
//                    owner's address (PORTFOLIO_OWNER_EMAIL, else profile email).
//   POST { token } → CONFIRM: verify the link token → return an owner URL
//                    carrying a 30-day signed session (accepted wherever the
//                    raw passphrase is — see lib/owner.ts ownerCredentialValid).
// Stateless (no KV): both token kinds are HMACs keyed by the owner token, so
// rotating PORTFOLIO_OWNER_TOKEN invalidates everything. Rate-limited.
// Graceful: no email provider → honest note telling the owner to reset the env var.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { ownerTokenConfigured, recoveryTokenValid, mintRecoveryToken, mintSessionToken } from "@/lib/owner";
import { sendEmail, emailConfigured } from "@/lib/email";
import { maskEmail } from "@core/recovery-types";
import { profile } from "@/content/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`owner-recover:${clientKey(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!ownerTokenConfigured()) {
    return NextResponse.json({ error: "This instance is un-gated (no PORTFOLIO_OWNER_TOKEN) — you already have owner access." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* empty body → initiate */ }
  const token = typeof body.token === "string" ? body.token.trim() : "";

  // ── CONFIRM: verify the emailed link token → grant a signed owner session ──
  if (token) {
    if (!recoveryTokenValid(token)) {
      return NextResponse.json({ error: "This recovery link is invalid or expired. Request a new one." }, { status: 400 });
    }
    const session = mintSessionToken();
    return NextResponse.json({ ok: true, ownerUrl: `${req.nextUrl.origin}/?owner=${encodeURIComponent(session)}` });
  }

  // ── INITIATE: email a magic link to the owner's address ──
  const email = process.env.PORTFOLIO_OWNER_EMAIL || profile.links.email || "";
  const configured = emailConfigured() && Boolean(email);
  let sent = false;
  if (configured) {
    const origin = req.nextUrl.origin;
    const link = `${origin}/recover?token=${encodeURIComponent(mintRecoveryToken())}`;
    const r = await sendEmail(
      email,
      "Recover owner access to your portfolio",
      `<p>Someone (hopefully you) asked to recover owner access to your portfolio at <b>${origin}</b>.</p>
       <p><a href="${link}">Click here to unlock owner mode</a> (expires in 30 minutes).</p>
       <p>If this wasn't you, ignore this email — your passphrase stays unchanged either way.</p>`,
    );
    sent = r.sent;
  }
  return NextResponse.json({
    ok: true,
    sent,
    configured,
    maskedTo: sent ? maskEmail(email) : null,
    note: sent
      ? `A recovery link is on its way to ${maskEmail(email)}.`
      : configured
        ? "Couldn't send the recovery email right now — try again in a minute."
        : "Email recovery isn't set up on this deploy (RESEND_API_KEY + an owner email). Owner fallback: reset PORTFOLIO_OWNER_TOKEN in your hosting env (e.g. Vercel → Settings → Environment Variables).",
  });
}
