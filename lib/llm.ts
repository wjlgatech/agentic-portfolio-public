// ─────────────────────────────────────────────────────────────────────────────
// lib/llm.ts — the free-LLM survival chain (per the /free-llm skill).
// Every provider exposes an OpenAI-compatible endpoint, so one code path serves all.
// The key lives ONLY here (server-side). It is never shipped to the browser.
//
// TWO hard constraints, both learned the hard way, decide the model + order below:
//
//  1. TOOL-CALLING. The on-page agent drives the page via CopilotKit *actions*
//     (OpenAI tools). A model that can't emit structured `tool_calls` (e.g.
//     `meta/llama-3.3-70b-instruct` on NIM, which returns the call as plain text)
//     makes `/api/copilotkit` 400 and the chat goes silent.
//
//  2. CLEAN CONTENT STREAMING. CopilotKit's OpenAIAdapter renders `delta.content`.
//     *Reasoning* models (e.g. `openai/gpt-oss-120b`) stream their thinking as
//     `delta.reasoning_content` with empty content — the call returns 200 but the
//     UI shows NOTHING. So the model must stream normal content, not reasoning deltas.
//
// Verified to satisfy BOTH: Groq `llama-3.3-70b-versatile` (fast, clean, tools) and
// Gemini `gemini-2.5-flash`. NVIDIA NIM's tool-capable frontier models are mostly
// reasoning-class (constraint 2), so NIM sits *below* Groq/Gemini here even though the
// generic /free-llm default is NIM-first — for a CopilotKit chat UI, clean streaming
// wins. Override any model with GROQ_MODEL / GEMINI_MODEL / NIM_MODEL / OPENAI_MODEL.
// ─────────────────────────────────────────────────────────────────────────────

export type LlmProvider = {
  provider: "groq" | "gemini" | "nvidia-nim" | "openai";
  baseURL?: string;
  apiKey: string;
  model: string;
};

// The FULL survival chain — every configured provider, in order. The point of a
// survival chain is to survive a throttle, so non-streaming callers should iterate
// this with chatWithFailover() (lib/llm-complete.ts) rather than pin one provider.
export function resolveLlmChain(): LlmProvider[] {
  const chain: LlmProvider[] = [];
  // 1) Groq — fastest, clean content streaming, solid tool-calling. Best for the chat UI.
  if (process.env.GROQ_API_KEY) {
    chain.push({ provider: "groq", baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" });
  }
  // 2) Google Gemini — biggest free daily quota; clean content + tools.
  if (process.env.GEMINI_API_KEY) {
    chain.push({ provider: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
  }
  // 3) NVIDIA NIM — frontier-model variety, but its tool-capable models are reasoning-
  //    class and may not render in CopilotKit (see constraint 2). Override NIM_MODEL
  //    with a non-reasoning tool model if you must lead with NIM.
  if (process.env.NVIDIA_API_KEY) {
    chain.push({ provider: "nvidia-nim", baseURL: "https://integrate.api.nvidia.com/v1", apiKey: process.env.NVIDIA_API_KEY, model: process.env.NIM_MODEL || "openai/gpt-oss-120b" });
  }
  // 4) OpenAI — paid fallback (gpt-4o-mini supports tools + clean streaming).
  if (process.env.OPENAI_API_KEY) {
    chain.push({ provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini" });
  }
  return chain;
}

// The first available provider — used where one pinned provider is required (e.g. the
// CopilotKit streaming adapter). Returns null if no key is set.
export function resolveLlm(): LlmProvider | null {
  return resolveLlmChain()[0] ?? null;
}
