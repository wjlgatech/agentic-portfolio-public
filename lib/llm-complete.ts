// ─────────────────────────────────────────────────────────────────────────────
// lib/llm-complete.ts — a non-streaming chat completion that ACTUALLY survives the
// survival chain: it tries each configured provider in order and falls over to the
// next on any error (a 429 daily/per-minute throttle, a 413 too-large, a network
// blip). This is what makes the free-LLM setup "stable, reliable" for server routes
// like /api/a2a — a throttled Groq auto-skips to Gemini instead of failing the call.
//
// (The CopilotKit chat route can't use this — it needs a single streaming adapter —
// but every JSON/structured server route should.)
// ─────────────────────────────────────────────────────────────────────────────
import OpenAI from "openai";
import { resolveLlmChain } from "@/lib/llm";

export type ChatResult = { text: string; provider: string; model: string };

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatWithFailover(
  messages: ChatMessage[],
  opts: { temperature?: number; jsonMode?: boolean } = {},
): Promise<ChatResult> {
  const chain = resolveLlmChain();
  if (chain.length === 0) throw new Error("No LLM key configured.");

  let lastErr: unknown = null;
  for (const llm of chain) {
    try {
      const openai = new OpenAI({ apiKey: llm.apiKey, baseURL: llm.baseURL });
      const base = { model: llm.model, messages, temperature: opts.temperature ?? 0.3 } as Parameters<typeof openai.chat.completions.create>[0];
      let r;
      try {
        r = await openai.chat.completions.create(opts.jsonMode ? { ...base, response_format: { type: "json_object" } } : base);
      } catch (e) {
        // Some providers reject response_format — retry once without it before failing over.
        if (opts.jsonMode) r = await openai.chat.completions.create(base);
        else throw e;
      }
      const text = (r as { choices: { message?: { content?: string } }[] }).choices[0]?.message?.content?.trim() || "";
      if (text) return { text, provider: llm.provider, model: llm.model };
      lastErr = new Error("empty response");
    } catch (e) {
      lastErr = e; // throttled / errored — try the next provider in the chain
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All providers in the chain failed.");
}
