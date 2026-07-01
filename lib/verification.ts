// ─────────────────────────────────────────────────────────────────────────────
// lib/verification.ts — the SERVER (fs) layer for the self-proof report. Reads/
// writes content/verification.json. The pure model (types, verdict taxonomy, the
// deterministic aggregate) lives in lib/verification-types.ts and is re-exported
// here, so server code can `import … from "@/lib/verification"` as one surface
// while client components import the fs-free types directly.
//
// DISCIPLINE REUSED FROM career-os (github.com/wjlgatech/career-os):
//   • claim taxonomy mirrors cv.template.md (summary/experience/project/skill/education)
//   • evidence must be a "proof point" (mechanism + metric/status), not marketing
//     (article-digest.template.md)
//   • "no fabrication" → honest `unverified` is correct; `inferred` flags a reasoned
//     but unproven verdict (career-os ethical standards)
//   • the LLM judges each CLAIM; the AGGREGATE is computed in code, not trusted.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { normalizeReport, EMPTY_REPORT, type VerificationReport } from "@core/verification-types";

export * from "@core/verification-types";

export const VERIFICATION_PATH = path.join(process.cwd(), "content", "verification.json");

export function readVerification(): VerificationReport {
  try {
    return normalizeReport(JSON.parse(fs.readFileSync(VERIFICATION_PATH, "utf8")));
  } catch {
    return EMPTY_REPORT;
  }
}

// True if written to disk. Read-only fs (serverless) → false; the client keeps the
// report in localStorage and the owner commits content/verification.json to ship it.
export function writeVerification(report: VerificationReport): boolean {
  try {
    fs.writeFileSync(VERIFICATION_PATH, JSON.stringify(normalizeReport(report), null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
