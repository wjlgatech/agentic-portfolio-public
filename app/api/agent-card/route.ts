// ─────────────────────────────────────────────────────────────────────────────
// /api/agent-card — the A2A (Agent2Agent) Agent Card. Served (via next.config.mjs
// rewrites) at /.well-known/agent-card.json AND the legacy /.well-known/agent.json,
// so recruiter / other AI agents can DISCOVER this agent and talk to it.
//
// CONFIG-AWARE: the card is built from the resolved config — the deploy's active instance by
// default, OR a hosted portfolio (`?slug=`, via the /p/<slug>/.well-known rewrite) so every
// /p/<slug> node is instantly agent-discoverable at its OWN well-known path.
//
// Pragmatic-sync profile: capabilities.streaming = false; the JSON-RPC endpoint is
// /api/a2a (message/send + legacy tasks/send), synchronous request→response.
// Spec: https://agent2agent.info  (Agent Card fields grounded against the spec.)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { resolveLlm } from "@/lib/llm";
import { instanceToAgentCard } from "@core/instance-types";
import { resolveInstance } from "@/lib/instance-resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { config, base } = await resolveInstance(req);
  const llmReady = Boolean(resolveLlm());

  // `base` is the URL root — origin, or /p/<slug> for a hosted portfolio — so a hosted card
  // points at /p/<slug>/api/a2a. The non-standard x-llm-ready hint = are grounded answers live.
  const card = { ...instanceToAgentCard(config, base), "x-llm-ready": llmReady };

  return NextResponse.json(card, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
  });
}
