// ─────────────────────────────────────────────────────────────────────────────
// lib/verification-types.ts — the PURE core of the self-proof model: types,
// verdict taxonomy, and the deterministic aggregate. NO node:fs here, so client
// components (components/Receipts.tsx) can import VERDICT_META etc. safely.
// The fs read/write layer lives in lib/verification.ts (which re-exports this).
//
// Discipline reused from github.com/wjlgatech/career-os — see lib/verification.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type Verdict = "corroborated" | "partial" | "unverified" | "contradicted";

export const VERDICTS: Verdict[] = ["corroborated", "partial", "unverified", "contradicted"];

export const VERDICT_META: Record<Verdict, { label: string; icon: string; weight: number }> = {
  // weight = contribution to the corroboration index (0..1).
  corroborated: { label: "Corroborated", icon: "✅", weight: 1 },
  partial: { label: "Partially corroborated", icon: "🟡", weight: 0.5 },
  unverified: { label: "Unverified — needs external source", icon: "⚪", weight: 0 },
  contradicted: { label: "Contradicted", icon: "❌", weight: 0 },
};

export const CLAIM_CATEGORIES = ["summary", "experience", "project", "skill", "education", "other"] as const;
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];

export type EvidenceRef = {
  type: "repo" | "article" | "profile" | "external-needed";
  ref: string; // repo name / article title / "profile" / "—"
  url?: string;
  detail: string; // the concrete signal — a mechanism + metric/status, not a vibe
};

export type ClaimVerdict = {
  claim: string;
  category: ClaimCategory;
  verdict: Verdict;
  confidence: number; // 0..1
  inferred: boolean; // reasoned but not directly proven (career-os [inferred] tag)
  evidence: EvidenceRef[];
  context: string;
  gapCloser: string;
};

export type CategoryScore = {
  category: ClaimCategory;
  score: number; // 0..100
  corroborated: number;
  total: number;
};

export type VerificationReport = {
  generatedAt: string; // ISO; "" when never run
  resumePreview: string;
  model: string;
  claims: ClaimVerdict[];
  summary: {
    headline: string;
    overallScore: number; // 0..100 corroboration index
    counts: Record<Verdict, number>;
    byCategory: CategoryScore[];
    honestGaps: string[];
  };
};

export const EMPTY_REPORT: VerificationReport = {
  generatedAt: "",
  resumePreview: "",
  model: "",
  claims: [],
  summary: { headline: "", overallScore: 0, counts: { corroborated: 0, partial: 0, unverified: 0, contradicted: 0 }, byCategory: [], honestGaps: [] },
};

const clampUnit = (n: unknown) => {
  const x = typeof n === "number" && isFinite(n) ? n : 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function cleanEvidence(e: unknown): EvidenceRef | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  const types = ["repo", "article", "profile", "external-needed"];
  const type = (types.includes(String(o.type)) ? String(o.type) : "profile") as EvidenceRef["type"];
  const detail = str(o.detail);
  if (!detail) return null;
  const url = str(o.url);
  return { type, ref: str(o.ref) || "—", detail, ...(url ? { url } : {}) };
}

function cleanClaim(c: unknown): ClaimVerdict | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  const claim = str(o.claim);
  if (!claim) return null;
  const verdict = (VERDICTS.includes(o.verdict as Verdict) ? o.verdict : "unverified") as Verdict;
  const category = (CLAIM_CATEGORIES.includes(o.category as ClaimCategory) ? o.category : "other") as ClaimCategory;
  const evidence = (Array.isArray(o.evidence) ? o.evidence : [])
    .map(cleanEvidence)
    .filter((e): e is EvidenceRef => e !== null);
  return {
    claim,
    category,
    verdict,
    confidence: clampUnit(o.confidence),
    inferred: o.inferred === true,
    evidence,
    context: str(o.context),
    gapCloser: str(o.gapCloser),
  };
}

// Compute the aggregate scorecard from the per-claim verdicts — DETERMINISTICALLY,
// not from whatever totals the model claimed.
export function aggregate(claims: ClaimVerdict[], headline: string): VerificationReport["summary"] {
  const counts: Record<Verdict, number> = { corroborated: 0, partial: 0, unverified: 0, contradicted: 0 };
  for (const c of claims) counts[c.verdict]++;

  const idx = (subset: ClaimVerdict[]) => {
    if (subset.length === 0) return 0;
    const earned = subset.reduce((s, c) => s + VERDICT_META[c.verdict].weight, 0);
    return Math.round((earned / subset.length) * 100);
  };

  const byCategory: CategoryScore[] = [];
  for (const cat of CLAIM_CATEGORIES) {
    const subset = claims.filter((c) => c.category === cat);
    if (subset.length === 0) continue;
    byCategory.push({
      category: cat,
      score: idx(subset),
      corroborated: subset.filter((c) => c.verdict === "corroborated").length,
      total: subset.length,
    });
  }

  const honestGaps = claims
    .filter((c) => c.verdict === "unverified" || c.verdict === "contradicted")
    .map((c) => c.claim);

  return { headline: headline || autoHeadline(counts, claims.length), overallScore: idx(claims), counts, byCategory, honestGaps };
}

function autoHeadline(counts: Record<Verdict, number>, total: number): string {
  if (total === 0) return "No résumé verified yet.";
  const parts = [`${counts.corroborated}/${total} claims corroborated by real artifacts`];
  if (counts.partial) parts.push(`${counts.partial} partial`);
  if (counts.unverified) parts.push(`${counts.unverified} need an external source`);
  if (counts.contradicted) parts.push(`${counts.contradicted} contradicted`);
  return parts.join(", ") + ".";
}

// Coerce arbitrary input (an LLM JSON blob, or the seed file) into a safe report,
// re-deriving the aggregate from the cleaned claims so the scorecard is trustworthy.
export function normalizeReport(raw: unknown): VerificationReport {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const claims = (Array.isArray(o.claims) ? o.claims : [])
    .map(cleanClaim)
    .filter((c): c is ClaimVerdict => c !== null);
  const headline = str((o.summary as Record<string, unknown> | undefined)?.headline);
  return {
    generatedAt: str(o.generatedAt),
    resumePreview: str(o.resumePreview).slice(0, 280),
    model: str(o.model),
    claims,
    summary: aggregate(claims, headline),
  };
}
