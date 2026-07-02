// ─────────────────────────────────────────────────────────────────────────────
// lib/projects.ts — the LIVE projects list: a durable KV override (owner's GitHub sync)
// over the committed content/projects.json seed. Mirrors lib/portfolio.ts. Server-only
// (imports the JSON + storage). Pure model + merge live in @core/projects-types.
// ─────────────────────────────────────────────────────────────────────────────
import projectsSeed from "@/content/projects.json";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { normalizeProjects, type Project } from "@core/projects-types";

const KV_KEY = "projects:config";

export type { Project };

// The committed seed (content/projects.json), normalized.
export function readProjectsSeed(): Project[] {
  return normalizeProjects(projectsSeed);
}

// The LIVE list: KV override (durable, shared, from the GitHub sync) over the JSON seed.
export async function readProjectsAsync(): Promise<Project[]> {
  const kv = await kvGetJSON<unknown>(KV_KEY);
  const list = kv ? normalizeProjects(kv) : readProjectsSeed();
  return list.length ? list : readProjectsSeed(); // never serve an empty grid
}

// Durable write (KV when configured). Returns whether it persisted durably.
export async function writeProjectsDurable(list: Project[]): Promise<{ persisted: boolean; durable: boolean }> {
  const normalized = normalizeProjects(list);
  if (kvConfigured()) {
    const ok = await kvSetJSON(KV_KEY, normalized);
    return { persisted: ok, durable: ok };
  }
  return { persisted: false, durable: false }; // read-only fs (serverless w/o KV): nothing to persist
}
