// ─────────────────────────────────────────────────────────────────────────────
// lib/overrides.ts — agent-editable WORDING on top of the fixed content schema.
//
// content/profile.ts stays the source-of-truth STRUCTURE (which fields exist); the
// agent can only override the TEXT of specific fields, by a whitelisted dot-path.
// Overrides live in portfolio.yaml (`overrides:` map) and are applied at render +
// in the agent's grounding. This is how "change 'Genentech' to 'Accenture'" works
// without letting the agent rewrite the schema.
// ─────────────────────────────────────────────────────────────────────────────

// The ONLY paths the agent may override (text fields, never structure).
//   profile.name | profile.tagline | profile.blurb | profile.location
//   mission | love
//   values.<i>.title | values.<i>.body
//   practices.<i>.name | practices.<i>.body
export const OVERRIDE_KEY_RE =
  /^(profile\.(name|tagline|blurb|location)|mission|love|values\.\d{1,2}\.(title|body)|practices\.\d{1,2}\.(name|body))$/;

export type EditableContent = {
  profile: { name: string; tagline: string; blurb: string; location: string; [k: string]: unknown };
  mission: string;
  love: string;
  values: { title: string; body: string }[];
  futurePractices: { n: number; name: string; body: string }[];
};

// Keep only valid keys + string values; cap size so a runaway can't bloat the YAML.
export function cleanOverrides(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 80) break;
    if (typeof v === "string" && OVERRIDE_KEY_RE.test(k)) {
      out[k] = v.slice(0, 2000);
      n++;
    }
  }
  return out;
}

// Return a deep copy of `c` with overrides applied to the whitelisted fields.
export function applyOverrides<T extends EditableContent>(c: T, ov: Record<string, string>): T {
  const out = structuredClone(c);
  for (const [path, val] of Object.entries(ov || {})) {
    const p = path.split(".");
    if (path === "profile.name") out.profile.name = val;
    else if (path === "profile.tagline") out.profile.tagline = val;
    else if (path === "profile.blurb") out.profile.blurb = val;
    else if (path === "profile.location") out.profile.location = val;
    else if (path === "mission") out.mission = val;
    else if (path === "love") out.love = val;
    else if (p[0] === "values" && out.values[+p[1]]) {
      if (p[2] === "title") out.values[+p[1]].title = val;
      else if (p[2] === "body") out.values[+p[1]].body = val;
    } else if (p[0] === "practices" && out.futurePractices[+p[1]]) {
      if (p[2] === "name") out.futurePractices[+p[1]].name = val;
      else if (p[2] === "body") out.futurePractices[+p[1]].body = val;
    }
  }
  return out;
}

// Every editable field as { path, value } given the CURRENT (override-applied) content —
// used by the find/replace ("change X to Y") edit so it can target the right field(s).
export function editableFields(applied: EditableContent): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [
    { path: "profile.name", value: applied.profile.name },
    { path: "profile.tagline", value: applied.profile.tagline },
    { path: "profile.blurb", value: applied.profile.blurb },
    { path: "profile.location", value: applied.profile.location },
    { path: "mission", value: applied.mission },
    { path: "love", value: applied.love },
  ];
  applied.values.forEach((v, i) => {
    out.push({ path: `values.${i}.title`, value: v.title });
    out.push({ path: `values.${i}.body`, value: v.body });
  });
  applied.futurePractices.forEach((p, i) => {
    out.push({ path: `practices.${i}.name`, value: p.name });
    out.push({ path: `practices.${i}.body`, value: p.body });
  });
  return out;
}
