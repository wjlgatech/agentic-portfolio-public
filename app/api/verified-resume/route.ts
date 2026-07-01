// ─────────────────────────────────────────────────────────────────────────────
// /api/verified-resume — CLOSE THE LOOP. After a résumé is verified (Resume
// Verification / Receipts), this drafts an HONEST résumé built from ONLY the claims
// that earned evidence (corroborated + partial), each annotated with its citation.
// Unverified/contradicted claims are dropped. Owner-gated; career-os ethic: it DRAFTS,
// it never sends. The owner reviews + exports.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { resolveLlm } from "@/lib/llm";
import { chatWithFailover } from "@/lib/llm-complete";
import { normalizeReport } from "@core/verification-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You rewrite a résumé so EVERY line is backed by real evidence. You are given a list of VERIFIED claims (each already checked against real artifacts) with their evidence citations. Compose a clean, concise résumé in Markdown using ONLY these claims.

HARD RULES:
- Use ONLY the claims provided. NEVER add a skill, role, metric, employer, date, or project that isn't in them.
- After each bullet, append its citation in brackets, e.g. "[cli-judge]" or "[GitHub: repo]". A "partial" claim must be softened to exactly what the evidence supports (no overclaiming).
- Group into sensible sections (Summary, Experience, Projects, Skills) only where the claims support them. Omit empty sections.
- No clichés ("passionate", "results-driven"), no filler. Plain, verifiable, honest.
- End with a one-line "Every line above is backed by a cited, verified artifact." note.`;

export async function POST(req: NextRequest) {
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Only the owner can generate a verified résumé." }, { status: 403 });
  }
  if (!resolveLlm()) {
    return NextResponse.json({ error: "No LLM key configured — can't draft the résumé." }, { status: 503 });
  }

  let claims;
  try {
    const body = await req.json();
    // Reuse the verification normalizer so the input is the same trusted shape as a report.
    claims = normalizeReport({ claims: body?.claims }).claims;
  } catch {
    return NextResponse.json({ error: "Send { claims: [...] } from a verification report." }, { status: 400 });
  }

  // Only what earned evidence closes the loop into a sendable résumé.
  const verified = claims.filter((c) => c.verdict === "corroborated" || c.verdict === "partial");
  if (verified.length === 0) {
    return NextResponse.json({ error: "No corroborated or partial claims yet — close the gaps and re-verify first." }, { status: 422 });
  }

  const corpus = JSON.stringify(
    verified.map((c) => ({
      claim: c.claim,
      strength: c.verdict, // corroborated | partial
      category: c.category,
      evidence: c.evidence.map((e) => ({ ref: e.ref, detail: e.detail, url: e.url ?? null })),
    })),
  ).slice(0, 16000); // budget-bound for free-tier TPM

  try {
    const { text } = await chatWithFailover(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `VERIFIED CLAIMS:\n${corpus}\n\nDraft the verified résumé now (Markdown).` },
      ],
      { temperature: 0.3 },
    );
    const draft = (text || "").trim();
    if (!draft) return NextResponse.json({ error: "The model returned an empty draft — try again." }, { status: 502 });
    return NextResponse.json({ draft, claimsUsed: verified.length });
  } catch (e) {
    return NextResponse.json({ error: `Couldn't draft the résumé: ${(e as Error).message}` }, { status: 502 });
  }
}
