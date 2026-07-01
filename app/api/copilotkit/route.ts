// ─────────────────────────────────────────────────────────────────────────────
// CopilotKit runtime endpoint — the agentic brain of the portfolio.
// Backed by the free-LLM survival chain (lib/llm.ts). The model answers grounded
// in the profile + projects the page exposes via useCopilotReadable.
//
// FAILOVER: the chat request is large (grounding context + ~12 action/tool schemas
// + history), so a single message can trip a free provider's per-minute / daily
// token limit. The streaming adapter pins ONE provider, so we wrap it: try each
// provider in the chain, and if one throws at stream-init (e.g. a 429/413), rebuild
// the adapter with the next. Groq is fast but free-throttled; Gemini's free quota is
// far larger, so it's the natural catch. The key never leaves the server.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { resolveLlmChain } from "@/lib/llm";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  // Open + the most expensive (big context per turn) → rate-limit per IP so it can't
  // be used to drain the free LLM quota.
  const rl = rateLimit(`chat:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many messages — please wait ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // Order matters for the CHAT specifically. The copilot request is large (grounding
  // context + ~12 tool schemas + history ≈ several thousand tokens EACH), and a 429
  // from a provider surfaces MID-STREAM (after handleRequest already returned a 200),
  // which the failover loop below can't catch. So lead with the provider that has the
  // largest free DAILY budget — Gemini (huge) — not Groq (free cap is only ~100k
  // tokens/day, which a dozen chat turns exhausts). Groq/NIM/OpenAI stay as fallbacks.
  const all = resolveLlmChain();
  const chain = [...all.filter((p) => p.provider === "gemini"), ...all.filter((p) => p.provider !== "gemini")];
  if (chain.length === 0) {
    return NextResponse.json(
      {
        error:
          "No LLM key configured. Set GROQ_API_KEY (free, console.groq.com), " +
          "GEMINI_API_KEY (aistudio.google.com), NVIDIA_API_KEY, or OPENAI_API_KEY to enable the copilot.",
      },
      { status: 503 },
    );
  }

  // Read the body once so we can replay the request against each provider on failover.
  const bodyText = await req.text();
  const headers = new Headers(req.headers);
  headers.delete("content-length"); // recomputed per reconstructed request

  let lastErr: unknown = null;
  for (const llm of chain) {
    try {
      const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
      const serviceAdapter = new OpenAIAdapter({ openai, model: llm.model });
      const copilotRuntime = new CopilotRuntime();
      const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime: copilotRuntime,
        serviceAdapter,
        endpoint: "/api/copilotkit",
      });
      const replay = new NextRequest(req.url, { method: "POST", headers, body: bodyText });
      const res = await handleRequest(replay);
      // A 5xx means the runtime itself failed — try the next provider rather than
      // hand the user a dead response.
      if (res.status >= 500) {
        lastErr = new Error(`runtime returned ${res.status}`);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e; // provider threw at stream-init (throttle/network) — fail over
    }
  }

  return NextResponse.json(
    { error: `All LLM providers failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}` },
    { status: 503 },
  );
};
