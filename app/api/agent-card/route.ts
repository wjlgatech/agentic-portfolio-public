// ─────────────────────────────────────────────────────────────────────────────
// /api/agent-card — the A2A (Agent2Agent) Agent Card. Served (via next.config.mjs
// rewrites) at /.well-known/agent-card.json AND the legacy /.well-known/agent.json,
// so recruiter / other AI agents can DISCOVER this agent and talk to it.
//
// INSTANCE-AWARE: the card is built from the ACTIVE InstanceConfig (content/instances,
// selected by the INSTANCE env var). So a learning-center deploy advertises learning-center
// skills, a portfolio deploy advertises portfolio skills — same code, zero vertical branches.
// This is the Agentize federation stud: any business is instantly agent-discoverable.
//
// Pragmatic-sync profile: capabilities.streaming = false; the JSON-RPC endpoint is
// /api/a2a (message/send + legacy tasks/send), synchronous request→response.
// Spec: https://agent2agent.info  (Agent Card fields grounded against the spec.)
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { resolveLlm } from "@/lib/llm";
import { instanceToAgentCard } from "@core/instance-types";
import { getActiveInstance } from "@/content/instances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const llmReady = Boolean(resolveLlm());

  // The card for whichever business this deploy is. instanceToAgentCard() emits the spec
  // shape (name/url/skills/capabilities:streaming-false/auth:none); we add the non-standard
  // x-llm-ready hint so a caller knows whether grounded answers are live on /api/a2a.
  const card = { ...instanceToAgentCard(getActiveInstance(), origin), "x-llm-ready": llmReady };

  return NextResponse.json(card, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
  });
}
