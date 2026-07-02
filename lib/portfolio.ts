// ─────────────────────────────────────────────────────────────────────────────
// lib/portfolio.ts — read/write the conversational control surface (portfolio.yaml).
//
// This is the SERVER half of the agent-editable layout. The page reads the YAML
// to render sections in order; the /api/portfolio route writes it back when the
// on-page agent (or a human) changes the layout. On a read-only filesystem (e.g.
// serverless production), writePortfolio() returns false and the client keeps the
// change in localStorage instead — see components/Portfolio.tsx.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { cleanOverrides } from "@/lib/overrides";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { SOURCE_CATALOG, type WritingSource, type WritingSourceKind } from "@core/writing-sources";

const KV_KEY = "portfolio:config";

export type Article = {
  title: string;
  url: string;
  date: string; // YYYY-MM
  category: string;
  summary: string;
};

// A card inside a custom (agent-created) section.
export type SectionItem = {
  title: string;
  body: string;
  tag?: string; // optional small label (e.g. "skill", "plugin", "workflow")
  url?: string; // optional link
};

export type SectionMeta = {
  id: string;
  title: string;
  eyebrow?: string;
  visible: boolean;
  custom?: boolean; // true for agent-created sections (id starts with "custom-")
  items?: SectionItem[]; // the cards, for custom sections
};

export type PortfolioConfig = {
  theme: string;
  sections: SectionMeta[];
  articles: Article[];
  writingSources: WritingSource[]; // the Writing sync registry (LinkedIn/Substack/Medium/RSS/X)
  overrides: Record<string, string>; // agent-edited wording (see lib/overrides.ts)
};

export const PORTFOLIO_PATH = path.join(process.cwd(), "content", "portfolio.yaml");

// The valid brand themes (must match StyleSwitcher + themes.css).
export const THEMES = [
  "anthropic", "openai", "google", "apple", "vercel",
  "stripe", "swiss", "brutalist", "notion",
] as const;

// The section ids the page knows how to render, with their default labels. YAML
// controls order/visibility/labels; unknown ids are dropped, and any known id
// missing from the YAML is appended (visible) so a new code section never vanishes.
export const SECTION_DEFAULTS: Record<string, { title: string; eyebrow: string }> = {
  practices: { title: "12X Future Practices", eyebrow: "Compounding everything" },
  projects: { title: "Projects", eyebrow: "Built in the open (last 12 months)" },
  writing: { title: "Writing", eyebrow: "Long-form on LinkedIn" },
  receipts: { title: "Resume Verification", eyebrow: "Proof, not claims — a résumé audited against real artifacts, then closed into a verified one" },
  "job-fit": { title: "Role Fit", eyebrow: "Score any job against past experience · current skillset · future mission/values/vision — held to a golden-set accuracy" },
  "deep-dives": { title: "Deep Dives", eyebrow: "Seminal sources distilled into a knowledge map + skills — by super-u's flywheel, grounded and presented here" },
  compass: { title: "Next Projects", eyebrow: "Four growth vectors — deepen · widen · lengthen · heighten — plus who to reach. Drafted for approval." },
  values: { title: "Values & Love", eyebrow: "The why under the work" },
};

export const SECTION_IDS = Object.keys(SECTION_DEFAULTS);

// Seed the Writing sync registry with LinkedIn (login-walled → browser-harvest). Substack/Medium/RSS
// are added by the owner or the agent (a forker sets their own via `addWritingSource`).
const DEFAULT_WRITING_SOURCES: WritingSource[] = [{ kind: "linkedin", ref: "in/me", label: "LinkedIn" }];

const DEFAULT_CONFIG: PortfolioConfig = {
  theme: "anthropic",
  sections: SECTION_IDS.map((id) => ({
    id,
    title: SECTION_DEFAULTS[id].title,
    eyebrow: SECTION_DEFAULTS[id].eyebrow,
    visible: true,
  })),
  articles: [],
  writingSources: DEFAULT_WRITING_SOURCES,
  overrides: {},
};

const cleanStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function cleanSource(s: unknown): WritingSource | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const kind = cleanStr(o.kind) as WritingSourceKind;
  const ref = cleanStr(o.ref).slice(0, 200);
  if (!SOURCE_CATALOG[kind] || !ref) return null;
  return { kind, ref, label: cleanStr(o.label).slice(0, 60) || SOURCE_CATALOG[kind].label };
}

function cleanArticle(a: unknown): Article | null {
  if (!a || typeof a !== "object") return null;
  const o = a as Record<string, unknown>;
  const title = cleanStr(o.title);
  const url = cleanStr(o.url);
  if (!title || !url) return null; // an article without a title or link is unusable
  return {
    title,
    url,
    date: cleanStr(o.date) || "",
    category: cleanStr(o.category) || "Uncategorized",
    summary: cleanStr(o.summary) || "",
  };
}

// A card in a custom section. Needs at least a title or body to be worth showing;
// url is kept only if it's http(s) so the model can't inject a javascript: link.
function cleanItem(x: unknown): SectionItem | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const title = cleanStr(o.title).slice(0, 140);
  const body = cleanStr(o.body).slice(0, 600);
  if (!title && !body) return null;
  const url = cleanStr(o.url);
  const tag = cleanStr(o.tag).slice(0, 24);
  return {
    title: title || "(untitled)",
    body,
    ...(tag ? { tag } : {}),
    ...(/^https?:\/\//i.test(url) ? { url } : {}),
  };
}

// Coerce arbitrary input (parsed YAML, or a POST body) into a valid config:
// only known sections, in the given order, with all known sections present.
export function normalize(raw: unknown): PortfolioConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const theme = THEMES.includes(o.theme as (typeof THEMES)[number])
    ? (o.theme as string)
    : "anthropic";

  const incoming = Array.isArray(o.sections) ? o.sections : [];
  const seen = new Set<string>();
  const sections: SectionMeta[] = [];
  for (const s of incoming) {
    if (!s || typeof s !== "object") continue;
    const sm = s as Record<string, unknown>;
    const id = String(sm.id ?? "");
    if (seen.has(id)) continue;
    if (SECTION_DEFAULTS[id]) {
      // A known, code-rendered section.
      seen.add(id);
      sections.push({
        id,
        title: typeof sm.title === "string" && sm.title.trim() ? sm.title.trim() : SECTION_DEFAULTS[id].title,
        eyebrow: typeof sm.eyebrow === "string" ? sm.eyebrow : SECTION_DEFAULTS[id].eyebrow,
        visible: sm.visible !== false,
      });
    } else if (/^custom-[a-z0-9-]{1,60}$/.test(id)) {
      // An agent-created custom section: it carries its own items (cards).
      seen.add(id);
      const items = (Array.isArray(sm.items) ? sm.items : [])
        .map(cleanItem)
        .filter((it): it is SectionItem => it !== null)
        .slice(0, 24);
      sections.push({
        id,
        title: cleanStr(sm.title) || "New section",
        eyebrow: typeof sm.eyebrow === "string" ? sm.eyebrow : undefined,
        visible: sm.visible !== false,
        custom: true,
        items,
      });
    }
    // else: drop unknown ids
  }
  // Append any known section the YAML omitted, so new code sections still show.
  for (const id of SECTION_IDS) {
    if (!seen.has(id)) {
      sections.push({ id, title: SECTION_DEFAULTS[id].title, eyebrow: SECTION_DEFAULTS[id].eyebrow, visible: true });
    }
  }

  const articles = (Array.isArray(o.articles) ? o.articles : [])
    .map(cleanArticle)
    .filter((a): a is Article => a !== null);

  // Writing sync registry: dedupe by kind+ref; default to LinkedIn when unset (never empty).
  const seenSrc = new Set<string>();
  const rawSources = (Array.isArray(o.writingSources) ? o.writingSources : [])
    .map(cleanSource)
    .filter((s): s is WritingSource => s !== null)
    .filter((s) => { const k = `${s.kind}:${s.ref.toLowerCase()}`; if (seenSrc.has(k)) return false; seenSrc.add(k); return true; })
    .slice(0, 24);
  const writingSources = rawSources.length ? rawSources : DEFAULT_WRITING_SOURCES;

  return { theme, sections, articles, writingSources, overrides: cleanOverrides(o.overrides) };
}

export function readPortfolio(): PortfolioConfig {
  try {
    const txt = fs.readFileSync(PORTFOLIO_PATH, "utf8");
    return normalize(parseYaml(txt) ?? {});
  } catch {
    return DEFAULT_CONFIG; // missing/broken file — fall back to code defaults
  }
}

// The LIVE config: KV (durable owner edits, shared across instances) over the committed
// YAML seed. Falls back to the YAML when KV isn't configured.
export async function readPortfolioAsync(): Promise<PortfolioConfig> {
  const kv = await kvGetJSON<unknown>(KV_KEY);
  return kv ? normalize(kv) : readPortfolio();
}

// Durable write: KV when configured (survives rebuilds, shared), else dev fs write.
export async function writePortfolioDurable(cfg: PortfolioConfig): Promise<{ persisted: boolean; durable: boolean }> {
  const normalized = normalize(cfg);
  if (kvConfigured()) {
    const ok = await kvSetJSON(KV_KEY, normalized);
    return { persisted: ok, durable: ok };
  }
  return { persisted: writePortfolio(normalized), durable: false };
}

// Returns true if persisted to disk. On a read-only fs (serverless) it returns
// false — not an error, just the signal that the client should keep the change
// in localStorage and the user should commit the YAML locally to ship it.
export function writePortfolio(cfg: PortfolioConfig): boolean {
  try {
    const yaml = stringifyYaml(normalize(cfg), { lineWidth: 0 });
    const banner =
      "# This file is edited by the on-page agent (and by hand). It controls the\n" +
      "# section order, visibility, labels, theme, and articles of the portfolio.\n" +
      "# See lib/portfolio.ts for the schema.\n\n";
    fs.writeFileSync(PORTFOLIO_PATH, banner + yaml, "utf8");
    return true;
  } catch {
    return false;
  }
}
