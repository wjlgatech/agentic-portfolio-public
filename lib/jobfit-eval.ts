// ─────────────────────────────────────────────────────────────────────────────
// lib/jobfit-eval.ts — the SERVER (fs) layer for the JD-fit scorer's CREDIBILITY
// scorecard. Reads/writes content/jobfit-eval.json (produced by scripts/eval-jobfit.mjs
// running the real scorer over content/jobfit-golden.json). The pure model + the
// deterministic scoreEval/normalizeEval live in @core/jobfit-types.
//
// This is the "why should I trust the conclusion" artifact: the page shows how often the
// scorer agrees with the human-labeled golden set, so a verdict carries a measured
// accuracy, not just an opinion.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { normalizeEval, EMPTY_EVAL, type FitEval } from "@core/jobfit-types";

export const JOBFIT_EVAL_PATH = path.join(process.cwd(), "content", "jobfit-eval.json");

export function readJobFitEval(): FitEval {
  try {
    return normalizeEval(JSON.parse(fs.readFileSync(JOBFIT_EVAL_PATH, "utf8")));
  } catch {
    return EMPTY_EVAL;
  }
}

export function writeJobFitEval(evalReport: FitEval): boolean {
  try {
    fs.writeFileSync(JOBFIT_EVAL_PATH, JSON.stringify(normalizeEval(evalReport), null, 2) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}
