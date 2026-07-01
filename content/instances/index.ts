// ─────────────────────────────────────────────────────────────────────────────
// content/instances/index.ts — the pack registry + the ACTIVE-instance selector.
//
// This is the seam that turns "one deploy = the portfolio" into "one deploy = whichever
// business the INSTANCE env var names". A new business is: add a pack file, register it
// here, set INSTANCE=<slug>, deploy. No code fork. The portfolio is INSTANCE=portfolio
// (also the default), so an un-set INSTANCE renders exactly as before.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { validateInstance, type InstanceConfig } from "@core/instance-types";
import { portfolioInstance } from "@/content/instances/portfolio";
import { learningCenter } from "@/content/instances/learning-center";
import { unmaskleads } from "@/content/instances/unmaskleads";

// Every known vertical pack, by slug. Adding a vertical = one import + one entry here.
export const INSTANCES: Record<string, InstanceConfig> = {
  portfolio: portfolioInstance,
  "learning-center": learningCenter,
  unmaskleads,
};

export const DEFAULT_INSTANCE = "portfolio";

// The active instance for THIS deploy, selected by the INSTANCE env var (default: portfolio).
// Defensive: an unknown slug or a pack that fails the fit-check falls back to the portfolio,
// with a server warning — a misconfigured INSTANCE degrades to the known-good site, never a 500.
// A JSON pack emitted by `anyagent agentize --emit-instance` and dropped in this dir renders with
// NO code change — the loop closer. Read at runtime (server-only), validated like any pack.
function loadJsonPack(slug: string): InstanceConfig | null {
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return null; // no path traversal
  try {
    const p = path.join(process.cwd(), "content", "instances", `${slug}.json`);
    return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as InstanceConfig) : null;
  } catch {
    return null;
  }
}

export function getActiveInstance(): InstanceConfig {
  const slug = (process.env.INSTANCE ?? DEFAULT_INSTANCE).trim() || DEFAULT_INSTANCE;
  const pack = INSTANCES[slug] ?? loadJsonPack(slug); // registered .ts pack, else an emitted .json pack
  if (!pack) {
    console.warn(`[instance] INSTANCE="${slug}" is not a known pack (have: ${Object.keys(INSTANCES).join(", ")}, or a content/instances/${slug}.json). Falling back to "${DEFAULT_INSTANCE}".`);
    return portfolioInstance;
  }
  const { ok, config, errors } = validateInstance(pack);
  if (!ok || !config) {
    console.warn(`[instance] pack "${slug}" failed the fit-check (${errors.join("; ")}). Falling back to "${DEFAULT_INSTANCE}".`);
    return portfolioInstance;
  }
  return config;
}
