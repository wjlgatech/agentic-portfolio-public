// ─────────────────────────────────────────────────────────────────────────────
// packages/core/src/jobfit-types.ts — the PURE core of the JD-fit model: types, the
// axis taxonomy, fit levels, and the deterministic aggregate. NO node:fs here, so a
// client component (components/JobFit.tsx) can import it. The fs/LLM server layer is
// lib/jobfit.ts.
//
// Sibling to verification-types.ts. Where that audits résumé CLAIMS against evidence,
// this scores a JOB against the owner across three axes — past experience, current
// skillset, and future mission/value/vision trajectory. The per-axis verdicts come from
// the LLM; the OVERALL score + fit level are computed HERE, in code (score, don't vibe),
// so the headline number can't be inflated by the model. Credibility is earned by a
// golden-set eval (scripts/eval-jobfit.mjs → content/jobfit-eval.json), the career-os
// "verify, don't trust" discipline applied to the scorer itself.
// ─────────────────────────────────────────────────────────────────────────────

export type FitAxisId = "experience" | "skills" | "trajectory";

// The three axes + their weight in the overall score. Trajectory is weighted highest:
// the owner optimizes for where the role pulls them (mission/values/12X), not just past
// title-match. Weights MUST sum to 1.
export const FIT_AXES: { id: FitAxisId; label: string; gist: string; weight: number }[] = [
  { id: "experience", label: "Past experience", gist: "What the role demands vs. what the corpus shows they've actually shipped.", weight: 0.3 },
  { id: "skills", label: "Current skillset", gist: "Skills the JD requires vs. skills demonstrated in real artifacts.", weight: 0.3 },
  { id: "trajectory", label: "Mission · values · vision", gist: "Does the role pull toward where they're going (mission, values, the 12X practices) — not just where they've been.", weight: 0.4 },
];

export type FitLevel = "strong" | "promising" | "stretch" | "misaligned";

// Ordered best→worst; `min` is the inclusive overall-score floor for the level.
export const FIT_LEVELS: { id: FitLevel; label: string; icon: string; min: number }[] = [
  { id: "strong", label: "Strong fit", icon: "🟢", min: 75 },
  { id: "promising", label: "Promising", icon: "🟡", min: 55 },
  { id: "stretch", label: "Stretch", icon: "🟠", min: 35 },
  { id: "misaligned", label: "Misaligned", icon: "⚪", min: 0 },
];

export type AxisVerdict = {
  axis: FitAxisId;
  score: number; // 0..100
  rationale: string; // 1-2 grounded sentences
  evidence: string[]; // concrete corpus signals (repo / article / profile), not adjectives
  gaps: string[]; // honest gaps for this axis (the "why this might NOT fit")
};

export type JobMeta = { title: string; company: string; location: string; url: string; source: string };

export type JobFit = {
  generatedAt: string; // ISO; "" when never run
  model: string;
  job: JobMeta;
  axes: AxisVerdict[];
  overall: number; // 0..100 — COMPUTED in code, not from the model
  level: FitLevel; // COMPUTED in code from overall
  recommendation: string; // the honest one-line call (apply / network-in first / skip — and why)
  honestGaps: string[]; // union of the axes' gaps
  jdPreview: string;
};

export const EMPTY_FIT: JobFit = {
  generatedAt: "",
  model: "",
  job: { title: "", company: "", location: "", url: "", source: "" },
  axes: [],
  overall: 0,
  level: "misaligned",
  recommendation: "",
  honestGaps: [],
  jdPreview: "",
};

const clamp100 = (n: unknown) => {
  const x = typeof n === "number" && isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, Math.round(x)));
};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strArr = (v: unknown, cap = 6) =>
  (Array.isArray(v) ? v : []).map(str).filter(Boolean).slice(0, cap);

// overall score → fit level (the first level whose floor it clears).
export function levelFor(overall: number): FitLevel {
  for (const l of FIT_LEVELS) if (overall >= l.min) return l.id;
  return "misaligned";
}

// Deterministic aggregate: weight each axis by FIT_AXES.weight. Missing axes are simply
// dropped and the present weights renormalized, so a partial result still scores honestly.
export function aggregateFit(axes: AxisVerdict[]): { overall: number; level: FitLevel } {
  let wsum = 0;
  let acc = 0;
  for (const a of axes) {
    const def = FIT_AXES.find((x) => x.id === a.axis);
    if (!def) continue;
    wsum += def.weight;
    acc += def.weight * a.score;
  }
  const overall = wsum > 0 ? Math.round(acc / wsum) : 0;
  return { overall, level: levelFor(overall) };
}

function cleanAxis(raw: unknown): AxisVerdict | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const axis = o.axis as FitAxisId;
  if (!FIT_AXES.some((x) => x.id === axis)) return null;
  return { axis, score: clamp100(o.score), rationale: str(o.rationale), evidence: strArr(o.evidence), gaps: strArr(o.gaps) };
}

// Coerce arbitrary input (an LLM JSON blob, or the seed file) into a safe JobFit, keeping
// at most one verdict per axis and RE-DERIVING overall + level from the cleaned axes so the
// headline can't be faked. Hallucinated/extra fields are dropped.
export function normalizeFit(raw: unknown): JobFit {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const jraw = (o.job && typeof o.job === "object" ? o.job : {}) as Record<string, unknown>;

  const byAxis = new Map<FitAxisId, AxisVerdict>();
  for (const a of Array.isArray(o.axes) ? o.axes : []) {
    const c = cleanAxis(a);
    if (c && !byAxis.has(c.axis)) byAxis.set(c.axis, c);
  }
  // Keep axes in the canonical FIT_AXES order.
  const axes = FIT_AXES.map((d) => byAxis.get(d.id)).filter((a): a is AxisVerdict => a != null);
  const { overall, level } = aggregateFit(axes);

  return {
    generatedAt: str(o.generatedAt),
    model: str(o.model),
    job: {
      title: str(jraw.title),
      company: str(jraw.company),
      location: str(jraw.location),
      url: str(jraw.url),
      source: str(jraw.source),
    },
    axes,
    overall,
    level,
    recommendation: str(o.recommendation),
    honestGaps: Array.from(new Set(axes.flatMap((a) => a.gaps))).slice(0, 8),
    jdPreview: str(o.jdPreview).slice(0, 280),
  };
}

// ── The golden-set eval (the credibility scorecard) ─────────────────────────────
// scripts/eval-jobfit.mjs runs the REAL scorer over content/jobfit-golden.json and writes
// this. A prediction "hits" when its level lands within ONE band of the labeled expected
// level (fit is fuzzy; exact-band is also reported). The page shows accuracy so a visitor
// can judge whether to trust a verdict — the scorer is held to the same standard it holds JDs.
export type FitEvalExample = {
  company: string;
  title: string;
  url: string;
  expected: FitLevel;
  predicted: FitLevel;
  overall: number;
  exact: boolean; // predicted === expected
  hit: boolean; // predicted within 1 band of expected
};

export type FitEval = {
  ranAt: string;
  model: string;
  n: number;
  exactMatches: number;
  within1: number;
  accuracy: number; // 0..100 = within1 / n
  examples: FitEvalExample[];
};

export const EMPTY_EVAL: FitEval = { ranAt: "", model: "", n: 0, exactMatches: 0, within1: 0, accuracy: 0, examples: [] };

const LEVEL_ORDER: FitLevel[] = FIT_LEVELS.map((l) => l.id); // best→worst, index = rank

export function bandsApart(a: FitLevel, b: FitLevel): number {
  return Math.abs(LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
}

// Compute the eval scorecard from (expected, predicted) pairs — deterministically.
export function scoreEval(
  rows: { company: string; title: string; url: string; expected: FitLevel; predicted: FitLevel; overall: number }[],
  meta: { ranAt: string; model: string },
): FitEval {
  const examples: FitEvalExample[] = rows.map((r) => {
    const exact = r.predicted === r.expected;
    const hit = bandsApart(r.expected, r.predicted) <= 1;
    return { ...r, exact, hit };
  });
  const n = examples.length;
  const exactMatches = examples.filter((e) => e.exact).length;
  const within1 = examples.filter((e) => e.hit).length;
  return { ranAt: meta.ranAt, model: meta.model, n, exactMatches, within1, accuracy: n ? Math.round((within1 / n) * 100) : 0, examples };
}

export function normalizeEval(raw: unknown): FitEval {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rows = (Array.isArray(o.examples) ? o.examples : [])
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const x = e as Record<string, unknown>;
      const expected = x.expected as FitLevel;
      const predicted = x.predicted as FitLevel;
      if (!LEVEL_ORDER.includes(expected) || !LEVEL_ORDER.includes(predicted)) return null;
      return { company: str(x.company), title: str(x.title), url: str(x.url), expected, predicted, overall: clamp100(x.overall) };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
  return scoreEval(rows, { ranAt: str(o.ranAt), model: str(o.model) });
}
