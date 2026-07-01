// Unit tests for lib/registry-types.ts — the network's search/normalize core.
import { normalizeRegistry, searchRegistry, scoreEntry, cleanEntry, networkStats, skillIndex, peersLike } from "../packages/core/src/registry-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const raw = {
  entries: [
    { name: "Paul Wu", url: "https://a.example.com", skills: [{ id: "verify_claim", name: "Verify a claim" }], tags: ["agent-verification", "rust"], description: "Ships agent tooling." },
    { name: "Dup", url: "https://a.example.com/", skills: [], tags: [] }, // duplicate URL → dropped
    { name: "NoUrl" }, // invalid → dropped
    { name: "Ada", url: "https://b.example.com", skills: [{ id: "role_fit", name: "Assess role fit" }], tags: ["founder"], description: "Builds companies." },
  ],
};

const entries = normalizeRegistry(raw);
check("normalize drops invalid + duplicate-URL entries", entries.length === 2);
check("cleanEntry derives a handle + defaults the a2a/card urls", entries[0].handle === "paul-wu" && entries[0].a2aUrl.endsWith("/api/a2a") && entries[0].cardUrl.includes(".well-known"));
check("cleanEntry rejects a urlless entry", cleanEntry({ name: "x" }) === null);

// search ranks tag/skill matches above description-only, and filters non-matches
const r1 = searchRegistry(entries, "rust");
check("search finds the rust node", r1.length === 1 && r1[0].name === "Paul Wu");
const r2 = searchRegistry(entries, "agent verification");
check("multi-term search matches tag+skill", r2[0].name === "Paul Wu");
check("scoreEntry tag-match outweighs desc-match", scoreEntry(entries[0], "rust") > scoreEntry(entries[0], "ships"));
check("empty query returns everything", searchRegistry(entries, "").length === 2);
check("no-match query returns nothing", searchRegistry(entries, "zzzqqq").length === 0);


// ── 10X network helpers: growth stats, skill marketplace, peer reciprocity ──
const net = normalizeRegistry([
  { name: "A", url: "https://a.com", skills: [{ id: "verify", name: "Verify claims" }, { id: "rust", name: "Rust" }], tags: ["rust"] },
  { name: "B", url: "https://b.com", skills: [{ id: "verify", name: "Verify claims" }], tags: ["founder"] },
  { name: "C", url: "https://c.com", skills: [{ id: "rust", name: "Rust" }], tags: ["rust"] },
]);
const st = networkStats(net);
check("networkStats counts nodes", st.nodes === 3);
check("networkStats counts UNIQUE skills", st.skills === 2); // Verify claims + Rust
check("networkStats connections = n(n-1)/2 (Metcalfe)", st.connections === 3);
const idx = skillIndex(net);
check("skillIndex groups by skill (each with its nodes)", idx.find((x) => x.skill === "Verify claims").nodes.length === 2 && idx.find((x) => x.skill === "Rust").nodes.length === 2);
check("skillIndex sorts by node-count desc", idx[0].nodes.length >= idx[idx.length - 1].nodes.length);
check("skillIndex lists all skills", idx.length === 2);
const peers = peersLike(net[0], net); // A shares 'verify' with B, 'rust' with C
check("peersLike finds nodes with shared skills/tags", peers.length === 2);
check("peersLike excludes the node itself", !peers.some((p) => p.url === net[0].url));

console.log(ok ? "✅ registry: all pass" : "❌ registry FAIL");
process.exit(ok ? 0 : 1);
