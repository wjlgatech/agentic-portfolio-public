// ─────────────────────────────────────────────────────────────────────────────
// lib/compass.ts — the SERVER (fs) layer for the Compass scout. Reads/writes
// content/compass.json (the latest report) and reads content/compass.yaml (the
// cadence + widen-interests config). The pure model lives in lib/compass-types.ts
// and is re-exported here.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { normalizeCompass, normalizeConfig, EMPTY_COMPASS, type CompassReport, type CompassConfig } from "@core/compass-types";

export * from "@core/compass-types";

export const COMPASS_PATH = path.join(process.cwd(), "content", "compass.json");
export const COMPASS_CONFIG_PATH = path.join(process.cwd(), "content", "compass.yaml");

export function readCompass(): CompassReport {
  try {
    return normalizeCompass(JSON.parse(fs.readFileSync(COMPASS_PATH, "utf8")));
  } catch {
    return EMPTY_COMPASS;
  }
}

export function readCompassConfig(): CompassConfig {
  try {
    return normalizeConfig(parseYaml(fs.readFileSync(COMPASS_CONFIG_PATH, "utf8")) ?? {});
  } catch {
    return { cadence: "weekly", widenInterests: [] };
  }
}

// True if written to disk. On serverless (read-only fs) → false; the scheduled
// GitHub Action commits content/compass.json instead (see .github/workflows).
export function writeCompass(report: CompassReport): boolean {
  try {
    fs.writeFileSync(COMPASS_PATH, JSON.stringify(normalizeCompass(report), null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
