// ─────────────────────────────────────────────────────────────────────────────
// /api/make — the non-technical Portfolio Maker. A person fills a simple form (name, email,
// LinkedIn, resume text, optional socials); this generates a grounded portfolio (an
// InstanceConfig) with a free LLM, HOSTS it on the shared deploy at /p/<slug> (via KV — no
// fork, no deploy), and auto-joins it to the network. 1-click, for people who don't code.
//
// MAKE-TIME PULL: every genuinely-public source is fetched HERE, before generation — public
// LinkedIn metadata (best-effort), the maker's website, GitHub repos + YouTube videos
// (syncSources — the same pullers the cron uses) — and folded into ONE grounding corpus
// (@core/make-grounding) so the first render is rich, not a shell waiting for a later sync.
// Login-walled sources (X / Instagram / Facebook) are NEVER fetched — they stay links, and the
// response's per-source report says so honestly, with the paste-to-include escape hatch.
//
// Honest by design: claimed achievements render as `unverified`; the key stays server-side;
// rate-limited. Graceful: no LLM key → a deterministic template fill; no KV → the caller gets
// the pack JSON to download + deploy; every pull degrades to null/[] — never a 500.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { resolveLlm } from "@/lib/llm";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvSetJSON } from "@/lib/storage";
import { upsertEntry, cleanEntry } from "@/lib/registry";
import { recordReferral } from "@/lib/referrals";
import { fetchLinkedInPublic, isLinkedInProfileUrl } from "@/lib/linkedin-public";
import { fetchSourceText } from "@/lib/source-fetch";
import { syncSources } from "@/lib/sync";
import { mintOwnerToken, hashOwnerToken, ownerKey } from "@/lib/portfolio-owner";
import { validateInstance, type InstanceConfig, type Vertical } from "@core/instance-types";
import { categorySpec, resolveVertical, toCategory, type CategorySpec } from "@core/make-category";
import { buildGroundingCorpus, makeSourceReport } from "@core/make-grounding";
import { mergeFeed, type SyncItem } from "@core/sync-types";

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

// Assemble a full, valid InstanceConfig from the generated fields + the form (boilerplate in code).
// The category spec (@core/make-category) supplies the vertical, sections, proof nouns, and
// generation prompt — an individual, a business, and a community share ONE pipeline (data, not forks).
function buildInstance(name: string, slug: string, links: Record<string, string>, g: Record<string, unknown>, spec: CategorySpec, vertical: Vertical, feed: SyncItem[] = []): InstanceConfig {
  const principles = (Array.isArray(g.principles) ? g.principles : []).map((p) => ({ title: str((p as Record<string, unknown>)?.title, 60), body: str((p as Record<string, unknown>)?.body, 200) })).filter((p) => p.title).slice(0, 4);
  const values = (Array.isArray(g.values) ? g.values : []).map((p) => ({ title: str((p as Record<string, unknown>)?.title, 60), body: str((p as Record<string, unknown>)?.body, 200) })).filter((p) => p.title).slice(0, 4);
  const skills = arr(g.skills);
  const isPerson = spec.category === "individual";
  const raw = {
    slug,
    vertical,
    entity: { name, tagline: str(g.tagline, 120) || `${name}'s ${isPerson ? "portfolio" : "site"}`, blurb: str(g.blurb, 400), location: "", links },
    // mission is REQUIRED by validateInstance — never leave it empty (the no-LLM fallback would, → null config → 500).
    story: { mission: str(g.mission, 240) || `${name}, in one place — ask ${isPerson ? "my" : "our"} agent anything about it.`, principles: principles.length ? principles : [{ title: "In progress", body: "This page is grounded in the maker's own words; the owner can refine it." }] },
    theme: "vercel",
    agent: {
      persona: isPerson
        ? `A friendly agent for ${name} — answers about their background and whether they're a fit, grounded in their real material.`
        : `A friendly agent for ${name} — answers visitors' questions about what ${name} offers, grounded in its real material.`,
      grounding: `Answer only from ${name}'s real material. Present achievements as claimed (unverified), never fabricate. Be honest about gaps.`,
      skills: isPerson
        ? [
            { id: "about_me", name: `About ${name}`, description: `Answer questions about ${name}'s background, skills, and work — grounded, no fabrication.`, tags: ["q&a"], examples: [`Tell me about ${name}.`] },
            { id: "assess_fit", name: "Am I a fit?", description: "Given a role or project, honestly assess whether this person is a fit, and where they aren't.", tags: ["fit"], examples: ["Would they fit a senior PM role?"] },
            { id: "contact", name: "How to reach me", description: `Share how to contact ${name} (the links in this profile).`, tags: ["contact"], examples: ["How do I reach them?"] },
          ]
        : [
            { id: "about_us", name: `About ${name}`, description: `Answer questions about ${name} — what it offers, when, where — grounded, no fabrication.`, tags: ["q&a"], examples: [`Tell me about ${name}.`] },
            { id: "capture_lead", name: "Get in touch", description: `Take a visitor's contact + what they need so ${name} can follow up.`, tags: ["lead"], examples: ["I'd like to talk to someone."] },
            { id: "contact", name: "How to reach us", description: `Share how to contact ${name} (the links in this profile).`, tags: ["contact"], examples: ["How do I reach you?"] },
          ],
    },
    sections: spec.sections.map((s) => ({ ...s })),
    proof: { enabled: true, label: spec.proof.label, claimNoun: spec.proof.claimNoun, sources: ["manual"] },
    scout: { enabled: false, deepen: "", widen: "", reach: "" },
    network: { discoverable: true, peers: [] },
    owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
    storage: { kvPrefix: slug },
    content: {
      offerings: skills.map((s) => ({ name: s, category: "Skill", summary: s })),
      outcomes: arr(g.highlights).map((c) => ({ claim: c, verdict: "unverified" as const })),
      // Real pulled work first (repos/videos from the make-time sync), then the profile links —
      // mergeFeed dedupes by url so a re-make stays idempotent.
      writings: mergeFeed(
        feed,
        Object.entries(links).filter(([, u]) => u).map(([k, u]) => ({ source: "linkedin" as const, title: k, url: u, category: "Link", summary: `${name} on ${k}` })),
        24,
      ).map((i) => ({ title: i.title, url: i.url, category: i.category ?? "Link", summary: i.summary ?? "" })),
    },
    ...(values.length ? { /* values kept as extra principles via story */ } : {}),
  };
  // Fold values into the principles list if the story is thin (InstanceSite renders principles).
  if (values.length) raw.story.principles = [...raw.story.principles, ...values].slice(0, 6);
  const { ok, config } = validateInstance(raw);
  return (ok && config ? config : (validateInstance({ ...raw, vertical: "personal", theme: "vercel" }).config as InstanceConfig));
}

async function generate(about: string, name: string, spec: CategorySpec): Promise<Record<string, unknown>> {
  const llm = resolveLlm();
  if (!llm || about.length < 40) {
    // Deterministic fallback (no key, or too little text) — still a real, honest starter.
    return { tagline: "", blurb: about.slice(0, 300), mission: "", principles: [], skills: [], highlights: [], values: [] };
  }
  try {
    const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
    const r = await openai.chat.completions.create({
      model: llm.model,
      temperature: 0.3,
      messages: [{ role: "system", content: spec.genSystem }, { role: "user", content: `Name: ${name}\n\nABOUT (the maker's own words + their labeled PUBLIC material — profile metadata, website, recent repos/videos; ground on it, never invent beyond it):\n${about}` }],
      response_format: { type: "json_object" },
    });
    return JSON.parse(r.choices[0]?.message?.content ?? "{}");
  } catch {
    return { blurb: about.slice(0, 300) };
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
  for (const [k, key] of [["linkedin", "linkedin"], ["x", "x"], ["facebook", "fb"], ["instagram", "ig"], ["github", "github"], ["youtube", "youtube"], ["website", "website"]] as const) {
    const v = str(body[key], 200);
    if (/^https?:\/\//i.test(v)) links[k] = v;
  }
  const resume = str(body.resume, 12000);

  // The category seam: individual (résumé/LinkedIn) · business · community — one pipeline,
  // different vertical/sections/prompt (data from @core/make-category, never a fork).
  const category = toCategory(body.category);
  const spec = categorySpec(category);
  const vertical = resolveVertical(category, body.vertical);

  // MAKE-TIME PULL — fetch every genuinely-public source NOW, in parallel, each timeboxed and
  // degrading to null/[] (a slow or blocked source never fails the make). Login-walled sources
  // (X / Instagram / Facebook) are never fetched — the report below says so honestly.
  const [li, synced, site] = await Promise.all([
    links.linkedin && isLinkedInProfileUrl(links.linkedin) ? fetchLinkedInPublic(links.linkedin).catch(() => null) : Promise.resolve(null),
    syncSources(links).catch(() => ({ items: [] as SyncItem[], counts: {} as Record<string, number> })),
    links.website ? fetchSourceText(links.website, 6000).catch(() => null) : Promise.resolve(null),
  ]);

  // ONE corpus from everything readable, the maker's own words first (@core/make-grounding).
  const { corpus, used } = buildGroundingCorpus({
    resume,
    linkedin: li?.resumeText,
    website: site?.ok ? `${site.title}\n${site.text}` : undefined,
    feed: synced.items,
  });
  // Require at least ONE grounding source (name+email alone is too thin for a real page).
  if (corpus.length < 40) {
    return NextResponse.json({ error: spec.intake.groundingError }, { status: 400 });
  }
  // Legacy `source` + honest note kept for the UI; the full story is in `sources` below.
  const source: "resume" | "linkedin" | "public" | "thin" =
    resume.length >= 40 ? "resume" : li ? "linkedin" : used.length ? "public" : "thin";
  const thinNote = links.linkedin && !li
    ? "We couldn't read your LinkedIn automatically (LinkedIn blocks server reads). Your portfolio is grounded in your other sources — paste a few lines about yourself and re-make to enrich it."
    : "";
  const sources = makeSourceReport({ resumeChars: resume.length, links, linkedinPulled: !!li, websitePulled: !!site?.ok, counts: synced.counts });
  // Who invited them (their referrer's slug). Attribution flows from a shared portfolio's footer
  // link (?ref=<slug>) — a public handle, never a contact list. Sanitized to the slug charset.
  const ref = str(body.ref, 48).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);

  const slug = slugFor(name, email);
  const config = buildInstance(name, slug, links, await generate(corpus, name, spec), spec, vertical, synced.items);
  if (!config?.entity) {
    return NextResponse.json({ error: "Couldn't assemble a valid portfolio from that input — add a few more lines about yourself and try again." }, { status: 422 });
  }

  const origin = req.nextUrl.origin;
  const hostedUrl = `${origin}/p/${slug}`;

  if (!kvConfigured()) {
    // No shared store → hand back the pack to fork+deploy (the technical path).
    return NextResponse.json({ hosted: false, slug, source, sources, note: thinNote || ("No shared host configured — download this pack, drop it in content/instances/, deploy, set INSTANCE=" + slug), pack: config });
  }

  const stored = await kvSetJSON(`portfolio:${slug}`, config);

  // Per-portfolio OWNERSHIP: mint this portfolio's own owner secret so the MAKER (not just the deploy
  // admin) owns their page — view their leads, manage it. Store only the hash; return the token ONCE.
  // Re-making (same slug) rotates the token, so only the latest maker holds it.
  const ownerToken = mintOwnerToken();
  await kvSetJSON(ownerKey(slug), hashOwnerToken(ownerToken));
  await kvSetJSON(`owner-email:${slug}`, email); // server-only, for email-based owner recovery (never exposed)
  const ownerUrl = `${hostedUrl}?owner=${ownerToken}`;

  // Auto-join the network so the new portfolio is instantly discoverable.
  const entry = cleanEntry({
    name, url: hostedUrl, description: config.entity.tagline,
    skills: config.agent.skills.map((s) => ({ id: s.id, name: s.name })),
    tags: config.content?.offerings.slice(0, 6).map((o) => o.name) ?? [],
    addedAt: new Date().toISOString(),
  });
  if (entry) await upsertEntry(entry).catch(() => {});

  // Viral attribution: a LIVE portfolio shipped via an invite credits the referrer (their standing
  // rises). The invitee is `live` because they're now hosted + in the network.
  if (ref && ref !== slug && stored) await recordReferral(ref, slug, true).catch(() => {});

  return NextResponse.json({ hosted: stored, url: hostedUrl, slug, tagline: config.entity.tagline, source, sources, note: thinNote || undefined, ownerUrl, ownerToken, referredBy: ref || null });
}
