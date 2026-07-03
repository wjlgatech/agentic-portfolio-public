// The Opportunity Scout's pure core (@core/opportunity-types): query derivation is grounded,
// parsers survive hostile JSON, dedupe/caps hold, the owner's status marks stick, and the
// feasibility report never claims a login-walled source is server-readable.
import {
  oppId, buildQueries, normalizeHit, parseHnHits, parseRedditHits,
  upsertOpportunities, markOpportunity, oppSourceFeasibility, MAX_OPPORTUNITIES,
} from "../packages/core/src/opportunity-types.ts";
import { SEED_PACKS } from "../content/instances/seeds.ts";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };
const NOW = "2026-07-03T00:00:00.000Z";

// ── queries are grounded in the pack ─────────────────────────────────────────
const roofer = SEED_PACKS["demo-roofer"];
const qs = buildQueries(roofer, ["hail damage roof", "HAIL   damage ROOF"]);
check("queries include the owner's explicit keywords (deduped, normalized)", qs.filter((q) => q === "hail damage roof").length === 1);
check("queries derive from real offerings", qs.some((q) => q.includes("emergency leak tarp")));
check("queries are capped at 5", qs.length <= 5);

// ── parsers (pure, hostile-input safe) ───────────────────────────────────────
const hn = parseHnHits({ hits: [
  { objectID: "123", title: "Storm damage — what do I ask a roofer?", story_text: "Hail last night…" },
  { objectID: "", title: "no id → dropped" },
  null,
]});
check("HN parser → discussion url + title, drops junk", hn.length === 1 && hn[0].url === "https://news.ycombinator.com/item?id=123");
const rd = parseRedditHits({ data: { children: [
  { data: { permalink: "/r/HomeImprovement/comments/x/roof/", title: "Roof after hail", selftext: "…" } },
  { data: { permalink: "not-a-path", title: "dropped" } },
]}});
check("Reddit parser → permalink url, drops junk", rd.length === 1 && rd[0].url.startsWith("https://www.reddit.com/r/"));
check("parsers survive garbage", parseHnHits(null).length === 0 && parseRedditHits("x").length === 0);

// ── normalize + dedupe + cap ─────────────────────────────────────────────────
const hit = normalizeHit(hn[0], "hn", "roof storm", NOW);
check("normalizeHit keeps valid hits, ids are deterministic by url", hit !== null && hit.id === oppId(hn[0].url));
check("normalizeHit rejects url-less hits", normalizeHit({ title: "x", url: "not-a-url" }, "hn", "q", NOW) === null);
const a = { ...hit, draft: "d", status: "drafted" };
const merged = upsertOpportunities([{ ...a, status: "sent" }], [a]);
check("upsert: an existing id keeps the OWNER's status (never overwritten)", merged.length === 1 && merged[0].status === "sent");
const many = upsertOpportunities([], Array.from({ length: 300 }, (_, i) => ({ ...a, id: `id${i}`, url: `https://x.com/${i}` })));
check(`queue capped at ${MAX_OPPORTUNITIES}`, many.length === MAX_OPPORTUNITIES);

// ── the owner's mark closes the loop ─────────────────────────────────────────
const m1 = markOpportunity([a], a.id, "sent");
check("mark drafted → sent", m1.changed && m1.list[0].status === "sent");
check("unknown status refused", markOpportunity([a], a.id, "auto-posted").changed === false);
check("unknown id is a no-op", markOpportunity([a], "nope", "sent").changed === false);

// ── honesty: the walls stay walls ────────────────────────────────────────────
const feas = oppSourceFeasibility();
check("HN is the only source claimed server-readable", feas.hn.serverReadable === true &&
  ["reddit", "facebook", "skool", "linkedin", "x"].every((s) => feas[s].serverReadable === false));

console.log(ok ? "✅ opportunities: all pass" : "❌ opportunities: FAIL");
process.exit(ok ? 0 : 1);
