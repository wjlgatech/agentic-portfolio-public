// ─────────────────────────────────────────────────────────────────────────────
// /api/a2a — the A2A (Agent2Agent) JSON-RPC 2.0 endpoint. Recruiter / other AI
// agents discover this via the Agent Card (/.well-known/agent-card.json) and POST
// JSON-RPC here. Pragmatic-sync: handles `message/send` (and legacy `tasks/send`)
// as a synchronous request→response (no streaming) for maximum client reliability.
//
// Every answer is GROUNDED + HONEST: only the portfolio evidence + the Receipts
// verified claims; private projects → highlight only; unprovable claims → "unverified".
// The LLM key stays server-side (lib/llm.ts), like /api/copilotkit.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { resolveLlm } from "@/lib/llm";
import { chatWithFailover } from "@/lib/llm-complete";
import { readVerification } from "@/lib/verification";
import { profile, mission, values } from "@/content/profile";
import projectsData from "@/content/projects.json";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { resolveInstance } from "@/lib/instance-resolve";
import { instanceEvidence, instanceStaticAnswer } from "@core/instance-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Project = { name: string; category: string; highlight: string; private: boolean; language: string | null; url: string | null; featured?: boolean };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const SEND_METHODS = new Set(["message/send", "tasks/send", "message/stream", "tasks/sendSubscribe"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { headers: CORS });
}

// Pull the user text out of whatever message shape the caller sent.
function extractText(params: Record<string, unknown>): string {
  const m = (params?.message ?? params) as Record<string, unknown> | string;
  if (typeof m === "string") return m;
  const parts = (m as Record<string, unknown>)?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p) => String((p as Record<string, unknown>)?.text ?? (p as Record<string, unknown>)?.content ?? "")).filter(Boolean).join("\n");
  }
  const t = (m as Record<string, unknown>)?.text;
  return typeof t === "string" ? t : "";
}

function skillHint(params: Record<string, unknown>): string {
  const meta = ((params?.metadata as Record<string, unknown>) ?? (params?.message as Record<string, unknown>)?.metadata ?? {}) as Record<string, unknown>;
  return String(meta?.skill ?? params?.skill ?? "ask_candidate");
}

// Kept lean on purpose: a recruiter agent may fire several calls/minute, and free-tier
// LLMs have tight TPM limits (Groq's free tier ~12k/min). ~12k chars ≈ ~3k tokens.
function buildEvidence(): string {
  const projects = projectsData as Project[];
  const verified = readVerification().claims.map((c) => ({ claim: c.claim, verdict: c.verdict }));
  return JSON.stringify({
    candidate: { name: profile.name, tagline: profile.tagline, blurb: profile.blurb, location: profile.location, links: profile.links },
    mission,
    values: values.map((v) => v.title),
    projects: projects.map((p) => ({ name: p.name, category: p.category, highlight: p.highlight.slice(0, 120), private: p.private, language: p.language, url: p.url })),
    verifiedClaims: verified, // from the Receipts self-proof — the honest evidence base
  }).slice(0, 12000);
}

function systemPrompt(skill: string, name: string): string {
  const base =
    `You are the agent representing ${name}, replying to ANOTHER AI agent over the A2A protocol. ` +
    `Answer ONLY from the EVIDENCE provided. Rules: private items (private:true) — share the high-level ` +
    `highlight only, never internals or links. If a claim is not supported by the evidence, say ` +
    `"unverified — needs an external source" rather than guess. Be concise and structured; the reader is a machine. ` +
    `Never invent offerings, metrics, employers, outcomes, or links.`;
  if (skill === "verify_claim")
    return base + ` TASK: verify the claim. Reply with one line "VERDICT: corroborated|partial|unverified|contradicted" then 1-2 evidence citations (project names).`;
  if (skill === "role_fit")
    return base + ` TASK: assess fit for the role. List MATCHED strengths (each with an evidence citation) and the HONEST gaps. End with "FIT: strong|partial|weak|unverifiable".`;
  return base;
}

// No-LLM fallback: still give the calling agent something grounded + useful.
function staticAnswer(): string {
  const projects = (projectsData as Project[]).filter((p) => p.featured !== false).slice(0, 8);
  const list = projects.map((p) => `- ${p.name} (${p.category}${p.language ? `, ${p.language}` : ""}): ${p.highlight}`).join("\n");
  return `${profile.name} — ${profile.tagline}.\n${profile.blurb}\n\nSelected work:\n${list}\n\n(Note: this endpoint's LLM is not configured, so this is a static summary. For grounded Q&A, the operator should set a free LLM key.)`;
}

// Answer AS the active instance. For the portfolio (default) this is the original path
// (name=profile.name, evidence=buildEvidence(), static=staticAnswer()) — byte-identical. A
// non-portfolio instance that declares `content` answers from ITS corpus instead.
async function answer(text: string, skill: string, ctx: { name: string; evidence: string; staticFallback: string }): Promise<string> {
  if (!resolveLlm()) return ctx.staticFallback; // no key at all → static grounded summary
  // chatWithFailover survives a throttled provider by skipping to the next in the chain.
  const { text: out } = await chatWithFailover(
    [
      { role: "system", content: systemPrompt(skill, ctx.name) },
      { role: "user", content: `EVIDENCE:\n${ctx.evidence}\n\n———\nINCOMING (skill: ${skill}):\n${text}` },
    ],
    { temperature: 0.3 },
  );
  return out || "(no answer)";
}

export async function POST(req: NextRequest) {
  // Open + LLM-backed → rate-limit per IP so it can't be used to drain the LLM quota.
  const rl = rateLimit(`a2a:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return rpcError(null, -32005, `Rate limit exceeded. Try again in ${rl.retryAfter}s.`);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error: body is not valid JSON.");
  }
  const { id, method, params } = body as { id?: unknown; method?: string; params?: Record<string, unknown> };
  if (body.jsonrpc !== "2.0" || typeof method !== "string") {
    return rpcError(id, -32600, "Invalid Request: expected JSON-RPC 2.0 with a method.");
  }

  if (!SEND_METHODS.has(method)) {
    // tasks/get, tasks/cancel, push-notification config, etc. aren't supported in sync v1.
    return rpcError(id, -32601, `Method "${method}" not supported. This is a synchronous A2A endpoint; use message/send (or tasks/send).`);
  }
  // Streaming variants: we advertise streaming:false, so answer synchronously anyway
  // but tell the caller it wasn't streamed.
  const streamed = method === "message/stream" || method === "tasks/sendSubscribe";

  const p = (params ?? {}) as Record<string, unknown>;
  const text = extractText(p).slice(0, 4000);
  if (!text) return rpcError(id, -32602, "Invalid params: no message text found.");
  const skill = skillHint(p);

  // Answer as the resolved config: the deploy's active instance, OR a hosted portfolio (`?slug=`
  // via the /p/<slug>/api/a2a rewrite) answering from ITS OWN material. The portfolio keeps
  // reading content/profile.ts + projects.json (pack=null → original path).
  const { config: inst } = await resolveInstance(req);
  const pack = inst.slug !== "portfolio" && inst.content ? inst : null;
  const ctx = pack
    ? { name: pack.entity.name, evidence: instanceEvidence(pack), staticFallback: instanceStaticAnswer(pack) }
    : { name: profile.name, evidence: buildEvidence(), staticFallback: staticAnswer() };

  let out: string;
  try {
    out = await answer(text, skill, ctx);
  } catch (e) {
    return rpcError(id, -32603, `Internal error generating answer: ${(e as Error).message}`);
  }

  const now = new Date().toISOString();
  const taskId = String((p.message as Record<string, unknown>)?.taskId ?? globalThis.crypto.randomUUID());
  const contextId = String((p.message as Record<string, unknown>)?.contextId ?? globalThis.crypto.randomUUID());
  const agentMessage = {
    role: "agent",
    parts: [{ kind: "text", text: streamed ? out + "\n\n(Note: returned as a single sync response; this endpoint does not stream.)" : out }],
    messageId: globalThis.crypto.randomUUID(),
    kind: "message",
  };
  const task = {
    id: taskId,
    contextId,
    kind: "task",
    status: { state: "completed", timestamp: now, message: agentMessage },
    artifacts: [{ artifactId: globalThis.crypto.randomUUID(), name: "answer", parts: [{ kind: "text", text: out }] }],
    history: [agentMessage],
  };

  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result: task }, { headers: CORS });
}
