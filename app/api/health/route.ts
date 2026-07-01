// ─────────────────────────────────────────────────────────────────────────────
// /api/health — lightweight liveness + config probe (the observability gap from
// docs/STRATEGY.md). No secrets: reports which provider classes are configured
// (booleans only), whether owner-gating is on, and the LLM-ready flag. Use it for
// uptime checks and to confirm a deploy picked up its env (the token-rotation bug
// would've been caught here).
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { resolveLlmChain } from "@/lib/llm";
import { ownerTokenConfigured } from "@/lib/owner";
import { kvConfigured } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const chain = resolveLlmChain();
  return NextResponse.json(
    {
      ok: true,
      llmReady: chain.length > 0,
      providers: chain.map((p) => p.provider), // names only, never keys
      ownerGated: ownerTokenConfigured(),
      durableStorage: kvConfigured(), // KV configured → registry joins + edits persist + are shared
      scoutSecretSet: Boolean(process.env.SCOUT_SECRET),
      githubTokenSet: Boolean(process.env.GITHUB_TOKEN),
      ts: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
