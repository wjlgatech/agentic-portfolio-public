// Unit tests for lib/overrides.ts — the agent-editable wording layer.
// Node 22 strips TS types, so we can import the .ts module directly.
import { cleanOverrides, applyOverrides, editableFields, OVERRIDE_KEY_RE } from "../lib/overrides.ts";

const content = {
  profile: { name: "Paul", tagline: "Lead", blurb: "By day I lead AI/ML/DS at Genentech.", location: "SF", handle: "wjlgatech", links: {} },
  mission: "Make flourishing compound.",
  love: "Family first.",
  values: [{ title: "Build in the open", body: "Default to transparency." }],
  futurePractices: [{ n: 1, name: "Pick 12X", body: "Aim high." }],
};

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// cleanOverrides: keep whitelisted string keys, drop the rest
const cleaned = cleanOverrides({ "profile.blurb": "x", "bad.key": "y", mission: 123, "values.0.body": "z" });
check("cleanOverrides keeps whitelisted keys", cleaned["profile.blurb"] === "x" && cleaned["values.0.body"] === "z");
check("cleanOverrides drops unknown key", !("bad.key" in cleaned));
check("cleanOverrides drops non-string value", !("mission" in cleaned));
check("OVERRIDE_KEY_RE rejects schema-y paths", !OVERRIDE_KEY_RE.test("profile.links.github") && OVERRIDE_KEY_RE.test("practices.11.body"));

// applyOverrides: Genentech → Accenture in the blurb, structure intact
const applied = applyOverrides(content, { "profile.blurb": "By day I lead AI/ML/DS at Accenture." });
check("applyOverrides changes the blurb", applied.profile.blurb.includes("Accenture"));
check("applyOverrides preserves untouched fields", applied.profile.handle === "wjlgatech" && applied.mission === content.mission);
check("applyOverrides does not mutate the input", content.profile.blurb.includes("Genentech"));

// editableFields: enumerates the paths a find/replace can target
const fields = editableFields(content).map((f) => f.path);
check("editableFields lists blurb/mission/value/practice paths",
  ["profile.blurb", "mission", "values.0.body", "practices.0.body"].every((p) => fields.includes(p)));

console.log(ok ? "✅ overrides: all pass" : "❌ overrides FAIL");
process.exit(ok ? 0 : 1);
