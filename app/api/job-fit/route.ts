// ─────────────────────────────────────────────────────────────────────────────
// /api/job-fit — score a job posting against the owner across THREE axes (past
// experience · current skillset · future mission/value/vision trajectory). POST a
// posting URL (fetched via the public ATS APIs — lib/jobfit.ts) or raw JD text. The
// LLM judges each axis with evidence + honest gaps; the OVERALL score + fit level are
// recomputed in code (@core/jobfit-types aggregateFit) so the headline can't be inflated.
//
// PUBLIC self-proof demo, like /api/verify-resume: an LLM + network route, so per-IP
// rate-limited. The key stays server-side (lib/llm.ts). Skeptical by design — a
// misaligned role must come back low; the scorer's own accuracy is published via the
// golden-set eval (content/jobfit-eval.json). Discipline reused from career-os.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveLlm } from "@/lib/llm";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { buildGithubEvidence } from "@/lib/github-evidence";
import { fetchJD, JD_CHAR_BUDGET } from "@/lib/jobfit";
import { normalizeFit, FIT_AXES, type JobFit, type JobMeta } from "@core/jobfit-types";
import { profile, mission, values, futurePractices } from "@/content/profile";
import { readPortfolio } from "@/lib/portfolio";
import projectsData from "@/content/projects.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Project = { name: string; category: string; highlight: string; private: boolean; language: string | null; pushed: string; url: string | null };

const AXIS_GUIDE = FIT_AXES.map((a) => `- ${a.id} (${a.label}, weight ${a.weight}): ${a.gist}`).join("\n");

const SYSTEM_PROMPT = `You are a SKEPTICAL career-fit auditor. You score how well a JOB fits a specific person, given a fixed evidence corpus about that person. You do NOT flatter and you do NOT inflate — a role that is genuinely misaligned must score low. Your credibility comes from honest gaps, not encouragement.

Score these THREE axes, each 0-100:
${AXIS_GUIDE}

Rules:
- Ground EVERY axis in the corpus: cite concrete signals (a repo name + what it shows, an article, a stated value/practice). Adjectives are not evidence. Never invent a repo, metric, or fact not in the corpus.
- "experience": match the role's seniority + domain demands against what the corpus shows the person has actually shipped. If the JD wants 10y management and the corpus is IC open-source work, say so and score it down.
- "skills": required skills vs. skills demonstrated in real artifacts. Adjacent-but-not-exact = mid score, not high.
- "trajectory": does this role pull toward where the person is going (their mission, values, and 12X practices) — not just where they've been? A technically-matching role that contradicts the mission should score LOW here; a stretch role that's dead-on mission can score HIGH here even if experience lags.
- gaps: for each axis, list the honest reasons this might NOT be a fit (missing experience, skill, or mission conflict). Be specific.
- recommendation: ONE honest line — "apply", "network in first", or "skip" — and the single reason. No hype.

Output STRICT JSON only, no prose:
{"axes":[{"axis":"experience|skills|trajectory","score":0-100,"rationale":"1-2 sentences","evidence":["concrete corpus signal", "..."],"gaps":["honest gap", "..."]}],"recommendation":"one honest line"}`;

const CORPUS_CHAR_BUDGET = 14000;

function buildCorpus(github: Awaited<ReturnType<typeof buildGithubEvidence>>): string {
  const projects = projectsData as Project[];
  const articles = readPortfolio().articles.slice(0, 16);
  const base = {
    person: { name: profile.name, tagline: profile.tagline, blurb: profile.blurb, location: profile.location },
    mission,
    values: values.map((v) => `${v.title}: ${v.body}`),
    practices12X: futurePractices.map((p) => `${p.n}. ${p.name}: ${p.body}`),
    projects: projects.map((p) => ({ name: p.name, category: p.category, highlight: p.highlight, private: p.private, language: p.language, lastPush: p.pushed, url: p.url })),
    articles: articles.map((a) => ({ title: a.title, summary: a.summary.slice(0, 160), category: a.category })),
    liveGithub: github.slice(0, 14).map((r) => ({ name: r.name, language: r.language, lastPush: r.pushedAt, stars: r.stars, url: r.url, description: r.description, readmeExcerpt: r.readme })),
  };
  let json = JSON.stringify(base);
  if (json.length > CORPUS_CHAR_BUDGET) {
    base.liveGithub = base.liveGithub.map((r) => ({ ...r, readmeExcerpt: undefined }));
    json = JSON.stringify(base);
  }
  return json.length > CORPUS_CHAR_BUDGET ? json.slice(0, CORPUS_CHAR_BUDGET) : json;
}

async function judge(openai: OpenAI, model: string, corpus: string, jd: string, job: JobMeta): Promise<string> {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: `EVIDENCE CORPUS (about the person — the ONLY things you may cite):\n${corpus}\n\n———\nJOB TO SCORE — ${job.title}${job.company ? ` @ ${job.company}` : ""}${job.location ? ` (${job.location})` : ""}:\n${jd}` },
  ];
  try {
    const r = await openai.chat.completions.create({ model, messages, temperature: 0.2, response_format: { type: "json_object" } });
    return r.choices[0]?.message?.content ?? "{}";
  } catch {
    const r = await openai.chat.completions.create({ model, messages, temperature: 0.2 });
    return r.choices[0]?.message?.content ?? "{}";
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`jobfit:${clientKey(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const llm = resolveLlm();
  if (!llm) return NextResponse.json({ error: "No LLM key configured. Set GROQ_API_KEY (free), GEMINI_API_KEY, NVIDIA_API_KEY, or OPENAI_API_KEY." }, { status: 503 });

  let url = "";
  let text = "";
  let title = "";
  let company = "";
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
    text = String(body?.text ?? "").trim();
    title = String(body?.title ?? "").trim();
    company = String(body?.company ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Send { url } or { text } for the job description." }, { status: 400 });
  }

  // Resolve the JD: a URL is fetched via the public ATS APIs; raw text is used as-is.
  let job: JobMeta;
  let jd: string;
  if (url) {
    try {
      const fetched = await fetchJD(url);
      job = fetched.job;
      jd = fetched.text;
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 422 });
    }
  } else if (text.length >= 80) {
    job = { title: title || "Role", company, location: "", url: "", source: "pasted" };
    jd = text.slice(0, JD_CHAR_BUDGET);
  } else {
    return NextResponse.json({ error: "Send a job-posting { url }, or paste the full JD as { text } (at least a few lines)." }, { status: 400 });
  }

  if (jd.length < 80) return NextResponse.json({ error: "That posting didn't yield enough text to score. Paste the JD text directly." }, { status: 422 });

  const featuredPublic = (projectsData as Project[]).filter((p) => !p.private && p.url).map((p) => p.name);
  const github = await buildGithubEvidence(profile.handle, featuredPublic);
  const corpus = buildCorpus(github);

  let parsed: unknown = {};
  try {
    const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
    parsed = JSON.parse(await judge(openai, llm.model, corpus, jd, job));
  } catch (e) {
    return NextResponse.json({ error: `Scoring failed: ${(e as Error).message}` }, { status: 502 });
  }

  const fit: JobFit = normalizeFit({
    ...(parsed as Record<string, unknown>),
    job,
    generatedAt: new Date().toISOString(),
    model: `${llm.provider}:${llm.model}`,
    jdPreview: jd.slice(0, 280),
  });

  if (fit.axes.length === 0) return NextResponse.json({ error: "The scorer returned no axis verdicts — try pasting the JD as plain text." }, { status: 502 });

  return NextResponse.json({ fit });
}
