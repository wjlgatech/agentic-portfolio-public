// Unit tests for lib/compass-types.ts — the "Next Projects" 4-growth-vector core.
import { normalizeCompass, GROWTH_VECTORS, PROJECT_KINDS, ideaCount, EMPTY_COMPASS } from "../packages/core/src/compass-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// 1. The four vectors are defined, ordered, and each grounded in a named framework.
check("PROJECT_KINDS = the four growth vectors", JSON.stringify(PROJECT_KINDS) === JSON.stringify(["deepen", "widen", "lengthen", "heighten"]));
check("every vector carries a glyph + label + framework", PROJECT_KINDS.every((k) => GROWTH_VECTORS[k].glyph && GROWTH_VECTORS[k].label && GROWTH_VECTORS[k].framework));
check("EMPTY_COMPASS has all four lanes", ["deepen", "widen", "lengthen", "heighten"].every((k) => Array.isArray(EMPTY_COMPASS[k])));

// 2. normalizeCompass populates all four lanes, tags each idea's kind, and counts correctly.
const raw = {
  deepen: [{ title: "D" }],
  widen: [{ title: "W" }],
  lengthen: [{ title: "L" }],
  heighten: [{ title: "H1" }, { title: "H2" }],
  collaborators: [{ handle: "octocat", whyMatch: "x" }],
  generatedAt: "2026-01-01T00:00:00Z",
};
const r = normalizeCompass(raw);
check("all four lanes normalized", r.deepen.length === 1 && r.widen.length === 1 && r.lengthen.length === 1 && r.heighten.length === 2);
check("each idea is tagged with its vector kind", r.deepen[0].kind === "deepen" && r.lengthen[0].kind === "lengthen" && r.heighten[0].kind === "heighten");
check("ideaCount sums the four vectors (not collaborators)", ideaCount(r) === 5);
check("collaborators (Reach) parsed with a valid handle", r.collaborators.length === 1 && r.collaborators[0].url === "https://github.com/octocat");

// 3. Each lane is capped so a runaway model can't bloat the page.
const flood = { lengthen: Array.from({ length: 20 }, (_, i) => ({ title: `L${i}` })) };
check("a lane is capped at 6", normalizeCompass(flood).lengthen.length === 6);

// 4. A title-less idea is dropped (no empty cards).
check("idea without a title is dropped", normalizeCompass({ deepen: [{ rationale: "no title" }] }).deepen.length === 0);

console.log(ok ? "✅ compass: all pass" : "❌ compass FAIL");
process.exit(ok ? 0 : 1);
