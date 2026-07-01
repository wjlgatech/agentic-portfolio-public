// ─────────────────────────────────────────────────────────────────────────────
// /api/make — the non-technical Portfolio Maker. A person fills a simple form (name, email,
// LinkedIn, resume text, optional socials); this generates a grounded portfolio (an
// InstanceConfig) with a free LLM, HOSTS it on the shared deploy at /p/<slug> (via KV — no
// fork, no deploy), and auto-joins it to the network. 1-click, for people who don't code.
//
// Honest by design: the resume text is the grounding source (LinkedIn is login-walled → we keep
// it as a link, not scraped); claimed achievements render as `unverified`; the key stays
// server-side; rate-limited. Graceful: no LLM key → a deterministic template fill; no KV → the
// caller gets the pack JSON to download + deploy.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveLlm } from "@/lib/llm";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvSetJSON } from "@/lib/storage";
import { upsertEntry, cleanEntry } from "@/lib/registry";
import { validateInstance, type InstanceConfig } from "@core/instance-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, cap = 400) => (typeof v === "string" ? v.trim().slice(0, cap) : "");
const arr = (v: unknown, cap = 6) => (Array.isArray(v) ? v : []).map((x) => str(x, 240)).filter(Boolean).slice(0, cap);

function slugFor(name: string, email: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "me";
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) >>> 0; // stable per email → re-make overwrites
  return `${base}-${h.toString(36).slice(0, 4)}`;
}

const GEN_SYSTEM = `You write a person's professional portfolio from their résumé. Be truthful and specific — ground everything in the résumé; never invent employers, titles, or metrics. Output STRICT JSON only:
{"tagline":"3-8 words","blurb":"1-2 warm sentences on who they are + what they do","mission":"one sentence on what they're working toward","principles":[{"title":"short","body":"one sentence"}],"skills":["a real skill/service they offer"],"highlights":["a concrete thing they've done — claimed, will show as 'unverified'"],"values":[{"title":"short","body":"one sentence"}]}`;

// Assemble a full, valid InstanceConfig from the generated fields + the form (boilerplate in code).
function buildInstance(name: string, slug: string, links: Record<string, string>, g: Record<string, unknown>): InstanceConfig {
  const principles = (Array.isArray(g.principles) ? g.principles : []).map((p) => ({ title: str((p as Record<string, unknown>)?.title, 60), body: str((p as Record<string, unknown>)?.body, 200) })).filter((p) => p.title).slice(0, 4);
  const values = (Array.isArray(g.values) ? g.values : []).map((p) => ({ title: str((p as Record<string, unknown>)?.title, 60), body: str((p as Record<string, unknown>)?.body, 200) })).filter((p) => p.title).slice(0, 4);
  const skills = arr(g.skills);
  const raw = {
    slug,
    vertical: "personal",
    entity: { name, tagline: str(g.tagline, 120) || `${name}'s portfolio`, blurb: str(g.blurb, 400), location: "", links },
    story: { mission: str(g.mission, 240), principles: principles.length ? principles : [{ title: "In progress", body: "This portfolio is grounded in a résumé; the owner can refine it." }] },
    theme: "vercel",
    agent: {
      persona: `A friendly agent for ${name} — answers about their background and whether they're a fit, grounded in their real material.`,
      grounding: `Answer only from ${name}'s real material. Present achievements as claimed (unverified), never fabricate. Be honest about gaps.`,
      skills: [
        { id: "about_me", name: `About ${name}`, description: `Answer questions about ${name}'s background, skills, and work — grounded, no fabrication.`, tags: ["q&a"], examples: [`Tell me about ${name}.`] },
        { id: "assess_fit", name: "Am I a fit?", description: "Given a role or project, honestly assess whether this person is a fit, and where they aren't.", tags: ["fit"], examples: ["Would they fit a senior PM role?"] },
        { id: "contact", name: "How to reach me", description: `Share how to contact ${name} (the links in this profile).`, tags: ["contact"], examples: ["How do I reach them?"] },
      ],
    },
    sections: [
      { id: "practices", title: "About", eyebrow: "Who I am + how I work" },
      { id: "projects", title: "What I Do", eyebrow: "Skills & services" },
      { id: "receipts", title: "Highlights", eyebrow: "Claimed — verify before you trust" },
      { id: "writing", title: "Links", eyebrow: "Find me online" },
      { id: "values", title: "What I Value", eyebrow: "The why" },
    ],
    proof: { enabled: true, label: "Highlights", claimNoun: "highlight", sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: true, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: slug },
    content: {
      offerings: skills.map((s) => ({ name: s, category: "Skill", summary: s })),
      outcomes: arr(g.highlights).map((c) => ({ claim: c, verdict: "unverified" as const })),
      writings: Object.entries(links).filter(([, u]) => u).map(([k, u]) => ({ title: k, url: u, category: "Link", summary: `${name} on ${k}` })),
    },
    ...(values.length ? { /* values kept as extra principles via story */ } : {}),
  };
  // Fold values into the principles list if the story is thin (InstanceSite renders principles).
  if (values.length) raw.story.principles = [...raw.story.principles, ...values].slice(0, 6);
  const { ok, config } = validateInstance(raw);
  return (ok && config ? config : (validateInstance({ ...raw, vertical: "personal", theme: "vercel" }).config as InstanceConfig));
}

async function generate(resume: string, name: string): Promise<Record<string, unknown>> {
  const llm = resolveLlm();
  if (!llm || resume.length < 40) {
    // Deterministic fallback (no key, or too little text) — still a real, honest starter.
    return { tagline: "", blurb: resume.slice(0, 300), mission: "", principles: [], skills: [], highlights: [], values: [] };
  }
  try {
    const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
    const r = await openai.chat.completions.create({
      model: llm.model,
      temperature: 0.3,
      messages: [{ role: "system", content: GEN_SYSTEM }, { role: "user", content: `Name: ${name}\n\nRÉSUMÉ / BACKGROUND:\n${resume}` }],
      response_format: { type: "json_object" },
    });
    return JSON.parse(r.choices[0]?.message?.content ?? "{}");
  } catch {
    return { blurb: resume.slice(0, 300) };
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`make:${clientKey(req)}`, 4, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: Record<string, unknown>;
  try { body = (await req.json()) ?? {}; } catch { return NextResponse.json({ error: "Send your details as JSON." }, { status: 400 }); }

  const name = str(body.name, 80);
  const email = str(body.email, 160);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please give your name and a valid email." }, { status: 400 });
  }
  const links: Record<string, string> = {};
  for (const [k, key] of [["linkedin", "linkedin"], ["x", "x"], ["facebook", "fb"], ["instagram", "ig"]] as const) {
    const v = str(body[key], 200);
    if (/^https?:\/\//i.test(v)) links[k] = v;
  }
  const resume = str(body.resume, 12000);

  const slug = slugFor(name, email);
  const config = buildInstance(name, slug, links, await generate(resume, name));

  const origin = req.nextUrl.origin;
  const hostedUrl = `${origin}/p/${slug}`;

  if (!kvConfigured()) {
    // No shared store → hand back the pack to fork+deploy (the technical path).
    return NextResponse.json({ hosted: false, slug, pack: config, note: "No shared host configured — download this pack, drop it in content/instances/, deploy, set INSTANCE=" + slug });
  }

  const stored = await kvSetJSON(`portfolio:${slug}`, config);
  // Auto-join the network so the new portfolio is instantly discoverable.
  const entry = cleanEntry({
    name, url: hostedUrl, description: config.entity.tagline,
    skills: config.agent.skills.map((s) => ({ id: s.id, name: s.name })),
    tags: config.content?.offerings.slice(0, 6).map((o) => o.name) ?? [],
    addedAt: new Date().toISOString(),
  });
  if (entry) await upsertEntry(entry).catch(() => {});

  return NextResponse.json({ hosted: stored, url: hostedUrl, slug });
}
