// ─────────────────────────────────────────────────────────────────────────────
// make-grounding.ts — turn EVERYTHING the Maker can honestly pull into one grounding corpus,
// and report per-source what happened (pure, fs/network-free → testable).
//
// The problem this solves: a maker who gives only login-walled links (LinkedIn/X/Instagram)
// used to get a near-empty page — /api/make grounded on the résumé text alone and never touched
// the genuinely-public sources (YouTube RSS, GitHub API, a personal website) until a later sync.
// Now the corpus is assembled from every source that CAN be read at make time, ordered by trust
// (the maker's own words first), each part labeled and budget-capped so one source can't crowd
// out the rest and the total stays inside free-tier TPM.
//
// Honesty is encoded here, not vibes: `makeSourceReport()` returns, for every link the maker
// gave, exactly what we did with it — `pulled` (with item counts), `blocked` (reachable in
// principle, refused in practice — e.g. LinkedIn 999s datacenter IPs), or `walled` (login-walled
// by design: X / Instagram / Facebook — NEVER fetched, kept as links, with the paste-to-include
// escape hatch spelled out). The UI renders this verbatim so the maker knows why a page is thin
// and how to enrich it. We never claim a pull a wall forbids (see sync-types sourceFeasibility).
// ─────────────────────────────────────────────────────────────────────────────
import type { SyncItem } from "./sync-types.ts";

export type GroundingInput = {
  resume?: string;    // the maker's own pasted words (highest trust)
  linkedin?: string;  // public SEO metadata rendered as résumé text (best-effort)
  website?: string;   // their own site's readable text (title + body)
  feed?: SyncItem[];  // synced public items (GitHub repos, YouTube videos)
};

// Per-part caps: the maker's own words dominate; each public source adds, never crowds out.
const PART_CAPS: Record<keyof GroundingInput, number> = { resume: 6000, linkedin: 2000, website: 3000, feed: 1800 };

// Render synced items as plain lines the LLM can ground on ("[YouTube] title — summary").
export function feedToText(items: SyncItem[]): string {
  return (items ?? [])
    .filter((i) => i && i.title)
    .map((i) => `[${i.category ?? i.source}] ${i.title}${i.summary ? ` — ${i.summary}` : ""}`)
    .join("\n");
}

// Assemble the labeled corpus. `used` lists which parts actually contributed (for the honest
// `source` field in the response). Deterministic: fixed order, fixed caps, hard total budget.
export function buildGroundingCorpus(input: GroundingInput, budget = 9000): { corpus: string; used: string[] } {
  const parts: { kind: keyof GroundingInput; label: string; text: string }[] = [
    { kind: "resume", label: "THE MAKER'S OWN WORDS", text: (input.resume ?? "").trim() },
    { kind: "linkedin", label: "PUBLIC LINKEDIN PROFILE (SEO metadata)", text: (input.linkedin ?? "").trim() },
    { kind: "website", label: "THEIR WEBSITE (public text)", text: (input.website ?? "").trim() },
    { kind: "feed", label: "RECENT PUBLIC WORK (repos / videos)", text: feedToText(input.feed ?? []) },
  ];
  const used: string[] = [];
  const blocks: string[] = [];
  for (const p of parts) {
    if (!p.text) continue;
    used.push(p.kind);
    blocks.push(`== ${p.label} ==\n${p.text.slice(0, PART_CAPS[p.kind])}`);
  }
  return { corpus: blocks.join("\n\n").slice(0, budget), used };
}

export type SourceStatus = "pulled" | "blocked" | "walled" | "empty";
export type SourceReport = { source: string; status: SourceStatus; items?: number; note: string };

// One report line per source the maker GAVE (never invent rows for links they didn't give).
export function makeSourceReport(x: {
  resumeChars: number;
  links: Record<string, string>;          // the sanitized links map (linkedin/x/facebook/instagram/github/youtube/website)
  linkedinPulled: boolean;                // fetchLinkedInPublic succeeded
  websitePulled: boolean;                 // fetchSourceText succeeded
  counts: Record<string, number>;         // per-source synced item counts (github/youtube)
}): SourceReport[] {
  const out: SourceReport[] = [];
  if (x.resumeChars >= 40) out.push({ source: "about", status: "pulled", note: "Your own words ground the page — the richest source." });
  if (x.links.linkedin) {
    out.push(
      x.linkedinPulled
        ? { source: "linkedin", status: "pulled", note: "Read your PUBLIC profile metadata (no login, best-effort)." }
        : { source: "linkedin", status: "blocked", note: "LinkedIn blocks reads from hosting servers. Your link stays on the page — paste a few lines in the About box and re-make to enrich it." },
    );
  }
  if (x.links.website) {
    out.push(
      x.websitePulled
        ? { source: "website", status: "pulled", note: "Read your site's public text." }
        : { source: "website", status: "blocked", note: "Couldn't read your site (login-walled or JS-only?). It stays as a link." },
    );
  }
  if (x.links.github) {
    const n = x.counts.github ?? 0;
    out.push(n > 0
      ? { source: "github", status: "pulled", items: n, note: `Pulled ${n} recent public repo${n === 1 ? "" : "s"}.` }
      : { source: "github", status: "empty", note: "No public repos found on that profile." });
  }
  if (x.links.youtube) {
    const n = x.counts.youtube ?? 0;
    out.push(n > 0
      ? { source: "youtube", status: "pulled", items: n, note: `Pulled ${n} recent video${n === 1 ? "" : "s"} from the public RSS feed.` }
      : { source: "youtube", status: "empty", note: "Couldn't read that channel's public feed — use your channel URL (youtube.com/@handle or /channel/UC…)." });
  }
  // Login-walled by design — never fetched, said plainly, with the escape hatch.
  for (const [key, label] of [["x", "X / Twitter"], ["instagram", "Instagram"], ["facebook", "Facebook"]] as const) {
    if (x.links[key]) out.push({ source: key, status: "walled", note: `${label} is login-walled — no server can read it, so it stays as a link. Paste your best posts/highlights into the About box to include them.` });
  }
  return out;
}
