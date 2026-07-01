// ─────────────────────────────────────────────────────────────────────────────
// /api/registry — the Portfolio Registry (the network's DNS).
//   GET ?q=…   → search the indexed agent-portfolios (ranked).
//   POST {url} → JOIN: fetch the portfolio's /.well-known agent card, validate it's a
//                real A2A card, index it. No fabrication — we only register portfolios
//                that actually expose an A2A Agent Card.
// Open route → rate-limited. On serverless the index grows by committing registry.json.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { readRegistryAsync, upsertEntry, cleanEntry, searchRegistry, type RegistryEntry } from "@/lib/registry";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const all = await readRegistryAsync();
  const entries = q.trim() ? searchRegistry(all, q) : all;
  return NextResponse.json({ total: all.length, entries }, { headers: { "Cache-Control": "public, max-age=60" } });
}

// Pull the agent card from a portfolio origin (current spec path, then the legacy one).
async function fetchCard(origin: string): Promise<Record<string, unknown> | null> {
  for (const p of ["/.well-known/agent-card.json", "/.well-known/agent.json"]) {
    try {
      const res = await fetch(origin + p, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`registry:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let url = "";
  try {
    url = String((await req.json())?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Send { url: <your portfolio URL> }." }, { status: 400 });
  }
  let origin: string;
  try {
    origin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin;
  } catch {
    return NextResponse.json({ error: `Couldn't parse "${url}" as a URL.` }, { status: 400 });
  }

  const card = await fetchCard(origin);
  if (!card || typeof card.name !== "string" || !Array.isArray(card.skills)) {
    return NextResponse.json(
      { error: `No valid A2A Agent Card at ${origin}/.well-known/agent-card.json. The portfolio must expose one to join the network.` },
      { status: 422 },
    );
  }

  const skills = (card.skills as Array<Record<string, unknown>>).map((s) => ({ id: String(s.id ?? ""), name: String(s.name ?? "") }));
  const tags = Array.from(new Set((card.skills as Array<Record<string, unknown>>).flatMap((s) => (Array.isArray(s.tags) ? (s.tags as string[]) : []))));
  const entry = cleanEntry({
    name: card.name,
    url: origin,
    cardUrl: `${origin}/.well-known/agent-card.json`,
    a2aUrl: typeof card.url === "string" ? card.url : `${origin}/api/a2a`,
    description: String(card.description ?? ""),
    skills,
    tags,
    addedAt: new Date().toISOString(),
  }) as RegistryEntry | null;

  if (!entry) return NextResponse.json({ error: "The Agent Card was missing a name or URL." }, { status: 422 });

  const { persisted, durable } = await upsertEntry(entry);
  return NextResponse.json({ entry, persisted, durable, total: (await readRegistryAsync()).length });
}
