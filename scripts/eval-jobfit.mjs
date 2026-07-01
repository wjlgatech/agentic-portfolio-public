// Golden-set EVAL for the JD-fit scorer — the "why trust the conclusion" harness. Runs the
// REAL scorer (POST /api/job-fit) over every labeled example in content/jobfit-golden.json,
// compares the predicted fit level to the human-assigned `expected`, and writes the accuracy
// scorecard to content/jobfit-eval.json (which the page displays).
//
// NOT in `npm test` (it needs a running server + an LLM key + network, and is nondeterministic).
// Run it deliberately:
//     npm run dev            # in one shell (or point at prod)
//     node scripts/eval-jobfit.mjs                       # localhost:3000
//     JOBFIT_BASE=https://your-site.vercel.app node scripts/eval-jobfit.mjs
// Then commit content/jobfit-eval.json. Re-run whenever the scorer or the golden set changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreEval } from "../packages/core/src/jobfit-types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.JOBFIT_BASE || "http://localhost:3000";
const golden = JSON.parse(fs.readFileSync(path.join(root, "content", "jobfit-golden.json"), "utf8"));
const examples = golden.examples || [];

console.log(`Evaluating the JD-fit scorer over ${examples.length} golden examples against ${BASE} …\n`);

const rows = [];
let model = "";
for (const ex of examples) {
  // Score against the inline JD text (reproducible ground truth), not the live URL.
  let predicted = null, overall = 0;
  try {
    const res = await fetch(`${BASE}/api/job-fit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ex.text, title: ex.title, company: ex.company }),
    });
    const data = await res.json();
    if (!res.ok) { console.log(`⚠️  ${ex.company} / ${ex.title}: ${data.error || res.status}`); continue; }
    predicted = data.fit.level;
    overall = data.fit.overall;
    model = data.fit.model || model;
  } catch (e) {
    console.log(`⚠️  ${ex.company} / ${ex.title}: ${e.message}`);
    continue;
  }
  const within1 = Math.abs(["strong", "promising", "stretch", "misaligned"].indexOf(ex.expected) - ["strong", "promising", "stretch", "misaligned"].indexOf(predicted)) <= 1;
  console.log(`${within1 ? "✅" : "❌"} ${ex.title.padEnd(38)} expected ${ex.expected.padEnd(11)} → got ${predicted.padEnd(11)} (${overall})`);
  rows.push({ company: ex.company, title: ex.title, url: ex.url || "", expected: ex.expected, predicted, overall });
}

if (rows.length === 0) {
  console.log("\n❌ No examples scored (is the dev server running with an LLM key?). Not writing the scorecard.");
  process.exit(1);
}

const report = scoreEval(rows, { ranAt: new Date().toISOString(), model });
fs.writeFileSync(path.join(root, "content", "jobfit-eval.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`\n📊 Accuracy (within 1 band): ${report.within1}/${report.n} = ${report.accuracy}%  ·  exact: ${report.exactMatches}/${report.n}  ·  model ${model}`);
console.log("📝 Wrote content/jobfit-eval.json");
