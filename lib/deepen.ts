// ─────────────────────────────────────────────────────────────────────────────
// lib/deepen.ts — fs + durable-KV layer for the "deepen" feed (content/deepen.json).
// Re-exports the pure core (@core/deepen-types). Same seed→durable pattern as lib/registry.ts:
// a committed Engram seed is the base, and ingested artifacts (from super-u's flywheel calling
// POST /api/ingest-knowledge) are merged OVER it via the durable KV (Postgres) so they survive
// + are shared across instances. Falls back to a dev fs write when KV isn't configured.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { normalizeDeepen, upsertArtifact, EMPTY_DEEPEN, type DeepenArtifact, type DeepenFeed } from "@core/deepen-types";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";

export * from "@core/deepen-types";

export const DEEPEN_PATH = path.join(process.cwd(), "content", "deepen.json");
const KV_KEY = "deepen:feed";

// The committed seed (the Engram worked example), from content/deepen.json.
export function readDeepen(): DeepenFeed {
  try {
    return normalizeDeepen(JSON.parse(fs.readFileSync(DEEPEN_PATH, "utf8")));
  } catch {
    return EMPTY_DEEPEN;
  }
}

// The live feed = durable ingests merged OVER the committed seed (ingests win dedup by id).
export async function readDeepenAsync(): Promise<DeepenFeed> {
  const seed = readDeepen();
  const kv = (await kvGetJSON<DeepenFeed>(KV_KEY)) ?? EMPTY_DEEPEN;
  return normalizeDeepen({ artifacts: [...(kv.artifacts ?? []), ...seed.artifacts] });
}

// Durable ingest of one artifact. KV when configured (shared), else dev fs write.
export async function ingestArtifact(artifact: DeepenArtifact): Promise<{ persisted: boolean; durable: boolean }> {
  if (kvConfigured()) {
    const kv = (await kvGetJSON<DeepenFeed>(KV_KEY)) ?? EMPTY_DEEPEN;
    const next = upsertArtifact(normalizeDeepen(kv), artifact);
    const ok = await kvSetJSON(KV_KEY, next);
    return { persisted: ok, durable: ok };
  }
  try {
    const next = upsertArtifact(readDeepen(), artifact);
    fs.writeFileSync(DEEPEN_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
    return { persisted: true, durable: false }; // dev fs — not shared across instances
  } catch {
    return { persisted: false, durable: false };
  }
}
