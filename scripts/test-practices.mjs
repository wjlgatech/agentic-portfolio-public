// Unit tests for content/practices-map.ts — the 1→3→12 mindmap data.
import { CLUSTERS, PRACTICE_DETAILS, TRUE_LEGEND, ALL_PRACTICE_NS } from "../content/practices-map.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// 1. The 1→3→12 shape: 3 clusters covering exactly practices 1..12, once each.
check("exactly 3 clusters", CLUSTERS.length === 3);
const sorted = [...ALL_PRACTICE_NS].sort((a, b) => a - b);
check("clusters cover exactly 1..12 with no gaps or overlaps", JSON.stringify(sorted) === JSON.stringify(Array.from({ length: 12 }, (_, i) => i + 1)));
check("Aim/Loop/Compound split is 3·4·5", CLUSTERS.map((c) => c.ns.length).join(",") === "3,4,5");
check("every cluster has a glyph + label + gist", CLUSTERS.every((c) => c.glyph && c.label && c.gist));

// 2. Every practice has the full TRUE detail (4 facets) + a human angle + an agent angle.
check("TRUE_LEGEND is exactly T,R,U,E", TRUE_LEGEND.map((l) => l.key).join("") === "TRUE");
let allComplete = true;
for (let n = 1; n <= 12; n++) {
  const d = PRACTICE_DETAILS[n];
  const full = d && ["T", "R", "U", "E"].every((k) => typeof d.facets[k] === "string" && d.facets[k].length > 10) && d.human.length > 5 && d.agent.length > 5;
  if (!full) { allComplete = false; console.log(`   ✗ practice ${n} is missing TRUE detail`); }
}
check("all 12 practices have T·R·U·E + human + agent detail", allComplete);

// 3. The agent angle actually names an agent surface (skill/plugin/workflow/hook) somewhere.
const agentMentions = Array.from({ length: 12 }, (_, i) => PRACTICE_DETAILS[i + 1].agent.toLowerCase()).join(" ");
check("agent details reference real agent surfaces (skill/plugin/workflow/hook)", ["skill", "plugin", "workflow", "hook"].every((t) => agentMentions.includes(t)));

console.log(ok ? "✅ practices: all pass" : "❌ practices FAIL");
process.exit(ok ? 0 : 1);
