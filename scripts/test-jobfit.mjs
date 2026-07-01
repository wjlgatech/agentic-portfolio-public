// Deterministic unit test for the JD-fit scorer's PURE logic — no LLM, no network, always
// in `npm test`. Covers the two things that must never drift: (1) the credibility-bearing
// aggregate (overall + level computed IN CODE from axis scores, model can't inflate it), and
// (2) the ATS URL parser + HTML→text that feed real postings in. The LIVE golden-set accuracy
// (the scorer vs. human labels) is measured separately by scripts/eval-jobfit.mjs.
import {
  aggregateFit, levelFor, normalizeFit, FIT_AXES,
  scoreEval, normalizeEval, bandsApart,
} from "../packages/core/src/jobfit-types.ts";
import { parseJobUrl, htmlToText } from "../lib/jobfit.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// ── weights are a valid distribution, trajectory weighted highest ───────────────
const wsum = FIT_AXES.reduce((s, a) => s + a.weight, 0);
check("axis weights sum to 1", Math.abs(wsum - 1) < 1e-9);
check("trajectory is the highest-weighted axis (mission > title-match)",
  FIT_AXES.find((a) => a.id === "trajectory").weight === Math.max(...FIT_AXES.map((a) => a.weight)));

// ── levelFor thresholds ─────────────────────────────────────────────────────────
check("levelFor: 80 → strong", levelFor(80) === "strong");
check("levelFor: 60 → promising", levelFor(60) === "promising");
check("levelFor: 40 → stretch", levelFor(40) === "stretch");
check("levelFor: 20 → misaligned", levelFor(20) === "misaligned");

// ── aggregateFit is the weighted mean, recomputed (not trusted) ─────────────────
const all100 = FIT_AXES.map((a) => ({ axis: a.id, score: 100, rationale: "", evidence: [], gaps: [] }));
check("all axes 100 → overall 100, strong", aggregateFit(all100).overall === 100 && aggregateFit(all100).level === "strong");

const mixed = [
  { axis: "experience", score: 100, rationale: "", evidence: [], gaps: [] },
  { axis: "skills", score: 0, rationale: "", evidence: [], gaps: [] },
  { axis: "trajectory", score: 0, rationale: "", evidence: [], gaps: [] },
];
// 0.3*100 / 1.0 = 30 → misaligned (not "strong" just because one axis is perfect)
check("high experience, zero skills/trajectory → 30, misaligned", aggregateFit(mixed).overall === 30 && aggregateFit(mixed).level === "misaligned");

// missing axes → present weights renormalize (a partial result still scores honestly)
const onlyTraj = [{ axis: "trajectory", score: 80, rationale: "", evidence: [], gaps: [] }];
check("only trajectory present (80) renormalizes to 80, strong", aggregateFit(onlyTraj).overall === 80);

// ── normalizeFit drops junk + RE-DERIVES the headline ───────────────────────────
const norm = normalizeFit({
  overall: 999, level: "strong", // the model lying about its own score — must be ignored
  axes: [
    { axis: "experience", score: 50, gaps: ["needs 5y mgmt"] },
    { axis: "experience", score: 10 }, // duplicate axis → ignored
    { axis: "bogus", score: 100 }, // invalid axis → dropped
    { axis: "skills", score: 50, gaps: ["needs 5y mgmt", "no Kubernetes"] },
    { axis: "trajectory", score: 50 },
  ],
  recommendation: "network in first",
  jdPreview: "x".repeat(400),
});
check("normalizeFit recomputes overall (ignores model's 999)", norm.overall === 50);
check("normalizeFit drops the invalid axis + dedups the duplicate", norm.axes.length === 3);
check("normalizeFit keeps the FIRST verdict for a duplicated axis", norm.axes.find((a) => a.axis === "experience").score === 50);
check("normalizeFit unions + dedups honest gaps", norm.honestGaps.length === 2);
check("normalizeFit caps jdPreview at 280", norm.jdPreview.length === 280);
check("normalizeFit keeps the recommendation text", norm.recommendation === "network in first");

// ── parseJobUrl: the three public ATSs + generic fallback ───────────────────────
check("ashby url parsed", JSON.stringify(parseJobUrl("https://jobs.ashbyhq.com/Etched/831bfa22-d883-450b-9b10-2a16421525a0")) === JSON.stringify({ ats: "ashby", org: "Etched", id: "831bfa22-d883-450b-9b10-2a16421525a0" }));
check("greenhouse url parsed", JSON.stringify(parseJobUrl("https://boards.greenhouse.io/acme/jobs/4567")) === JSON.stringify({ ats: "greenhouse", org: "acme", id: "4567" }));
check("job-boards.greenhouse.io parsed too", parseJobUrl("https://job-boards.greenhouse.io/acme/jobs/99")?.ats === "greenhouse");
check("lever url parsed", JSON.stringify(parseJobUrl("https://jobs.lever.co/acme/abc-123")) === JSON.stringify({ ats: "lever", org: "acme", id: "abc-123" }));
check("scheme-less url still parses (adds https)", parseJobUrl("jobs.ashbyhq.com/Foo/bar")?.org === "Foo");
check("unknown host → generic (still fetchable as HTML)", parseJobUrl("https://careers.example.com/role/eng")?.ats === "generic");
check("garbage → null", parseJobUrl("not a url") === null);
check("scheme-only → null (no host)", parseJobUrl("https://") === null);

// ── htmlToText strips scripts + tags ────────────────────────────────────────────
const t = htmlToText("<p>Hello <b>world</b></p><script>steal()</script><div>Bye &amp; done</div>");
check("htmlToText keeps text", /Hello world/.test(t) && /Bye & done/.test(t));
check("htmlToText drops <script> contents", !/steal/.test(t));

// ── scoreEval / bandsApart / normalizeEval (the credibility scorecard math) ─────
check("bandsApart strong↔promising = 1", bandsApart("strong", "promising") === 1);
check("bandsApart strong↔stretch = 2", bandsApart("strong", "stretch") === 2);
const ev = scoreEval([
  { company: "a", title: "x", url: "", expected: "strong", predicted: "strong", overall: 90 },     // exact + hit
  { company: "b", title: "y", url: "", expected: "strong", predicted: "promising", overall: 70 },   // within1 hit, not exact
  { company: "c", title: "z", url: "", expected: "misaligned", predicted: "strong", overall: 80 },  // miss (2 bands)
], { ranAt: "2026-01-01", model: "test" });
check("scoreEval n", ev.n === 3);
check("scoreEval exactMatches = 1", ev.exactMatches === 1);
check("scoreEval within1 = 2", ev.within1 === 2);
check("scoreEval accuracy = round(2/3*100) = 67", ev.accuracy === 67);
check("normalizeEval drops rows with invalid levels", normalizeEval({ examples: [{ expected: "strong", predicted: "bogus", overall: 50, company: "x", title: "t", url: "" }] }).n === 0);

console.log(ok ? "✅ jobfit: all pass" : "❌ jobfit FAIL");
process.exit(ok ? 0 : 1);
