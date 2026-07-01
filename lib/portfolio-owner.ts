// ─────────────────────────────────────────────────────────────────────────────
// lib/portfolio-owner.ts — PER-PORTFOLIO ownership for hosted (/make → /p/<slug>) portfolios.
// The single global PORTFOLIO_OWNER_TOKEN only makes the DEPLOY admin an owner; a non-technical
// person who makes their own portfolio needs to own THAT page (view their leads, manage it) without
// owning anyone else's. So each hosted portfolio gets its own secret, minted at creation.
//
// Security: we store only the SHA-256 HASH of the token (never the raw token), compare in constant
// time, and the token is shown to the maker exactly once. Server-only (uses node:crypto); never
// imported by a client bundle. KV read/write is passed in by the caller so this stays pure+testable.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from "node:crypto";

export function mintOwnerToken(): string {
  return crypto.randomBytes(18).toString("base64url"); // 24-char, URL-safe
}

export function hashOwnerToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

// Constant-time check of a presented token against a stored hash.
export function ownerHashMatches(token: string, hash: string): boolean {
  if (!token || !hash) return false;
  const h = hashOwnerToken(token);
  if (h.length !== hash.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
  } catch {
    return false;
  }
}

export const ownerKey = (slug: string) => `owner:${slug}`;
