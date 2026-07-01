// ─────────────────────────────────────────────────────────────────────────────
// lib/rate-limit.ts — a tiny per-IP fixed-window rate limiter for the OPEN routes
// (no owner gate) that cost money or hit third parties: /api/copilotkit, /api/a2a
// (LLM), /api/repo-digest, /api/repo-activity (GitHub). Without this, anyone can
// drain the free LLM quota or rack up a bill by hammering these endpoints.
//
// In-memory + per-serverless-instance: not a global limiter, but a real first line
// of defense with zero infra. Swap for a Postgres-backed limiter (lib/storage.ts) when a
// cross-instance counter is needed.
// ─────────────────────────────────────────────────────────────────────────────

type Entry = { count: number; reset: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  let e = buckets.get(key);
  if (!e || now >= e.reset) {
    e = { count: 0, reset: now + windowMs };
    buckets.set(key, e);
  }
  e.count++;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k); // opportunistic cleanup
  }
  return e.count > limit ? { ok: false, retryAfter: Math.max(1, Math.ceil((e.reset - now) / 1000)) } : { ok: true, retryAfter: 0 };
}

export function clientKey(req: { headers: { get(n: string): string | null } }): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "anon");
}
