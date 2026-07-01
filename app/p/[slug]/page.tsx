// ─────────────────────────────────────────────────────────────────────────────
// /p/[slug] — a hosted portfolio made with the Maker. Reads the person's InstanceConfig from
// the shared KV and renders it as a real agentic site (on-page agent grounded in their material),
// with the creator credit + network invite on every page. No fork, no deploy — 1-click hosting on
// the shared network. Its own theme via a data-theme wrapper (this page isn't the switchable
// primary instance, so a fixed brand is correct here).
// ─────────────────────────────────────────────────────────────────────────────
import { notFound } from "next/navigation";
import { CopilotProvider } from "@/components/Copilot";
import { InstanceSite } from "@/components/InstanceSite";
import { InstanceAgentActions } from "@/components/InstanceAgentActions";
import { kvGetJSON } from "@/lib/storage";
import { validateInstance, instanceEvidence, type InstanceConfig } from "@core/instance-types";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<InstanceConfig | null> {
  const raw = await kvGetJSON<unknown>(`portfolio:${slug}`);
  if (!raw) return null;
  const { ok, config } = validateInstance(raw);
  return ok && config ? config : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) return { title: "Portfolio not found" };
  const title = `${c.entity.name} — ${c.entity.tagline}`;
  return { title, description: c.entity.blurb || c.entity.tagline, openGraph: { title } };
}

export default async function HostedPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) notFound();

  return (
    <CopilotProvider
      context={instanceEvidence(c, 120000)}
      groundingDescription={`${c.entity.name}'s portfolio. ${c.agent.grounding} Answer ONLY from this; never invent facts.`}
      labels={{ title: `Ask ${c.entity.name}`, initial: `Hi — I'm ${c.entity.name}'s agent. ${c.entity.tagline}. Ask me anything (I answer only from real material).` }}
      starters={[
        { label: "🔎 About", prompt: `Tell me about ${c.entity.name}.` },
        { label: "🤔 A fit?", prompt: "I'm hiring for <role> — are they a fit? Be honest." },
        { label: "📇 Contact", prompt: "How do I reach them?" },
      ]}
      agentActions={<InstanceAgentActions instanceName={c.entity.name} siteUrl={c.entity.links?.site} />}
    >
      <div data-theme={c.theme} className="min-h-screen bg-surface text-ink">
        <InstanceSite config={c} />
      </div>
    </CopilotProvider>
  );
}
