// ─────────────────────────────────────────────────────────────────────────────
// /api/verify-resume — the "self-proof" engine. Owner pastes a résumé; this checks
// each claim against the portfolio's OWN evidence (projects, articles, profile) +
// live public GitHub, and returns a per-claim verdict report. The aggregate
// scorecard is recomputed deterministically in lib/verification.ts (verify, don't
// vibe). The LLM key stays server-side (lib/llm.ts), like /api/copilotkit.
//
// Rubric reused from github.com/wjlgatech/career-os (proof-point evidence standard,
// no-fabrication / honest-unverified, diagnose-then-cite).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveLlm } from "@/lib/llm";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { buildGithubEvidence } from "@/lib/github-evidence";
import { normalizeReport, writeVerification, type VerificationReport } from "@/lib/verification";
import { profile, mission, values, futurePractices } from "@/content/profile";
import { readPortfolio } from "@/lib/portfolio";
import projectsData from "@/content/projects.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Project = { name: string; category: string; highlight: string; private: boolean; language: string | null; pushed: string; url: string | null };

const SYSTEM_PROMPT = `You are a SKEPTICAL evidence auditor verifying a résumé against a fixed evidence corpus. You do NOT flatter. Your credibility comes from honest gaps, not green checks.

Rules (from the career-os proof-point standard):
- A claim is "corroborated" ONLY when the corpus contains a concrete proof point: a specific artifact + mechanism + metric/status (e.g. "repo cli-judge, Python, README describes a reality-grounded benchmark harness, last push 2026-06"). Marketing words are NOT evidence.
- "partial" = the corpus shows the SKILL or adjacent work but not the SPECIFIC claim (e.g. many agent repos prove agent-building, but not "led a team of 8").
- "unverified" = nothing in the corpus speaks to it (employment, titles, dates, degrees, salaries). This is the CORRECT answer for such claims — never fabricate corroboration. Set evidence to a single {type:"external-needed"} entry naming what would settle it.
- "contradicted" = the corpus conflicts with the claim (e.g. "10 years of Rust" but repos are Python with one small Rust experiment).
- Mark inferred:true when your verdict is a reasoned judgment rather than a direct match.
- Cite 1-3 specific evidence items per claim. Use repo names/urls and the concrete signal. Never invent a repo, metric, or article that is not in the corpus.
- Private repos: their existence + recency + highlight count as evidence, but you cannot cite their internals.
- context: one sharp sentence on where/how the person actually practiced this. gapCloser: the single external artifact that would settle a partial/unverified claim.

EVIDENCE TIERS — weigh them differently:
- ARTIFACT (repos, articles): independent + verifiable. REQUIRED to "corroborate" a technical/output claim ("built X", "shipped Y").
- ATTESTATION (LinkedIn recommendations/experience the person supplied, under linkedinAttestations): a NAMED person vouching. This is REAL, revealing evidence for the INTERPERSONAL / LEADERSHIP / IMPACT dimension artifacts can't reach ("led a team of 8", "mentored", "drove adoption"). A specific recommendation from a named person that describes the EXACT claim IS a proof point for such a claim — cite it as {"type":"attestation","ref":"<recommender name/title>","detail":"<what they attest>"}. BUT attestation is SOLICITED + social, so keep it honest: (a) a technical/output claim backed ONLY by testimony (no artifact) is at most "partial" — testimony never upgrades an unproven build claim to corroborated; (b) a generic/undated/unnamed rec is weak → "partial"; (c) self-reported titles/dates/employers stay "unverified" unless a named recommender independently states them.

Extract the résumé into atomic claims across categories: summary, experience, project, skill, education, other. Output STRICT JSON only, no prose:
{"claims":[{"claim","category","verdict","confidence":0..1,"inferred":bool,"evidence":[{"type":"repo|article|profile|attestation|external-needed","ref","url","detail"}],"context","gapCloser"}],"headline":"one honest sentence"}`;

async function judge(openai: OpenAI, model: string, corpus: string, resume: string): Promise<string> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: `EVIDENCE CORPUS (the ONLY things you may cite):\n${corpus}\n\n———\nRÉSUMÉ TO VERIFY:\n${resume}` },
  ];
  // Prefer JSON mode; fall back if a provider rejects response_format.
  try {
    const r = await openai.chat.completions.create({ model, messages, temperature: 0.2, response_format: { type: "json_object" } });
    return r.choices[0]?.message?.content ?? "{}";
  } catch {
    const r = await openai.chat.completions.create({ model, messages, temperature: 0.2 });
    return r.choices[0]?.message?.content ?? "{}";
  }
}

// Free-tier LLMs have tight tokens-per-minute limits (Groq's free tier is ~12k TPM),
// so the corpus is BUDGET-BOUNDED: cap counts, drop noise, and as a backstop strip the
// README excerpts if the JSON is still too large. ~22k chars ≈ ~6k tokens, leaving
// room for the prompt + résumé + the model's output under the limit.
const CORPUS_CHAR_BUDGET = 22000;

function buildCorpus(github: Awaited<ReturnType<typeof buildGithubEvidence>>, linkedin: string): string {
  const projects = projectsData as Project[];
  const articles = readPortfolio().articles.slice(0, 20);
  const base = {
    profile: { name: profile.name, tagline: profile.tagline, blurb: profile.blurb, location: profile.location },
    mission,
    values: values.map((v) => `${v.title}: ${v.body}`),
    practices: futurePractices.map((p) => `${p.n}. ${p.name}`),
    portfolioProjects: projects.map((p) => ({ name: p.name, category: p.category, highlight: p.highlight, private: p.private, language: p.language, lastPush: p.pushed, url: p.url })),
    articles: articles.map((a) => ({ title: a.title, summary: a.summary.slice(0, 200), url: a.url, category: a.category })),
    liveGithub: github.slice(0, 16).map((r) => ({ name: r.name, language: r.language, lastPush: r.pushedAt, stars: r.stars, url: r.url, description: r.description, readmeExcerpt: r.readme })),
    // ATTESTATION tier — the person's own LinkedIn recommendations/experience (user-supplied; LinkedIn
    // is login-walled so it can't be server-fetched). Testimony, not an artifact — weighed per the tiers.
    linkedinAttestations: linkedin ? linkedin.slice(0, 6000) : undefined,
  };
  let json = JSON.stringify(base);
  if (json.length > CORPUS_CHAR_BUDGET) {
    // Too big — drop the README excerpts (metadata still corroborates) and retry.
    base.liveGithub = base.liveGithub.map((r) => ({ ...r, readmeExcerpt: undefined }));
    json = JSON.stringify(base);
  }
  return json.length > CORPUS_CHAR_BUDGET ? json.slice(0, CORPUS_CHAR_BUDGET) : json;
}

export async function POST(req: NextRequest) {
  // PUBLIC self-proof demo ("paste my résumé — or any — and watch it verify"). It's an
  // LLM + GitHub route, so rate-limit per IP to protect the free-tier quota. Only the
  // OWNER's run persists/publishes the report; a visitor's run is returned but not saved.
  const rl = rateLimit(`verify:${clientKey(req)}`, 4, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  const owner = isOwnerRequest(req);
  const llm = resolveLlm();
  if (!llm) {
    return NextResponse.json({ error: "No LLM key configured. Set GROQ_API_KEY (free), GEMINI_API_KEY, NVIDIA_API_KEY, or OPENAI_API_KEY." }, { status: 503 });
  }

  let resume = "";
  let linkedin = "";
  try {
    const body = await req.json();
    resume = String(body?.resume ?? "").trim();
    // Optional ATTESTATION source: the person's own LinkedIn recommendations/experience, pasted or
    // exported (LinkedIn is login-walled → user-supplied, zero-trust; never a server scrape).
    linkedin = String(body?.linkedin ?? "").trim().slice(0, 8000);
  } catch {
    return NextResponse.json({ error: "Send { resume: <text>, linkedin?: <text> }." }, { status: 400 });
  }
  if (resume.length < 40) {
    return NextResponse.json({ error: "That résumé looks too short to verify — paste the full text." }, { status: 400 });
  }

  // Prioritize the public repos the portfolio already features for README deep-reads.
  const featuredPublic = (projectsData as Project[]).filter((p) => !p.private && p.url).map((p) => p.name);
  const github = await buildGithubEvidence(profile.handle, featuredPublic);
  const corpus = buildCorpus(github, linkedin);

  let parsed: unknown = {};
  try {
    const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
    const raw = await judge(openai, llm.model, corpus, resume);
    parsed = JSON.parse(raw);
  } catch (e) {
    return NextResponse.json({ error: `Verification failed: ${(e as Error).message}` }, { status: 502 });
  }

  const report: VerificationReport = normalizeReport({
    ...(parsed as Record<string, unknown>),
    generatedAt: new Date().toISOString(),
    model: `${llm.provider}:${llm.model}`,
    resumePreview: resume.slice(0, 280),
    summary: { headline: (parsed as Record<string, unknown>)?.headline },
  });

  if (report.claims.length === 0) {
    return NextResponse.json({ error: "The verifier returned no claims — try pasting the résumé as plain text." }, { status: 502 });
  }

  // Only the owner's run publishes; a visitor's run is shown to them but never overwrites
  // the published proof. (On serverless the fs is read-only anyway, so this is dev-only.)
  const persisted = owner ? writeVerification(report) : false;
  return NextResponse.json({ report, persisted, published: persisted });
}
