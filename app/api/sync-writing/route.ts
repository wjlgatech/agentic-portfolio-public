// ─────────────────────────────────────────────────────────────────────────────
// /api/sync-writing — sync the Writing section from server-syncable sources (Substack, Medium,
// any RSS). TWO triggers, one sync:
//   • POST — the owner "⟳ Sync feeds" button (x-portfolio-owner → 403 otherwise)
//   • GET  — the WEEKLY cron (Vercel Cron Bearer CRON_SECRET, or x-sync-secret); no owner token.
//            A plain GET (no cron secret) lists the registry + each source's method.
// It fetches each server-rss feed, merges the new posts into the portfolio's articles (deduped by
// url), and PERSISTS durably (portfolio:config) — so the cron works with no client. Login-walled
// sources (LinkedIn/X) are reported as browser-harvest — they run in the owner's browser, not here.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { isCronRequest } from "@/lib/cron-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { readPortfolioAsync, writePortfolioDurable } from "@/lib/portfolio";
import { syncWritingSources } from "@/lib/writing-sync";
import { SOURCE_CATALOG, mergeArticles, type WritingSource, type WritingSourceKind } from "@core/writing-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanSources(raw: unknown): WritingSource[] {
  return (Array.isArray(raw) ? raw : [])
    .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((o) => ({ kind: String(o!.kind ?? "") as WritingSourceKind, ref: String(o!.ref ?? "").trim(), label: String(o!.label ?? "").trim() }))
    .filter((s) => SOURCE_CATALOG[s.kind] && s.ref)
    .map((s) => ({ ...s, label: s.label || SOURCE_CATALOG[s.kind].label }))
    .slice(0, 24);
}

// The one sync, shared by the owner button (POST) and the weekly cron (GET). Fetches server-rss
// feeds, merges into the portfolio's articles, persists durably.
async function runWritingSync(sources: WritingSource[]): Promise<Record<string, unknown>> {
  const { items, results } = await syncWritingSources(sources);
  const cfg = await readPortfolioAsync();
  const { merged, added } = mergeArticles(cfg.articles, items);
  let persisted = true;
  let durable = false;
  if (added > 0) ({ persisted, durable } = await writePortfolioDurable({ ...cfg, articles: merged }));
  return {
    ok: persisted,
    durable,
    added,
    total: merged.length,
    results, // per-source: {kind, label, method, count, error?}
    browserSources: results.filter((r) => r.method === "browser-harvest"), // LinkedIn/X — in-browser harvest
  };
}

export async function GET(req: NextRequest) {
  if (isCronRequest(req)) {
    const { writingSources } = await readPortfolioAsync();
    return NextResponse.json({ ...(await runWritingSync(writingSources)), ranBy: "cron" });
  }
  const { writingSources } = await readPortfolioAsync();
  return NextResponse.json({
    sources: writingSources.map((s) => ({ ...s, method: SOURCE_CATALOG[s.kind]?.method })),
    catalog: Object.fromEntries(Object.entries(SOURCE_CATALOG).map(([k, v]) => [k, v.method])),
  });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`sync-writing:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Only the owner can sync Writing." }, { status: 403 });
  }

  // Sources from the body (an agent/MCP caller can pass them) else the durable registry.
  let sources: WritingSource[] = [];
  try {
    const body = (await req.json().catch(() => ({}))) as { sources?: unknown };
    sources = cleanSources(body.sources);
  } catch {
    /* ignore — fall through to the durable registry */
  }
  if (sources.length === 0) sources = (await readPortfolioAsync()).writingSources;

  return NextResponse.json(await runWritingSync(sources));
}
