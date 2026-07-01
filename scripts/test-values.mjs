// Unit tests for content/values-map.ts — the Values & Love mindmap data.
import { VALUE_CLUSTERS, VALUE_DETAILS, LOVE_TITLE, ALL_VALUE_TITLES } from "../content/values-map.ts";
import { values as profileValues } from "../content/profile.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// 1. Shape: 2 clusters, covering each value title + Love exactly once.
check("exactly 2 clusters", VALUE_CLUSTERS.length === 2);
const seen = new Set();
let dupes = false;
for (const t of ALL_VALUE_TITLES) { if (seen.has(t)) dupes = true; seen.add(t); }
check("no duplicate leaf titles", !dupes);
check("includes the Love capstone", ALL_VALUE_TITLES.includes(LOVE_TITLE));

// 2. Title integrity: every NON-Love leaf matches a real profile.ts value title exactly
//    (guards drift — if a value is renamed in profile.ts, this fails loudly).
const profileTitles = new Set(profileValues.map((v) => v.title));
const nonLove = ALL_VALUE_TITLES.filter((t) => t !== LOVE_TITLE);
check("every non-Love leaf matches a profile.ts value title", nonLove.every((t) => profileTitles.has(t)));
check("the map covers ALL profile values (none dropped)", profileValues.every((v) => ALL_VALUE_TITLES.includes(v.title)));
check("leaf count = profile values + Love", ALL_VALUE_TITLES.length === profileValues.length + 1);

// 3. Every leaf has a complete lived / in-work / for-agent detail.
let allComplete = true;
for (const t of ALL_VALUE_TITLES) {
  const d = VALUE_DETAILS[t];
  const full = d && d.lived.length > 5 && d.inWork.length > 5 && d.forAgent.length > 5;
  if (!full) { allComplete = false; console.log(`   ✗ "${t}" is missing detail`); }
}
check("all leaves have lived + inWork + forAgent detail", allComplete);

// 4. The agent angle names real agent surfaces somewhere.
const agentText = ALL_VALUE_TITLES.map((t) => VALUE_DETAILS[t].forAgent.toLowerCase()).join(" ");
check("agent details reference real surfaces (skill/plugin/workflow/hook)", ["skill", "plugin", "workflow", "hook"].some((s) => agentText.includes(s)));

console.log(ok ? "✅ values: all pass" : "❌ values FAIL");
process.exit(ok ? 0 : 1);
