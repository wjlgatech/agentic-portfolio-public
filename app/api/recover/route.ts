// ─────────────────────────────────────────────────────────────────────────────
// /api/recover — email-based owner recovery for a hosted portfolio (the reset the owner token was
// missing). POST { slug } → INITIATE: mint a single-use, 30-min recovery token, store its hash,
// and email a magic link to the address on file. POST { slug, token } → CONFIRM: verify the token,
// RE-MINT the owner token, invalidate the recovery, and return a fresh owner link (auto sign-in).
// Anti-enumeration: initiate always responds the same shape. Rate-limited. Graceful: no email
// provider → honest {sent:false, configured:false}. Crypto reuses lib/portfolio-owner.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { mintOwnerToken, hashOwnerToken, ownerHashMatches, ownerKey } from "@/lib/portfolio-owner";
import { sendEmail, emailConfigured } from "@/lib/email";
import { recoveryExp, isRecoveryExpired, maskEmail, type RecoveryRecord } from "@core/recovery-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slugRe = /^[a-z0-9-]{1,64}$/i;
const recoverKey = (slug: string) => `recover:${slug}`;
const emailKey = (slug: string) => `owner-email:${slug}`;

export async function POST(req: NextRequest) {
  const rl = rateLimit(`recover:${clientKey(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!kvConfigured()) return NextResponse.json({ error: "Recovery needs the shared store (POSTGRES_URL)." }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) ?? {}; } catch { return NextResponse.json({ error: "Send { slug } (or { slug, token })." }, { status: 400 }); }
  const slug = String(body.slug ?? "").toLowerCase();
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!slugRe.test(slug)) return NextResponse.json({ error: "A valid portfolio slug is required." }, { status: 400 });

  const origin = req.nextUrl.origin;

  // ── CONFIRM: verify the emailed token → re-mint the owner token ──
  if (token) {
    const rec = await kvGetJSON<RecoveryRecord>(recoverKey(slug));
    if (isRecoveryExpired(rec, Date.now()) || !ownerHashMatches(token, rec!.hash)) {
      return NextResponse.json({ error: "This recovery link is invalid or expired. Request a new one." }, { status: 400 });
    }
    const newToken = mintOwnerToken();
    await kvSetJSON(ownerKey(slug), hashOwnerToken(newToken));
    await kvSetJSON(recoverKey(slug), { hash: "", exp: 0 } as RecoveryRecord); // single-use: burn it
    return NextResponse.json({ ok: true, ownerUrl: `${origin}/p/${slug}?owner=${newToken}` });
  }

  // ── INITIATE: email a magic link to the address on file ──
  const email = await kvGetJSON<string>(emailKey(slug));
  const configured = emailConfigured();
  let sent = false;
  if (email && configured) {
    const recoveryToken = mintOwnerToken();
    const rec: RecoveryRecord = { hash: hashOwnerToken(recoveryToken), exp: recoveryExp(Date.now()) };
    await kvSetJSON(recoverKey(slug), rec);
    const link = `${origin}/recover?slug=${encodeURIComponent(slug)}&token=${recoveryToken}`;
    const r = await sendEmail(
      email,
      "Recover owner access to your agentic portfolio",
      `<p>Someone (hopefully you) asked to recover owner access to your portfolio at <b>${origin}/p/${slug}</b>.</p>
       <p><a href="${link}">Click here to unlock owner mode</a> (expires in 30 minutes, single use).</p>
       <p>If this wasn't you, ignore this email — nothing changes until the link is used.</p>`,
    );
    sent = r.sent;
  }
  // Same shape regardless of whether an email exists (anti-enumeration), but tell the UI if the
  // deploy simply hasn't configured email, so it can show the honest fallback.
  return NextResponse.json({
    ok: true,
    sent,
    configured,
    maskedTo: sent && email ? maskEmail(email) : null,
    note: configured ? "If that portfolio has an email on file, a recovery link is on its way." : "Email recovery isn't set up on this deploy — re-make at /make with the same name + email to get a fresh owner link.",
  });
}
