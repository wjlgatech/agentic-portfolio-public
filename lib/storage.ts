// ─────────────────────────────────────────────────────────────────────────────
// lib/storage.ts — durable key-value storage for serverless (STRATEGY.md: "move
// persistence to KV"). On Vercel the fs is read-only, so registry joins + owner edits
// were per-instance / per-browser. With a Postgres store configured they become durable
// and shared across all visitors and instances.
//
// Backed by Postgres (Vercel Postgres / Neon) over the @neondatabase/serverless HTTP
// driver — works in serverless + edge, no connection pool to leak. A single `kv_store`
// table (key TEXT PRIMARY KEY, value JSONB) gives a tiny KV interface; the table is
// created lazily on first use. The exported surface (kvConfigured / kvGetJSON / kvSetJSON)
// is unchanged, so lib/registry.ts + lib/portfolio.ts + /api/health need no edits.
//
// When no connection string is set (POSTGRES_URL / DATABASE_URL absent — local dev), every
// call no-ops so callers transparently fall back to the committed fs seed / localStorage.
// ─────────────────────────────────────────────────────────────────────────────
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Vercel's Postgres integration injects POSTGRES_URL; a raw Neon project uses DATABASE_URL.
// Accept either so the same code works however the store was provisioned.
function connectionString(): string {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

export function kvConfigured(): boolean {
  return Boolean(connectionString());
}

let client: NeonQueryFunction<false, false> | null = null;
function sql(): NeonQueryFunction<false, false> {
  if (!client) client = neon(connectionString());
  return client;
}

// Create the table once per serverless instance. Memoize the promise so concurrent
// first calls share one CREATE (which is itself IF NOT EXISTS, so idempotent anyway).
let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!ensured) {
    ensured = sql()`
      CREATE TABLE IF NOT EXISTS kv_store (
        key        TEXT PRIMARY KEY,
        value      JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => undefined).catch((e) => {
      ensured = null; // let a later call retry if the first CREATE failed
      throw e;
    });
  }
  return ensured;
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  if (!kvConfigured()) return null;
  try {
    await ensureTable();
    const rows = (await sql()`SELECT value FROM kv_store WHERE key = ${key}`) as { value: T }[];
    return rows.length ? rows[0].value : null; // JSONB comes back already parsed
  } catch {
    return null; // store unreachable → fall back to fs/seed
  }
}

export async function kvSetJSON(key: string, value: unknown): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    await ensureTable();
    await sql()`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    return true;
  } catch {
    return false;
  }
}
