// ─────────────────────────────────────────────────────────────────────────────
// content/instances/index.ts — the site-config registry + the ACTIVE-config selector.
//
// A deploy renders the config named by the INSTANCE env var (default: portfolio). The config is
// just DATA (an InstanceConfig): entity/story/theme/agent/sections. Same code, different content.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { validateInstance, type InstanceConfig } from "@core/instance-types";
import { portfolioInstance } from "@/content/instances/portfolio";
import { SEED_PACKS } from "@/content/instances/seeds";

// The registered site configs, by slug. Seed demo packs (fictional, clearly labelled) are
// registered too, so `INSTANCE=demo-dentist` renders one as a whole deploy — and /p/<slug>
// falls back to them as read-only demos (see app/p/[slug]/page.tsx).
export const INSTANCES: Record<string, InstanceConfig> = {
  portfolio: portfolioInstance,
  ...SEED_PACKS,
};

export const DEFAULT_INSTANCE = "portfolio";

// The active config for THIS deploy, selected by the INSTANCE env var (default: portfolio).
// Defensive: an unknown slug or a config that fails the fit-check falls back to the portfolio,
// with a server warning — a misconfigured INSTANCE degrades to the known-good site, never a 500.
// A JSON config dropped in this dir (content/instances/<slug>.json) renders with no code change.
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
