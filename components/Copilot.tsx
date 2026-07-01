"use client";

import { CopilotKit, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { VoiceInput } from "@/lib/voice";
import { PromptStarters, type Starter } from "@/components/PromptStarters";

const PORTFOLIO_GROUNDING =
  "Paul Jialiang Wu's portfolio knowledge base: his profile, mission, values, " +
  "what he loves, the 12X Future Practices, and his catalog of projects (public " +
  "and private). Answer ONLY from this. For PRIVATE projects, share the high-level " +
  "highlight and note that internals are private — never invent details or IP.";

const PORTFOLIO_LABELS = {
  title: "Ask Paul's Portfolio Agent",
  initial:
    "Hi — I'm Paul's portfolio agent, powered by a free LLM. Ask me anything " +
    "(try “What are his flagship agentic-OS projects?” or “Explain practice #12.”).\n\n" +
    "Curious what else I can do? Just ask **“what can you do?”** — the owner can " +
    "also tell me to add articles, reorder/hide/rename sections, or switch the theme.",
};

// Registers the active instance's grounding context with the agent. Must live inside
// <CopilotKit>, hence its own tiny client component. The description defaults to the
// portfolio's; a non-portfolio instance passes its own.
function Grounding({ context, description }: { context: string; description?: string }) {
  useCopilotReadable({ description: description ?? PORTFOLIO_GROUNDING, value: context });
  return null;
}

export function CopilotProvider({
  context,
  children,
  labels,
  groundingDescription,
  starters,
  agentActions,
}: {
  context: string;
  children: React.ReactNode;
  labels?: { title: string; initial: string };
  groundingDescription?: string;
  starters?: Starter[];
  agentActions?: React.ReactNode; // extra copilot actions (e.g. an instance's captureLead/viewLeads)
}) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <Grounding context={context} description={groundingDescription} />
      {agentActions}
      {children}
      <CopilotSidebar defaultOpen={false} clickOutsideToClose labels={labels ?? PORTFOLIO_LABELS} />
      {/* Reusable voice input: a mic in the chat bar. Speak instead of type. */}
      <VoiceInput targetSelector=".copilotKitInput textarea, textarea[placeholder='Type a message...']" />
      {/* 1-click example prompts that show what the agent can do (fill, customize, send). */}
      <PromptStarters items={starters} />
    </CopilotKit>
  );
}
