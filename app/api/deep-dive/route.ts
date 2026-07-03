// ─────────────────────────────────────────────────────────────────────────────
// POST /api/deep-dive — the node GENERATES a deep dive from a source the owner enters (a URL),
// then saves it to the knowledge-graph + skill store. OWNER-GATED (x-portfolio-owner → 403).
//
// Pipeline: fetch the source text (bounded, SSRF-guarded) → one LLM pass distills a plain-language
// digest + a knowledge graph (nodes/edges) + skills, grounded ONLY in the fetched text → the SAME
// grounding gate the inbound pipeline uses (normalizeArtifact: drops dangling edges + skills with no
// honest limits, requires a real source) → persist durably (ingestArtifact → the Deep Dives feed).
//
// This makes the node self-sufficient: it can build its OWN deep dives, not only receive super-u's
// (docs/DEEPEN-PIPELINE.md). Both producers write one store; `producedBy` distinguishes them.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { resolveLlm } from "@/lib/llm";
import { chatWithFailover } from "@/lib/llm-complete";
import { fetchSourceText } from "@/lib/source-fetch";
import { readDeepenAsync, ingestArtifact } from "@/lib/deepen";
import { normalizeArtifact, parseLooseJson, artifactStats } from "@core/deepen-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM =
  "You distill a single source into a KNOWLEDGE GRAPH and a set of SKILLS for a personal knowledge base. " +
  "Ground EVERYTHING strictly in the provided source text — never invent facts, nodes, or skills not supported by it. " +
  "A 'skill' is a reusable capability the reader could apply; each MUST include an honest `notGoodAt` (its real limits) " +
  "or it will be discarded. Output STRICT JSON only (no prose, no code fence) with this exact shape:\n" +
  '{"digest":"3-5 plain-language sentences that teach the core idea",' +
  '"graph":{"title":"...","nodes":[{"id":"kebab-id","type":"concept|method|tool|person","name":"...","summary":"one line"}],' +
  '"edges":[{"source":"node-id","target":"node-id","type":"uses|enables|contrasts|part-of"}]},' +
  '"skills":[{"id":"kebab-id","name":"...","oneLine":"...","mechanism":"how it works","characteristicMove":"the non-obvious expert move",' +
  '"goodAt":["..."],"notGoodAt":["the honest limits"],"useWhen":["..."],"kind":"skill|plugin|workflow|hook"}]}';

export async function POST(req: NextRequest) {
  const rl = rateLimit(`deep-dive:${clientKey(req)}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  // Writing to the owner's knowledge base is owner-only.
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Only the owner can run a deep dive (it writes to the knowledge base)." }, { status: 403 });
  }
  if (!resolveLlm()) {
    return NextResponse.json({ error: "No LLM configured — set a free LLM key (GROQ/GEMINI/…) to generate deep dives." }, { status: 503 });
  }

  let source = "";
  let kind = "source";
  try {
    const body = (await req.json()) as { source?: unknown; url?: unknown; kind?: unknown };
    source = String(body.source ?? body.url ?? "").trim();
    kind = String(body.kind ?? "").trim() || "source";
  } catch {
    return NextResponse.json({ error: "Send { source: \"<a source URL>\" }." }, { status: 400 });
  }
  if (!source) return NextResponse.json({ error: "Enter a source URL (a repo, a paper, an article)." }, { status: 400 });

  // 1) Fetch the source (grounded — a real, fetchable URL, per the node's honesty rule).
  const fetched = await fetchSourceText(source);
  if (!fetched.ok) return NextResponse.json({ error: fetched.error ?? "Couldn't read that source." }, { status: 422 });

  // 2) Distill with the LLM (survival-chain failover), grounded in the fetched text only.
  let out = "";
  try {
    const res = await chatWithFailover(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `SOURCE TITLE: ${fetched.title}\nSOURCE URL: ${source}\n\nSOURCE TEXT:\n${fetched.text}` },
      ],
      { temperature: 0.2 },
    );
    out = res.text ?? "";
  } catch (e) {
    return NextResponse.json({ error: `The model couldn't distill this source: ${(e as Error).message}` }, { status: 502 });
  }

  const parsed = parseLooseJson(out);
  if (!parsed) return NextResponse.json({ error: "The model didn't return usable JSON. Try again." }, { status: 502 });

  // 3) Ground it through the SAME gate as inbound artifacts (dangling edges + limitless skills dropped).
  const graph = (parsed.graph && typeof parsed.graph === "object" ? parsed.graph : {}) as Record<string, unknown>;
  const artifact = normalizeArtifact({
    source: { title: fetched.title || source, kind, url: source, discoveredVia: "deep dive (on-page generator)" },
    digest: parsed.digest,
    graph: { title: (graph.title as string) || fetched.title, nodes: graph.nodes, edges: graph.edges, graphUrl: "" },
    skills: parsed.skills,
    producedBy: "deep-dive",
    generatedAt: new Date().toISOString(),
  });
  if (!artifact) {
    return NextResponse.json({ error: "The distilled result wasn't groundable (no graph/skills survived the honesty gate). Try a richer source." }, { status: 422 });
  }

  // 4) Save to the knowledge base (durable feed).
  const { persisted, durable } = await ingestArtifact(artifact);
  const s = artifactStats(artifact);
  return NextResponse.json({
    ok: persisted,
    durable,
    artifact,
    stats: s,
    total: (await readDeepenAsync()).artifacts.length,
    note: durable ? undefined : "Generated but not persisted — no durable store (set POSTGRES_URL).",
  });
}
