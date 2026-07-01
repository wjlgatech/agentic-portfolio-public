// Deterministic unit test for the "deepen" inbound contract (packages/core/src/deepen-types.ts)
// — no LLM, no network, always in `npm test`. The node's job is to GROUND what super-u hands it,
// so these guard the grounding gates: reject ungrounded artifacts, drop dangling edges, drop
// "skills" with no honest limits, default forged skills to unproven, and load the Engram seed clean.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeArtifact, normalizeDeepen, upsertArtifact, artifactStats } from "../packages/core/src/deepen-types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// ── grounding gate: refuse ungrounded artifacts ─────────────────────────────────
check("reject: no source url", normalizeArtifact({ source: { title: "X" } }) === null);
check("reject: non-http source url", normalizeArtifact({ source: { title: "X", url: "ftp://x" } }) === null);
check("reject: no title", normalizeArtifact({ source: { url: "https://x.com" } }) === null);

// ── a valid artifact + the cleaning gates ───────────────────────────────────────
const a = normalizeArtifact({
  source: { title: "Engram", kind: "repo", url: "https://github.com/deepseek-ai/Engram", discoveredVia: "https://linkedin.com/x" },
  digest: "y".repeat(2000),
  graph: {
    title: "g",
    nodes: [{ id: "n1", name: "A" }, { id: "n2", name: "B" }, { name: "C from name" }],
    edges: [
      { source: "n1", target: "n2", type: "supports" },
      { source: "n1", target: "ghost", type: "dangling" }, // → dropped (target not a node)
    ],
    graphUrl: "not-a-url", // → blanked
  },
  skills: [
    { id: "s1", name: "Good skill", notGoodAt: ["a"], goodAt: ["b"] },
    { id: "s2", name: "No limits skill" }, // → dropped (no notGoodAt = marketing, not a skill)
    { name: "Verified?", notGoodAt: ["z"], verified: true },
  ],
});
check("valid artifact accepted", a !== null);
check("digest capped at 1200", a.digest.length === 1200);
check("node id derived from name when missing", a.graph.nodes.some((n) => n.name === "C from name"));
check("dangling edge dropped", a.graph.edges.length === 1);
check("non-http graphUrl blanked", a.graph.graphUrl === "");
check("skill without notGoodAt dropped (honesty gate)", a.skills.length === 2);
check("forged skill defaults to unproven", a.skills.find((s) => s.id === "s1").verified === false);
check("explicit verified:true preserved", a.skills.find((s) => s.name === "Verified?").verified === true);
check("skill kind defaults to 'skill'", a.skills[0].kind === "skill");

// ── upsert: dedup by id, newest first ───────────────────────────────────────────
const feed1 = normalizeDeepen({ artifacts: [a] });
const a2 = normalizeArtifact({ id: "engram", source: { title: "Engram v2", url: "https://github.com/deepseek-ai/Engram" }, skills: [], graph: {} });
const feed2 = upsertArtifact(feed1, a2);
check("upsert dedups by id (still 1)", feed2.artifacts.length === 1);
check("upsert puts the new one first (wins)", feed2.artifacts[0].source.title === "Engram v2");

// ── artifactStats ───────────────────────────────────────────────────────────────
const st = artifactStats(a);
check("stats: 3 nodes, 1 edge, 2 skills, 1 proven", st.nodes === 3 && st.edges === 1 && st.skills === 2 && st.proven === 1);

// ── the committed Engram SEED loads clean + stays grounded ──────────────────────
const seed = normalizeDeepen(JSON.parse(fs.readFileSync(path.join(root, "content", "deepen.json"), "utf8")));
check("seed has exactly the Engram artifact", seed.artifacts.length === 1 && seed.artifacts[0].id === "engram");
const eng = seed.artifacts[0];
check("seed graph is substantial (>=8 nodes)", eng.graph.nodes.length >= 8);
const nodeIds = new Set(eng.graph.nodes.map((n) => n.id));
check("seed has no dangling edges (all reference real nodes)", eng.graph.edges.length >= 8 && eng.graph.edges.every((e) => nodeIds.has(e.source) && nodeIds.has(e.target)));
check("seed skills are all UNPROVEN (honest until an outcome)", eng.skills.length === 2 && eng.skills.every((s) => s.verified === false));
check("seed skills all carry honest limits", eng.skills.every((s) => s.notGoodAt.length > 0));
check("seed is labelled a sample (producedBy seed-example)", eng.producedBy === "seed-example");

console.log(ok ? "✅ deepen: all pass" : "❌ deepen FAIL");
process.exit(ok ? 0 : 1);
