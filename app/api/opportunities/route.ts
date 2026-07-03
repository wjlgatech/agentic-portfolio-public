// ─────────────────────────────────────────────────────────────────────────────
// /api/opportunities — the Opportunity Scout: the PROACTIVE half of a hosted portfolio.
// Instead of waiting to be discovered, the owner's agent searches public discussions relevant
// to what they offer (an after-storm renovation thread for a roofer), and DRAFTS a genuinely
// helpful, affiliation-disclosed reply. THE HARD LINE: this route never posts anywhere — the
// owner reviews, edits, and posts from their own account (drafts-never-sends; auto-posting
// violates platform ToS and the brand). Feasibility is honest: HN is server-searchable;
// Reddit is best-effort (datacenter 403s); FB groups/Skool/LinkedIn/X are login-walled and
// never claimed — the owner watches those, the agent drafts for anything pasted in.
//
//   POST  { instance, keywords? } → owner-gated per portfolio: search → draft → persist.
//   GET   ?instance=<slug>        → owner-gated: the opportunity queue (urls + drafts).
//   PATCH { instance, id, status} → owner-gated: mark sent/skipped (closes the measure loop).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest, ownerTokenConfigured } from "@/lib/owner";
import { ownerHashMatches, ownerKey } from "@/lib/portfolio-owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvGetJSON } from "@/lib/storage";
import { chatWithFailover } from "@/lib/llm-complete";
import { listOpportunities, writeOpportunities, searchHN, searchReddit } from "@/lib/opportunities";
import { SEED_PACKS } from "@/content/instances/seeds";
import { validateInstance, type InstanceConfig } from "@core/instance-types";
import { buildQueries, normalizeHit, upsertOpportunities, markOpportunity, oppSourceFeasibility, MAX_NEW_PER_RUN, type Opportunity } from "@core/opportunity-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slugRe = /^[a-z0-9-]{1,64}$/;

async function ownsInstance(req: NextRequest, slug: string): Promise<boolean> {
  // Admin bypass ONLY when a global token is configured AND matches (never the un-gated dev shortcut).
  if (ownerTokenConfigured() && isOwnerRequest(req)) return true;
  const provided = req.headers.get("x-portfolio-owner") ?? "";
  if (!provided) return false;
  const hash = await kvGetJSON<string>(ownerKey(slug));
  return hash ? ownerHashMatches(provided, hash) : false;
}

async function loadConfig(slug: string): Promise<InstanceConfig | null> {
  const raw = (await kvGetJSON<unknown>(`portfolio:${slug}`)) ?? SEED_PACKS[slug] ?? null;
  if (!raw) return null;
  const { ok, config } = validateInstance(raw);
  return ok && config ? config : null;
}

const str = (v: unknown, cap: number) => (typeof v === "string" ? v.trim().slice(0, cap) : "");

// The disclosure ethic + the ANTI-SPAM gate, encoded. The gate is load-bearing: a search hit
// is only a lead if replying would GENUINELY help that thread — a roofer in a mental-health
// thread is spam even with perfect manners. The model must refuse those (relevant:false).
function draftSystem(config: InstanceConfig): string {
  return `You screen public discussion threads for the OWNER of "${config.entity.name}" (${config.entity.tagline}) and draft a reply ONLY when replying would genuinely help.

FIRST judge relevance, strictly: is this thread actually about a problem ${config.entity.name} solves (see ENTITY MATERIAL)? If a reply from this business would feel off-topic or promotional there, it is SPAM — output {"relevant":false,"why":"<one line>"} and nothing else. Most threads are not relevant; be picky.

Only if relevant, also output a "draft" the owner will personally post:
- Genuinely HELPFUL first: answer the thread's actual question with real, practical substance.
- DISCLOSE the affiliation naturally ("I run ${config.entity.name}", "we do this for a living").
- At most ONE link (their portfolio), offered not pushed. No pressure, no sales language, no emojis.
- Ground every claim in the entity's real material; never invent credentials, numbers, or availability.
- 3-6 sentences, first person, the owner's voice.

Output STRICT JSON only: {"relevant": true|false, "why": "...", "draft": "..."}
ENTITY MATERIAL: ${JSON.stringify({ mission: config.story.mission, offerings: (config.content?.offerings ?? []).slice(0, 8).map((o) => `${o.name}: ${o.summary}`) }).slice(0, 2500)}`;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`opps:${clientKey(req)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: Record<string, unknown>;
  try { body = ((await req.json()) as Record<string, unknown>) ?? {}; } catch { return NextResponse.json({ error: "Send JSON: { instance, keywords? }." }, { status: 400 }); }
  const slug = str(body.instance, 64).toLowerCase();
  if (!slugRe.test(slug)) return NextResponse.json({ error: "A valid instance slug is required." }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only. Open your portfolio with ?owner=<your token> to scout." }, { status: 403 });

  const config = await loadConfig(slug);
  if (!config) return NextResponse.json({ error: "No portfolio found for that slug." }, { status: 404 });

  const keywords = (Array.isArray(body.keywords) ? body.keywords : []).map((k) => str(k, 80)).filter(Boolean).slice(0, 5);
  const queries = buildQueries(config, keywords);
  const now = new Date().toISOString();

  // Search the honestly-readable sources in parallel (blocked source → [], never fabricated).
  const hitsBySource = await Promise.all(
    queries.flatMap((q) => [
      searchHN(q).then((hs) => hs.map((h) => normalizeHit(h, "hn", q, now))),
      searchReddit(q).then((hs) => hs.map((h) => normalizeHit(h, "reddit", q, now))),
    ]),
  );
  const existing = await listOpportunities(slug);
  const have = new Set(existing.map((o) => o.id));
  const seen = new Set<string>();
  const fresh = hitsBySource.flat().filter((h): h is NonNullable<typeof h> => h !== null)
    .filter((h) => !have.has(h.id) && !seen.has(h.id) && (seen.add(h.id), true))
    .slice(0, MAX_NEW_PER_RUN); // LLM drafting is budget-bounded

  // Screen + draft per fresh hit (one call does both): irrelevant threads are DROPPED — replying
  // there would be spam, and a queue full of spam trains the owner to ignore the scout.
  const drafted: Opportunity[] = [];
  let dropped = 0;
  for (const h of fresh) {
    try {
      const r = await chatWithFailover(
        [
          { role: "system", content: draftSystem(config) },
          { role: "user", content: `THREAD: ${h.title}\n${h.excerpt || "(no excerpt — open the link for context)"}\nURL: ${h.url}` },
        ],
        { temperature: 0.3, jsonMode: true },
      );
      const j = JSON.parse(r.text) as { relevant?: boolean; draft?: string };
      if (j.relevant !== true || !String(j.draft ?? "").trim()) { dropped++; continue; }
      drafted.push({ ...h, draft: String(j.draft).slice(0, 1200), status: "drafted" });
    } catch {
      // No LLM / bad JSON → we cannot judge relevance, so we do NOT queue it (fail closed on spam).
      dropped++;
    }
  }

  const merged = upsertOpportunities(existing, drafted);
  const durable = await writeOpportunities(slug, merged);

  return NextResponse.json({
    ok: true,
    queries,
    found: drafted.length,
    droppedAsIrrelevant: dropped, // honest: hits the spam gate refused (a reply there wouldn't help)
    total: merged.length,
    durable,
    sources: oppSourceFeasibility(),
    opportunities: drafted,
    reminder: "Nothing was posted anywhere. Review each draft, edit it into your own words, and post it yourself from your own account.",
  });
}

export async function GET(req: NextRequest) {
  const slug = str(req.nextUrl.searchParams.get("instance"), 64).toLowerCase();
  if (!slugRe.test(slug)) return NextResponse.json({ error: "?instance=<slug> is required." }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only — the opportunity queue is the owner's pipeline." }, { status: 403 });
  const list = await listOpportunities(slug);
  return NextResponse.json({ count: list.length, opportunities: list, sources: oppSourceFeasibility() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = ((await req.json()) as Record<string, unknown>) ?? {}; } catch { return NextResponse.json({ error: "Send JSON: { instance, id, status }." }, { status: 400 }); }
  const slug = str(body.instance, 64).toLowerCase();
  if (!slugRe.test(slug)) return NextResponse.json({ error: "A valid instance slug is required." }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const list = await listOpportunities(slug);
  const { list: next, changed } = markOpportunity(list, str(body.id, 16), body.status);
  if (!changed) return NextResponse.json({ error: "Unknown opportunity id or status (use: sent | skipped | drafted)." }, { status: 400 });
  const durable = await writeOpportunities(slug, next);
  return NextResponse.json({ ok: true, durable });
}
