// Unit tests for the viral attribution tree — K is measured, not claimed.
import { growthStats, referrerView } from "../packages/core/src/referrals-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// A doubling tree: a→b, a→c (both live); b→d, b→e (live); c→f, c→g (live). K should be ~2.
const doubling = [
  { from: "a", to: "b", live: true }, { from: "a", to: "c", live: true },
  { from: "b", to: "d", live: true }, { from: "b", to: "e", live: true },
  { from: "c", to: "f", live: true }, { from: "c", to: "g", live: true },
];
const g = growthStats(doubling);
check("counts every distinct participant", g.nodes === 7);
check("counts referred + live nodes", g.referred === 6 && g.live === 6);
check("K = live invites / active referrers = 2", g.k === 2);
check("K>=1 is flagged self-propelling (the 1→2→4→8 doubling)", g.selfPropelling === true);
check("depth of the tree is 2 generations (a→b→d)", g.depthReached === 2);
check("top referrer is surfaced with a live count", g.topReferrers[0].live === 2);

// Only LIVE invites count toward K — sending an invite that never ships earns nothing (honest).
const mostlyDead = [
  { from: "a", to: "b", live: true },
  { from: "a", to: "c", live: false }, { from: "a", to: "d", live: false },
];
const gd = growthStats(mostlyDead);
check("dead (never-shipped) invites don't inflate K", gd.k === 1 && gd.live === 1);
check("...but they still count as 'referred' attempts", gd.referred === 3);
check("sub-viral K<1 is NOT self-propelling", growthStats([{ from: "a", to: "b", live: false }]).selfPropelling === false);

// A referrer's own scoreboard (the motivating loop) — invited vs actually shipped.
const view = referrerView(doubling, "a");
check("referrer view shows invited + live", view.invited === 2 && view.live === 2);
check("a referrer with no invites has an empty view", referrerView(doubling, "zz").invited === 0);

// Robustness: self-edges and dupes don't corrupt the graph.
const messy = growthStats([{ from: "a", to: "a", live: true }, { from: "a", to: "b", live: true }, { from: "a", to: "b", live: true }]);
check("self-edges ignored + duplicate edges deduped", messy.k === 1 && messy.live === 1);
check("empty graph is well-defined (K=0, not self-propelling)", growthStats([]).k === 0 && growthStats([]).nodes === 0);

console.log(ok ? "✅ referrals: all pass" : "❌ referrals: FAIL");
process.exit(ok ? 0 : 1);
