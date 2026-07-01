// ─────────────────────────────────────────────────────────────────────────────
// /api/ingest-knowledge — the "deepen" INBOUND endpoint: the ONE new surface this node
// exposes for the deepen pipeline (docs/DEEPEN-PIPELINE.md). super-u's flywheel
// (POST /creator/transform → kgfy + skillfy) POSTs the distilled artifact here; the node
// validates + grounds it, persists it durably, and surfaces it in the Deep Dives section.
//
// The node is a SINK, not the orchestrator: it does NOT fetch sources, build the graph, or
// forge skills — it receives super-u's output. So this is a WRITE surface → it must be
// authenticated like /api/scout: owner token (x-portfolio-owner) OR a pipeline secret
// (x-ingest-secret == INGEST_SECRET), so super-u can call it headless without the owner token.
//
// GET is public (read the feed, for the page / other agents); POST is gated + rate-limited.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { readDeepenAsync, ingestArtifact, normalizeArtifact, artifactStats } from "@/lib/deepen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (isOwnerRequest(req)) return true;
  const secret = process.env.INGEST_SECRET;
  return Boolean(secret) && req.headers.get("x-ingest-secret") === secret;
}

export async function GET() {
  const feed = await readDeepenAsync();
  return NextResponse.json(feed, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(req: NextRequest) {
  // Gated write surface, but still rate-limited per IP as defense in depth.
  const rl = rateLimit(`ingest:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  if (!authorized(req)) {
    return NextResponse.json({ error: "Not authorized. Owner token or x-ingest-secret required (this is a write surface for the deepen pipeline)." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the distilled artifact JSON: { source:{title,kind,url,discoveredVia}, digest, graph:{nodes,edges,graphUrl}, skills:[…] }." }, { status: 400 });
  }

  // The node REFUSES ungrounded knowledge: normalizeArtifact returns null without a real,
  // fetchable source url + title, drops dangling edges, and drops "skills" with no honest limits.
  const artifact = normalizeArtifact(body);
  if (!artifact) {
    return NextResponse.json(
      { error: "Ungrounded artifact rejected: it needs a source.title and a real http(s) source.url (the fetchable GitHub/arXiv source — not a login-walled pointer)." },
      { status: 422 },
    );
  }

  const { persisted, durable } = await ingestArtifact(artifact);
  return NextResponse.json({ ok: true, id: artifact.id, stats: artifactStats(artifact), persisted, durable });
}
