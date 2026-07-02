// ─────────────────────────────────────────────────────────────────────────────
// /llms.txt — the LLM sitemap (the robots.txt-for-LLMs standard), built from the ACTIVE
// instance so every instance deploy is discoverable by AI answer engines + agents. Text/plain,
// grounded in the InstanceConfig only (no fabrication). This is the GEO surface a GEO audit
// flags as missing; serving it lifts the agent-search score.
// ─────────────────────────────────────────────────────────────────────────────
import { getActiveInstance } from "@/content/instances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const c = getActiveInstance();
  const site = c.entity.links?.site ?? "";
  const content = c.content ?? { offerings: [], outcomes: [], writings: [] };

  const lines: string[] = [`# ${c.entity.name}`, "", `> ${c.entity.tagline}`, ""];
  if (c.entity.blurb) lines.push(c.entity.blurb, "");
  if (c.story.mission) lines.push(`## Mission`, c.story.mission, "");

  if (content.offerings.length) {
    lines.push(`## What we offer`);
    for (const o of content.offerings) lines.push(`- **${o.name}**${o.category ? ` (${o.category})` : ""}: ${o.summary || ""}${o.url ? ` — ${o.url}` : ""}`);
    lines.push("");
  }
  if (content.outcomes.length) {
    lines.push(`## Proof (honest — 'unverified' = claimed, not independently audited)`);
    for (const o of content.outcomes) lines.push(`- [${o.verdict}] ${o.claim}`);
    lines.push("");
  }
  lines.push(`## Talk to our agent`, `- A2A agent card: /.well-known/agent-card.json`, `- Ask it: ${c.agent.skills.map((s) => s.name).join(", ")}`, "");
  if (site) lines.push(`## More`, `- Website: ${site}`, "");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
