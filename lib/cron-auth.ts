// ─────────────────────────────────────────────────────────────────────────────
// lib/cron-auth.ts — is this request an authorized SCHEDULED trigger? A Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET`; a GitHub Action (or any external scheduler) can send
// `x-sync-secret: $SYNC_SECRET`. Either lets a weekly job drive an owner-only sync headlessly
// (no owner token). Shared by /api/sync-projects + /api/sync-writing (GET = cron). Never true
// when neither secret is set, so it can't be an open backdoor.
// ─────────────────────────────────────────────────────────────────────────────
import type { NextRequest } from "next/server";

export function isCronRequest(req: NextRequest): boolean {
  const bearer = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  if (bearer && req.headers.get("authorization") === bearer) return true;
  const secret = process.env.SYNC_SECRET;
  return Boolean(secret) && req.headers.get("x-sync-secret") === secret;
}
