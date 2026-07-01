// ─────────────────────────────────────────────────────────────────────────────
// /api/sync — keep a hosted portfolio fresh from its PUBLIC sources.
//   • POST { instance:<slug> }  → OWNER-gated (per-portfolio). Pulls GitHub + YouTube, merges the
//     latest into the portfolio's "writings" (dedupe-by-url, idempotent), persists. Returns per-source
//     counts + the HONEST status of X/LinkedIn (not server-syncable — browser-harvest/manual).
//   • GET (cron)  → SECRET-gated (`x-sync-secret` or Vercel-cron Bearer). Syncs every hosted portfolio
//     in the registry (capped, logged) — the "auto-update on a schedule" path.
// Never claims a pull a wall forbids (X paid/login, LinkedIn login-walled) — see sourceFeasibility.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { ownerHashMatches, ownerKey } from "@/lib/portfolio-owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { readRegistryAsync } from "@/lib/registry";
import { syncSources } from "@/lib/sync";
import { mergeFeed, sourceFeasibility, type SyncItem } from "@core/sync-types";
import { validateInstance, type InstanceConfig } from "@core/instance-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slugRe = /^[a-z0-9-]{1,64}$/i;
const MAX_CRON = 25;

async function ownsInstance(req: NextRequest, slug: string): Promise<boolean> {
  if (isOwnerRequest(req)) return true;
  const provided = req.headers.get("x-portfolio-owner") ?? "";
  if (!provided) return false;
  const hash = await kvGetJSON<string>(ownerKey(slug));
  return hash ? ownerHashMatches(provided, hash) : false;
}

// Pull sources for one portfolio, merge into its writings, persist. Returns a per-portfolio summary.
async function syncOne(slug: string): Promise<{ slug: string; synced?: Record<string, number>; added?: number; error?: string }> {
  const raw = await kvGetJSON<unknown>(`portfolio:${slug}`);
  if (!raw) return { slug, error: "not found" };
  const { ok, config } = validateInstance(raw);
  if (!ok || !config) return { slug, error: "invalid config" };

  const links = config.entity.links ?? {};
  const { items, counts } = await syncSources(links);
  if (!items.length) return { slug, synced: counts, added: 0 };

  const existing: SyncItem[] = (config.content?.writings ?? []).map((w) => ({ source: "linkedin", title: w.title, url: w.url, category: w.category, summary: w.summary }));
  const before = existing.length;
  const merged = mergeFeed(existing, items, 24);
  const next: InstanceConfig = {
    ...config,
    content: {
      offerings: config.content?.offerings ?? [],
      outcomes: config.content?.outcomes ?? [],
      writings: merged.map((i) => ({ title: i.title, url: i.url, category: i.category ?? "Link", summary: i.summary ?? "" })),
    },
  };
  await kvSetJSON(`portfolio:${slug}`, next);
  return { slug, synced: counts, added: Math.max(0, merged.length - before) };
}

const feasibility = { x: sourceFeasibility("x"), linkedin: sourceFeasibility("linkedin"), github: sourceFeasibility("github"), youtube: sourceFeasibility("youtube") };

export async function POST(req: NextRequest) {
  const rl = rateLimit(`sync:${clientKey(req)}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — try again in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  if (!kvConfigured()) return NextResponse.json({ error: "Sync needs the shared store (POSTGRES_URL) — not configured on this deploy." }, { status: 503 });

  let slug = "";
  try { slug = String(((await req.json()) as Record<string, unknown>)?.instance ?? "").toLowerCase(); } catch { /* noop */ }
  if (!slugRe.test(slug)) return NextResponse.json({ error: "Send { instance: <your portfolio slug> }." }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only. Open your portfolio with ?owner=<your token> to sync it." }, { status: 403 });

  const r = await syncOne(slug);
  return NextResponse.json({ ...r, feasibility });
}

export async function GET(req: NextRequest) {
  // Cron: sync every hosted portfolio. Auth = SYNC_SECRET (x-sync-secret) or Vercel-cron Bearer CRON_SECRET.
  const secret = process.env.SYNC_SECRET;
  const cronBearer = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  const authed = (secret && req.headers.get("x-sync-secret") === secret) || (cronBearer && req.headers.get("authorization") === cronBearer);
  if (!authed) return NextResponse.json({ error: "Cron only — set SYNC_SECRET (x-sync-secret) or run via Vercel Cron (CRON_SECRET)." }, { status: 403 });
  if (!kvConfigured()) return NextResponse.json({ error: "Sync needs the shared store (POSTGRES_URL)." }, { status: 503 });

  const entries = await readRegistryAsync();
  const slugs = entries.map((e) => e.url.match(/\/p\/([a-z0-9-]+)/i)?.[1]).filter((s): s is string => !!s);
  const capped = slugs.slice(0, MAX_CRON);
  const results = [];
  for (const slug of capped) results.push(await syncOne(slug)); // sequential — kind to GitHub's unauthenticated rate limit
  return NextResponse.json({ ran: capped.length, ofTotal: slugs.length, truncated: slugs.length > MAX_CRON, results, feasibility }, { headers: { "Cache-Control": "no-store" } });
}
