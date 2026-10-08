// ─────────────────────────────────────────────────────────────────────────────
// lib/instance-owner.ts — the ONE answer to "does this request own hosted portfolio <slug>?"
// Used by every owner-gated, per-portfolio route (leads, opportunities, sync, posts). It used to be
// copied into each route; a fourth copy for hosted writing is what prompted the move — a security
// check that exists in N places is N places to drift.
//
// The deploy admin (global PORTFOLIO_OWNER_TOKEN) owns any portfolio — but ONLY when that token is
// actually configured and matches (never the un-gated dev shortcut, or a deploy without the token
// would leave every tenant's data open). Otherwise the caller must present the per-portfolio owner
// token whose SHA-256 matches owner:<slug> in the store (multi-tenant safe, constant-time compare).
// ─────────────────────────────────────────────────────────────────────────────
import type { NextRequest } from "next/server";
import { isOwnerRequest, ownerTokenConfigured } from "@/lib/owner";
import { ownerHashMatches, ownerKey } from "@/lib/portfolio-owner";
import { kvGetJSON } from "@/lib/storage";

export async function ownsInstance(req: NextRequest, slug?: string): Promise<boolean> {
  if (ownerTokenConfigured() && isOwnerRequest(req)) return true;
  if (!slug) return false;
  const provided = req.headers.get("x-portfolio-owner") ?? "";
  if (!provided) return false;
  const hash = await kvGetJSON<string>(ownerKey(slug));
  return hash ? ownerHashMatches(provided, hash) : false;
}
