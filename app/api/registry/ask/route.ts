// ─────────────────────────────────────────────────────────────────────────────
// /api/registry/ask — FEDERATED SEARCH (the A2A fan-out; STRATEGY.md feature #4).
// POST {q} → index-search the registry for the top-matching nodes, then query each
// node's LIVE A2A agent (JSON-RPC message/send) in parallel and return their grounded
// answers. This is the 10x over index-search: the network answers, not just lists.
//
// Expensive (N downstream LLM calls) + open → rate-limited, with a per-node timeout so
// one slow/dead node can't hang the whole fan-out.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { readRegistryAsync, searchRegistry, type RegistryEntry } from "@/lib/registry";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_NODE_TIMEOUT_MS = 15000;

// Ask one node's A2A agent the question; return its answer text or an error.
async function askNode(node: RegistryEntry, q: string): Promise<{ handle: string; name: string; url: string; ok: boolean; answer: string }> {
  const base = { handle: node.handle, name: node.name, url: node.url };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PER_NODE_TIMEOUT_MS);
    const res = await fetch(node.a2aUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "fed",
        method: "message/send",
        params: { message: { role: "user", parts: [{ kind: "text", text: q }], metadata: { skill: "ask_candidate" } } },
      }),
    });
    clearTimeout(t);
    const data = await res.json();
    if (data?.error) return { ...base, ok: false, answer: `agent error: ${data.error.message ?? data.error.code}` };
    const text = data?.result?.status?.message?.parts?.[0]?.text ?? data?.result?.artifacts?.[0]?.parts?.[0]?.text ?? "";
    return { ...base, ok: Boolean(text), answer: String(text).slice(0, 1200) || "(no answer)" };
  } catch (e) {
    const msg = (e as Error).name === "AbortError" ? "timed out" : (e as Error).message;
    return { ...base, ok: false, answer: `unreachable: ${msg}` };
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`fedask:${clientKey(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let q = "";
  let limit = 3;
  try {
    const body = await req.json();
    q = String(body?.q ?? "").trim();
    if (typeof body?.limit === "number") limit = Math.min(5, Math.max(1, body.limit));
  } catch {
    return NextResponse.json({ error: "Send { q: <question> }." }, { status: 400 });
  }
  if (!q) return NextResponse.json({ error: "Ask a question." }, { status: 400 });

  const all = await readRegistryAsync();
  const top = searchRegistry(all, q).slice(0, limit);
  // If nothing matched the index, fan out to the most recent few anyway.
  const targets = top.length ? top : all.slice(0, limit);
  if (targets.length === 0) return NextResponse.json({ q, nodes: [], note: "No nodes in the registry yet." });

  const nodes = await Promise.all(targets.map((n) => askNode(n, q)));
  return NextResponse.json({ q, asked: nodes.length, nodes });
}
