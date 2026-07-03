// ─────────────────────────────────────────────────────────────────────────────
// feedback-types.ts — the feedback→feature loop's pure core (fs/network-free → client-importable
// + plain-Node testable). Non-technical users tell the copilot a suggestion or a complaint; it
// lands here as a normalized FeedbackItem (durable KV). A scheduled digest clusters the batch into
// themes + drafted feature proposals — the LLM groups and drafts, but every COUNT is recomputed in
// code from the real items (same honesty rule as verification/jobfit/standing), examples are the
// contributors' REAL words (never model-rewritten), and each cluster carries a deterministic
// build directive as the human-approved handoff. Contact is optional and single-purpose:
// the ship notice when that theme lands.
// ─────────────────────────────────────────────────────────────────────────────

export const FEEDBACK_KINDS = ["suggestion", "complaint"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export type FeedbackItem = {
  id: string; // deterministic content hash → dedupe (same words twice = one item)
  kind: FeedbackKind;
  text: string; // the user's words, verbatim (capped)
  page?: string; // where they were ("/", "/p/jane", "/make")
  slug?: string; // hosted-portfolio slug, if they were on one
  contact?: string; // optional email — ONLY for the ship notice, never marketing
  at: string; // ISO timestamp
};

export type FeedbackCluster = {
  theme: string;
  kind: FeedbackKind | "mixed";
  itemIds: string[]; // only ids that exist in the batch survive normalization
  count: number; // recomputed = itemIds.length, never trusted from the model
  suggestions: number; // recomputed from the real items
  complaints: number; // recomputed from the real items
  examples: string[]; // REAL item texts (≤3, capped) — contributors' words, not the model's
  proposal: string; // the drafted feature (model-authored, human-approved before build)
  buildCmd: string; // deterministic build directive, computed in code
};

export type FeedbackDigest = {
  generatedAt: string;
  windowDays: number;
  total: number; // items in the analyzed batch (computed)
  clusters: FeedbackCluster[]; // sorted by count desc, capped
  model?: string; // which provider/model clustered (honesty: provenance)
  note?: string;
};

export const MAX_FEEDBACK_ITEMS = 2000;
export const MAX_CLUSTERS = 8;
export const MAX_EXAMPLES = 3;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// djb2 → hex. Not cryptographic — it only needs to be deterministic for dedupe.
export function feedbackHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

const str = (v: unknown, cap: number) => (typeof v === "string" ? v.trim().slice(0, cap) : "");

function coerceKind(v: unknown): FeedbackKind {
  const s = String(v ?? "").toLowerCase();
  return s.startsWith("complain") || s === "bug" || s === "issue" || s === "problem" ? "complaint" : "suggestion";
}

/** Validate + cap a raw submission. Returns null when there's no usable text. */
export function normalizeFeedbackItem(raw: unknown, nowIso: string): FeedbackItem | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const text = str(o.text, 1000);
  if (text.length < 8) return null; // too thin to act on
  const kind = coerceKind(o.kind);
  const contact = str(o.contact, 160);
  const slug = str(o.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const item: FeedbackItem = {
    id: feedbackHash(`${kind}|${text.toLowerCase()}`),
    kind,
    text,
    at: nowIso,
  };
  const page = str(o.page, 200);
  if (page) item.page = page;
  if (slug) item.slug = slug;
  if (EMAIL_RE.test(contact)) item.contact = contact;
  return item;
}

/** Prepend, dedupe by id (fresh submission wins so a re-send can add a contact), cap. */
export function upsertFeedback(existing: FeedbackItem[], item: FeedbackItem): FeedbackItem[] {
  return [item, ...existing.filter((f) => f.id !== item.id)].slice(0, MAX_FEEDBACK_ITEMS);
}

export function itemsInWindow(items: FeedbackItem[], nowMs: number, windowDays: number): FeedbackItem[] {
  const cutoff = nowMs - windowDays * 86_400_000;
  return items.filter((f) => {
    const t = Date.parse(f.at);
    return Number.isFinite(t) && t >= cutoff;
  });
}

/** The deterministic build directive — a human reads/approves it, then builds it with whatever
 * agent or workflow they use; nothing auto-merges. Tool-agnostic on purpose. */
export function buildCommandFor(proposal: string): string {
  const oneLine = proposal.replace(/\s+/g, " ").trim().slice(0, 300);
  return `Build: ${oneLine}`;
}

/**
 * Ground the model's clustering: keep only real item ids, recompute every count from the
 * actual items, take examples from the contributors' real words, drop empty clusters.
 */
export function normalizeDigest(
  raw: unknown,
  items: FeedbackItem[],
  nowIso: string,
  windowDays: number,
  model?: string,
): FeedbackDigest {
  const o = (raw ?? {}) as Record<string, unknown>;
  const byId = new Map(items.map((f) => [f.id, f]));
  const rawClusters = Array.isArray(o.clusters) ? o.clusters : [];

  const clusters: FeedbackCluster[] = [];
  for (const c of rawClusters) {
    const co = (c ?? {}) as Record<string, unknown>;
    const theme = str(co.theme, 120);
    const ids = Array.isArray(co.itemIds) ? co.itemIds.map((v) => String(v)) : [];
    const seen = new Set<string>();
    const itemIds = ids.filter((id) => byId.has(id) && !seen.has(id) && (seen.add(id), true));
    if (!theme || itemIds.length === 0) continue; // ungrounded cluster → dropped
    const members = itemIds.map((id) => byId.get(id) as FeedbackItem);
    const suggestions = members.filter((m) => m.kind === "suggestion").length;
    const complaints = members.length - suggestions;
    const proposal = str(co.proposal, 500) || theme;
    clusters.push({
      theme,
      kind: suggestions === 0 ? "complaint" : complaints === 0 ? "suggestion" : "mixed",
      itemIds,
      count: itemIds.length,
      suggestions,
      complaints,
      examples: members.slice(0, MAX_EXAMPLES).map((m) => m.text.slice(0, 200)),
      proposal,
      buildCmd: buildCommandFor(proposal),
    });
  }
  clusters.sort((a, b) => b.count - a.count);

  const digest: FeedbackDigest = {
    generatedAt: nowIso,
    windowDays,
    total: items.length,
    clusters: clusters.slice(0, MAX_CLUSTERS),
  };
  if (model) digest.model = model;
  const note = str(o.note, 300);
  if (note) digest.note = note;
  return digest;
}

export type Contributor = { email: string; themes: string[] };

/** Who to notify when the named themes ship: contributors who left a contact, deduped by email. */
export function contributorsFor(digest: FeedbackDigest, items: FeedbackItem[], themes: string[]): Contributor[] {
  const wanted = new Set(themes.map((t) => t.trim().toLowerCase()).filter(Boolean));
  const byId = new Map(items.map((f) => [f.id, f]));
  const byEmail = new Map<string, Contributor>();
  for (const cluster of digest.clusters) {
    if (!wanted.has(cluster.theme.trim().toLowerCase())) continue;
    for (const id of cluster.itemIds) {
      const contact = byId.get(id)?.contact;
      if (!contact) continue;
      const key = contact.toLowerCase();
      const entry = byEmail.get(key) ?? { email: contact, themes: [] };
      if (!entry.themes.includes(cluster.theme)) entry.themes.push(cluster.theme);
      byEmail.set(key, entry);
    }
  }
  return [...byEmail.values()];
}
