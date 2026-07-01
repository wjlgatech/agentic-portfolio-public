// ─────────────────────────────────────────────────────────────────────────────
// /api/scout — the proactive "Compass" engine. On a cadence (GitHub Action cron)
// or on demand (owner "Scout now"), it surfaces the next PROJECT to deepen/widen
// and the next COLLABORATOR to reach, grounded in the user's real fleet + verified
// strengths (the Receipts corroborated claims). Human-in-the-loop: it DRAFTS the
// next move; nothing is sent. The jobs lane is a documented fast-follow.
//
// Auth: the owner (x-portfolio-owner) OR a cron secret (x-scout-secret == SCOUT_SECRET),
// so the scheduled GitHub Action can run it without the owner token.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveLlm } from "@/lib/llm";
import { isOwnerRequest } from "@/lib/owner";
import { buildGithubEvidence } from "@/lib/github-evidence";
import { discoverCollaborators } from "@/lib/github-collab";
import { readVerification } from "@/lib/verification";
import { readCompassConfig, writeCompass, normalizeCompass, ideaCount, type CompassReport } from "@/lib/compass";
import { profile } from "@/content/profile";
import projectsData from "@/content/projects.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Project = { name: string; category: string; highlight: string; private: boolean; language: string | null; pushed: string; url: string | null };

const BASE_TOPICS = ["self-improving agent", "agentic operating system", "LLM agent framework", "MCP server"];

const SYSTEM_PROMPT = `You are a career-and-craft strategist for one builder. You see their open-source fleet, their VERIFIED strengths (only claims with real evidence), and a list of REAL GitHub people in their topic neighborhood. Propose the next moves that compound them. Be specific and grounded — no clichés ("passionate", "synergy"), no vibes.

Every "title" must be a SPECIFIC, NAMED deliverable (e.g. "A public benchmark suite for cli-judge"), never a vague verb phrase like "Improve agent tooling".

Propose moves along FOUR growth vectors (the directions work compounds — explore↔exploit × concrete↔abstract):

Produce STRICT JSON only:
{
 "deepen":   [ {"title","rationale","basis","firstStep"} ], // 1-3: go to the ROOTS of their STRONGEST corroborated cluster — more fundamental/seminal (first-principles). basis = the repo it builds on.
 "widen":    [ {"title","rationale","basis","firstStep"} ], // 1-3: enter an ADJACENT whitespace / new application or market they have little repo for yet (prefer widenInterests; Ansoff adjacency). basis = the adjacent area.
 "lengthen": [ {"title","rationale","basis","firstStep"} ], // 1-3: take an EXISTING repo further along its LIFECYCLE — harden, document, benchmark, scale toward product/commodity (Three Horizons H1→H2, Wardley evolution). basis = the repo to mature.
 "heighten": [ {"title","rationale","basis","firstStep"} ], // 1-3: GO META — generalize a pattern across repos into a reusable principle/abstraction, or compress a mechanism into a smaller core (abstraction laddering, MDL). basis = the repos the pattern spans.
 "collaborators": [ {"handle","whyMatch","sharedGround","suggestedIntro"} ], // 3-6: pick the BEST matches ONLY from the candidate list, using their EXACT handle. suggestedIntro = a drafted 2-3 sentence outreach in the builder's voice — specific, references their shared work, no clichés. Never invent a handle not in the candidates.
 "note": "one honest line (e.g. if few candidates were found)"
}`;

function authorized(req: NextRequest): boolean {
  if (isOwnerRequest(req)) return true;
  const secret = process.env.SCOUT_SECRET;
  return Boolean(secret) && req.headers.get("x-scout-secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not authorized. Owner token or x-scout-secret required." }, { status: 403 });
  }
  const llm = resolveLlm();
  if (!llm) return NextResponse.json({ error: "No LLM key configured." }, { status: 503 });

  const config = readCompassConfig();
  const projects = projectsData as Project[];
  const strengths = readVerification().claims.filter((c) => c.verdict === "corroborated").map((c) => c.claim);
  const topics = [...config.widenInterests, ...BASE_TOPICS].slice(0, 4);

  // Real evidence: the builder's public repos + real candidate collaborators.
  const featuredPublic = projects.filter((p) => !p.private && p.url).map((p) => p.name);
  const [github, candidates] = await Promise.all([
    buildGithubEvidence(profile.handle, featuredPublic),
    discoverCollaborators(profile.handle, topics),
  ]);

  const corpus = JSON.stringify({
    builder: { name: profile.name, handle: profile.handle, tagline: profile.tagline },
    verifiedStrengths: strengths,
    widenInterests: config.widenInterests,
    fleet: projects.map((p) => ({ name: p.name, category: p.category, highlight: p.highlight, private: p.private, language: p.language, lastPush: p.pushed })),
    liveRepos: github.slice(0, 16).map((r) => ({ name: r.name, language: r.language, lastPush: r.pushedAt, stars: r.stars, description: r.description })),
    collaboratorCandidates: candidates.map((c) => ({ handle: c.handle, via: c.viaRepo, viaTopic: c.viaTopic, repo: c.repoDescription, stars: c.repoStars })),
  }).slice(0, 22000); // budget-bound for free-tier TPM limits

  let parsed: Record<string, unknown> = {};
  try {
    const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: corpus },
    ];
    let raw: string;
    try {
      const r = await openai.chat.completions.create({ model: llm.model, messages, temperature: 0.4, response_format: { type: "json_object" } });
      raw = r.choices[0]?.message?.content ?? "{}";
    } catch {
      const r = await openai.chat.completions.create({ model: llm.model, messages, temperature: 0.4 });
      raw = r.choices[0]?.message?.content ?? "{}";
    }
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    return NextResponse.json({ error: `Scout failed: ${(e as Error).message}` }, { status: 502 });
  }

  // GROUND the collaborators: keep ONLY handles the model picked from the real
  // candidate set, and attach the verified URL — the model can rank/explain, never invent.
  const byHandle = new Map(candidates.map((c) => [c.handle.toLowerCase(), c]));
  const rawCollabs = Array.isArray(parsed.collaborators) ? parsed.collaborators : [];
  const collaborators = rawCollabs
    .map((c) => {
      const o = c as Record<string, unknown>;
      const cand = byHandle.get(String(o.handle ?? "").replace(/^@/, "").toLowerCase());
      if (!cand) return null;
      return { handle: cand.handle, url: cand.url, whyMatch: String(o.whyMatch ?? ""), sharedGround: String(o.sharedGround ?? cand.viaRepo), suggestedIntro: String(o.suggestedIntro ?? "") };
    })
    .filter(Boolean);

  const report: CompassReport = normalizeCompass({
    ...parsed,
    collaborators,
    generatedAt: new Date().toISOString(),
    model: `${llm.provider}:${llm.model}`,
    cadence: config.cadence,
  });

  if (ideaCount(report) + report.collaborators.length === 0) {
    return NextResponse.json({ error: "Scout returned nothing usable — try again." }, { status: 502 });
  }

  const persisted = writeCompass(report); // dev: writes content/compass.json; serverless: the GH Action commits it
  return NextResponse.json({ report, persisted, candidatesFound: candidates.length });
}
