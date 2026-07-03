// The /make category seam (@core/make-category) + the 5 seed demo packs: every category yields
// a coherent spec, every vertical resolution is safe, and every seed pack snaps onto the real
// InstanceConfig contract with the honesty markers demos require.
import { MAKE_CATEGORIES, toCategory, categorySpec, resolveVertical } from "../packages/core/src/make-category.ts";
import { validateInstance, VERTICALS } from "../packages/core/src/instance-types.ts";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };

// ── category specs ───────────────────────────────────────────────────────────
check("three categories exist", MAKE_CATEGORIES.length === 3);
for (const c of MAKE_CATEGORIES) {
  const s = categorySpec(c);
  check(`${c}: default vertical is real + allowed`, VERTICALS.includes(s.defaultVertical) && s.verticals.includes(s.defaultVertical));
  check(`${c}: every allowed vertical is real`, s.verticals.every((v) => VERTICALS.includes(v)));
  check(`${c}: has gen prompt + proof nouns + sections + intake`, s.genSystem.includes("STRICT JSON") && s.proof.label.length > 0 && s.sections.length >= 3 && s.intake.aboutLabel.length > 0 && s.intake.groundingError.length > 10);
  check(`${c}: sections carry unique ids`, new Set(s.sections.map((x) => x.id)).size === s.sections.length);
}
check("unknown category coerces to individual (the original /make behavior)", toCategory("???") === "individual" && toCategory(undefined) === "individual");
check("resolveVertical honors an allowed explicit pick", resolveVertical("business", "clinic") === "clinic");
check("resolveVertical rejects a cross-category pick (falls back to default)", resolveVertical("community", "clinic") === "ministry");
check("resolveVertical rejects a fake vertical", resolveVertical("business", "spaceship") === "services");
check("resolveVertical defaults per category", resolveVertical("individual") === "personal" && resolveVertical("business") === "services" && resolveVertical("community") === "ministry");

// ── seed demo packs ──────────────────────────────────────────────────────────
const { SEED_PACKS } = await import("../content/instances/seeds.ts");
const slugs = Object.keys(SEED_PACKS);
check("five seed packs ship", slugs.length === 5);
check("all seed slugs are demo-prefixed (never collide with real makers)", slugs.every((s) => s.startsWith("demo-")));
for (const [slug, pack] of Object.entries(SEED_PACKS)) {
  const r = validateInstance(pack);
  check(`${slug}: snaps onto the contract`, r.ok === true);
  check(`${slug}: is honestly labelled a fictional demo`, /fictional demo/i.test(pack.entity.blurb));
  check(`${slug}: every outcome stays unverified (demos never claim audited facts)`, (pack.content?.outcomes ?? []).every((o) => o.verdict === "unverified"));
  check(`${slug}: stays OUT of the real registry`, pack.network.discoverable === false);
  check(`${slug}: has offerings + ≥1 agent skill`, (pack.content?.offerings.length ?? 0) >= 2 && pack.agent.skills.length >= 1);
}
check("packs cover the promised categories", ["clinic", "services", "ministry", "fitness", "personal"].every((v) => Object.values(SEED_PACKS).some((p) => p.vertical === v)));
check("packs show off distinct themes (the token seam)", new Set(Object.values(SEED_PACKS).map((p) => p.theme)).size === 5);

console.log(ok ? "✅ make-category: all pass" : "❌ make-category: FAIL");
process.exit(ok ? 0 : 1);
