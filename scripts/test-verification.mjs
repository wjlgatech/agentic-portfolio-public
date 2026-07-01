// Unit tests for lib/verification-types.ts — the deterministic Receipts scorecard.
import { aggregate, normalizeReport } from "../packages/core/src/verification-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const claims = [
  { claim: "ships Python agent tools", category: "skill", verdict: "corroborated", confidence: 0.9, inferred: false, evidence: [], context: "", gapCloser: "" },
  { claim: "leads at Genentech", category: "experience", verdict: "unverified", confidence: 0.5, inferred: false, evidence: [], context: "", gapCloser: "" },
  { claim: "expert Rust 10y", category: "skill", verdict: "contradicted", confidence: 0.6, inferred: true, evidence: [], context: "", gapCloser: "" },
  { claim: "teaches a cohort", category: "experience", verdict: "partial", confidence: 0.6, inferred: true, evidence: [], context: "", gapCloser: "" },
];

const s = aggregate(claims, "");
// corroborated=1, partial=0.5, unverified=0, contradicted=0 → (1+0.5)/4 = 37.5 → 38
check("overallScore is the deterministic corroboration index", s.overallScore === 38);
check("counts are correct", s.counts.corroborated === 1 && s.counts.partial === 1 && s.counts.unverified === 1 && s.counts.contradicted === 1);
check("honestGaps lists unverified + contradicted", s.honestGaps.length === 2);
check("byCategory computed per category", s.byCategory.find((c) => c.category === "skill")?.total === 2);

// normalizeReport drops malformed claims and re-derives the aggregate
const rep = normalizeReport({ claims: [{ claim: "ok", verdict: "corroborated", category: "skill" }, { verdict: "corroborated" }, "junk"], summary: { headline: "" } });
check("normalizeReport keeps only valid claims", rep.claims.length === 1);
check("normalizeReport recomputes the score (1/1 = 100)", rep.summary.overallScore === 100);

console.log(ok ? "✅ verification: all pass" : "❌ verification FAIL");
process.exit(ok ? 0 : 1);
