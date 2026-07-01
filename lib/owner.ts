// ─────────────────────────────────────────────────────────────────────────────
// lib/owner.ts — the ownership check, shared by /api/owner and /api/portfolio.
//
// Ownership is proven by a secret in PORTFOLIO_OWNER_TOKEN (server-side only).
// If no token is configured, the instance is un-gated (local dev) and every
// request counts as the owner. Kept out of the route files because Next.js only
// allows HTTP-method exports from a route module.
// ─────────────────────────────────────────────────────────────────────────────
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

export function isOwnerRequest(req: NextRequest): boolean {
  const required = process.env.PORTFOLIO_OWNER_TOKEN;
  if (!required) return true; // un-gated instance (no token configured)
  const provided = req.headers.get("x-portfolio-owner") ?? "";
  return tokensMatch(provided, required);
}
