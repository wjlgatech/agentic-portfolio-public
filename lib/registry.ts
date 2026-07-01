// ─────────────────────────────────────────────────────────────────────────────
// lib/registry.ts — fs read/write for the Portfolio Registry (content/registry.json).
// Re-exports the pure core (lib/registry-types.ts). On serverless the fs is read-only,
// so a POST /api/registry returns the validated entry and the canonical registry grows
// by committing the JSON (or, later, a real datastore). MVP: a committed seed + an
// append-in-dev write.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { normalizeRegistry, type RegistryEntry } from "@core/registry-types";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";

export * from "@core/registry-types";

export const REGISTRY_PATH = path.join(process.cwd(), "content", "registry.json");
const KV_KEY = "registry:entries";

// The committed seed (genesis nodes), from content/registry.json.
export function readRegistry(): RegistryEntry[] {
  try {
    return normalizeRegistry(JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")));
  } catch {
    return [];
  }
}

// The live registry = KV joins (durable, shared) merged OVER the committed seed.
// Falls back to the seed when KV isn't configured.
export async function readRegistryAsync(): Promise<RegistryEntry[]> {
  const seed = readRegistry();
  const kv = (await kvGetJSON<RegistryEntry[]>(KV_KEY)) ?? [];
  return normalizeRegistry([...kv, ...seed]); // KV first → wins dedup by URL
}

// Durable upsert: KV when configured (shared across instances), else dev fs write.
// Returns { persisted, durable } so the caller can tell the user.
export async function upsertEntry(entry: RegistryEntry): Promise<{ persisted: boolean; durable: boolean }> {
  if (kvConfigured()) {
    const kv = (await kvGetJSON<RegistryEntry[]>(KV_KEY)) ?? [];
    const filtered = kv.filter((e) => e.url.replace(/\/+$/, "").toLowerCase() !== entry.url.replace(/\/+$/, "").toLowerCase());
    const ok = await kvSetJSON(KV_KEY, normalizeRegistry([entry, ...filtered]));
    return { persisted: ok, durable: ok };
  }
  try {
    const current = readRegistry().filter((e) => e.url.replace(/\/+$/, "").toLowerCase() !== entry.url.replace(/\/+$/, "").toLowerCase());
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ entries: normalizeRegistry([entry, ...current]) }, null, 2), "utf8");
    return { persisted: true, durable: false }; // dev fs — not shared across instances
  } catch {
    return { persisted: false, durable: false };
  }
}
