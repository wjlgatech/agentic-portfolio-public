// ─────────────────────────────────────────────────────────────────────────────
// recovery-types.ts — email-based owner recovery (pure, fs/network-free → testable). A hosted
// portfolio's owner token is un-recoverable by design (hashed, shown once) — an antipattern with
// no reset. This adds the reset: a short-lived, single-use recovery record emailed to the address
// on file; confirming it re-mints the owner token. Here we hold only the expiry + masking logic;
// the crypto (hash/compare) reuses lib/portfolio-owner, the send reuses lib/email.
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryRecord = { hash: string; exp: number }; // exp = ms epoch; hash = sha256(recoveryToken)
export const RECOVERY_TTL_MIN = 30;

export function recoveryExp(nowMs: number, ttlMin = RECOVERY_TTL_MIN): number {
  return nowMs + ttlMin * 60_000;
}

export function isRecoveryExpired(rec: RecoveryRecord | null | undefined, nowMs: number): boolean {
  return !rec || typeof rec.exp !== "number" || !rec.hash || rec.exp <= nowMs;
}

// "j-•••@gmail.com" — so the recovery UI can confirm WHERE it sent without revealing the address.
export function maskEmail(email: string): string {
  const [user, domain] = String(email || "").split("@");
  if (!domain) return "the email on file";
  const head = user.slice(0, Math.min(2, user.length));
  return `${head}${"•".repeat(Math.max(1, user.length - head.length))}@${domain}`;
}
