// ─────────────────────────────────────────────────────────────────────────────
// lib/email.ts — a graceful transactional-email sender (Resend REST, no SDK → stays lean).
// GRACEFUL by design: if RESEND_API_KEY isn't set, sending is a no-op that returns {sent:false} —
// the caller degrades to an honest "email recovery isn't configured" message, never crashes.
// Server-only. Set RESEND_API_KEY + (a verified) RESEND_FROM to turn delivery on.
// ─────────────────────────────────────────────────────────────────────────────

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  if (!key) return { sent: false, reason: "not-configured" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { sent: false, reason: "bad-recipient" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return r.ok ? { sent: true } : { sent: false, reason: `provider-${r.status}` };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}
