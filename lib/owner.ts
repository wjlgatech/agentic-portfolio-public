// ─────────────────────────────────────────────────────────────────────────────
// lib/owner.ts — the ownership check, shared by /api/owner and /api/portfolio.
//
// Ownership is proven by a secret in PORTFOLIO_OWNER_TOKEN (server-side only).
// If no token is configured, the instance is un-gated (local dev) and every
// request counts as the owner. Kept out of the route files because Next.js only
// allows HTTP-method exports from a route module.
//
// Forgot-passphrase recovery (stateless — no KV needed): /api/owner/recover
// emails the owner a short-lived HMAC-signed link (`rec.<exp>.<sig>`, keyed by
// the owner token itself); confirming it grants a longer-lived signed session
// (`sess.<exp>.<sig>`) accepted everywhere the raw passphrase is. The raw
// secret never leaves the server, and both token kinds die with a token rotation.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from "node:crypto";
import type { NextRequest } from "next/server";

// Length-aware, early-exit-free comparison — avoids leaking length via timing.
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function ownerTokenConfigured(): boolean {
  return Boolean(process.env.PORTFOLIO_OWNER_TOKEN);
}

// ── Signed recovery/session tokens ───────────────────────────────────────────
// Format: <kind>.<expMs>.<hex hmac-sha256(kind.expMs, key=PORTFOLIO_OWNER_TOKEN)>.
// The kind string is inside the HMAC payload, so a recovery link can never be
// replayed as a session (and vice versa).
const RECOVERY_TTL_MS = 30 * 60_000; // emailed link: 30 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60_000; // granted session: 30 days
const signedRe = /^(rec|sess)\.(\d{1,16})\.([0-9a-f]{64})$/;

function sign(kind: "rec" | "sess", exp: number): string {
  const key = process.env.PORTFOLIO_OWNER_TOKEN ?? "";
  return crypto.createHmac("sha256", key).update(`${kind}.${exp}`).digest("hex");
}

export function mintRecoveryToken(nowMs = Date.now()): string {
  const exp = nowMs + RECOVERY_TTL_MS;
  return `rec.${exp}.${sign("rec", exp)}`;
}

export function mintSessionToken(nowMs = Date.now()): string {
  const exp = nowMs + SESSION_TTL_MS;
  return `sess.${exp}.${sign("sess", exp)}`;
}

function signedTokenValid(token: string, kind: "rec" | "sess", nowMs: number): boolean {
  if (!ownerTokenConfigured()) return false; // un-gated → nothing to sign with
  const m = signedRe.exec(token);
  if (!m || m[1] !== kind) return false;
  const exp = Number(m[2]);
  if (!Number.isFinite(exp) || nowMs >= exp) return false;
  return tokensMatch(m[3], sign(kind, exp));
}

export function recoveryTokenValid(token: string, nowMs = Date.now()): boolean {
  return signedTokenValid(token, "rec", nowMs);
}

// The one credential check: the raw passphrase OR a live signed session.
export function ownerCredentialValid(provided: string, nowMs = Date.now()): boolean {
  const required = process.env.PORTFOLIO_OWNER_TOKEN;
  if (!required) return true; // un-gated instance (no token configured)
  return tokensMatch(provided, required) || signedTokenValid(provided, "sess", nowMs);
}

export function isOwnerRequest(req: NextRequest): boolean {
  return ownerCredentialValid(req.headers.get("x-portfolio-owner") ?? "");
}
