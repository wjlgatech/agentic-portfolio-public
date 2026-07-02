"use client";

// ─────────────────────────────────────────────────────────────────────────────
// InstanceAgentActions — turns a non-portfolio instance's agent from a chatbot into an agent
// that DOES WORK. Registered inside <CopilotKit> for the instance path. Three actions embody the
// owner↔visitor split:
//   • captureLead / bookDemo  → VISITOR: the agent captures the prospect's interest as a durable
//     lead (no form) and hands off to a demo. This is the business's core job, done in chat.
//   • viewLeads               → OWNER: read the pipeline the agent generated. The payoff that
//     turns "nice demo" into "this makes me money 24/7."
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

// Owner token is scoped PER portfolio (a maker owns their page, not everyone's).
const tokenKey = (slug?: string) => (slug ? `portfolio-owner:${slug}` : "portfolio-owner-token");

export function InstanceAgentActions({ instanceName, siteUrl, slug }: { instanceName: string; siteUrl?: string; slug?: string }) {
  // Let the owner unlock by opening THEIR portfolio once with ?owner=<token> (persist it locally, per slug).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("owner");
      if (t) localStorage.setItem(tokenKey(slug), t);
    } catch { /* ignore */ }
  }, [slug]);

  useCopilotAction({
    name: "captureLead",
    description:
      `Capture a qualified lead for ${instanceName}. Call this once you have the visitor's EMAIL ` +
      "(and ideally their name, company, and what they need). This does REAL work — it saves the lead " +
      "to the owner's pipeline. Confirm to the visitor that a human will follow up. Only call it with a " +
      "real email the visitor gave you; never invent one.",
    parameters: [
      { name: "email", type: "string", description: "The visitor's email (required)", required: true },
      { name: "name", type: "string", description: "Their name", required: false },
      { name: "company", type: "string", description: "Their company", required: false },
      { name: "need", type: "string", description: "What they're trying to solve", required: false },
    ],
    handler: async ({ email, name, company, need }) => {
      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, company, need, instance: slug }),
        });
        const data = await res.json();
        if (!res.ok) return `Couldn't capture that: ${data.error || res.status}`;
        return `✅ Captured — ${data.captured.email} is now in ${instanceName}'s pipeline (${data.total} total)${data.durable ? "" : " (saved for this session)"}. Someone will follow up.`;
      } catch (e) {
        return `Couldn't reach the pipeline: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: "bookDemo",
    description:
      `Route a qualified visitor to book a demo of ${instanceName}. Capture their email first (via ` +
      "captureLead), then return the demo link so they can proceed.",
    parameters: [{ name: "email", type: "string", description: "Their email, if given", required: false }],
    handler: async ({ email }) => {
      if (email) {
        try { await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, need: "requested a demo", instance: slug }) }); } catch { /* best effort */ }
      }
      return siteUrl ? `Great — book your demo here: ${siteUrl}` : `Great — I've flagged you for a demo; the team will reach out.`;
    },
  });

  useCopilotAction({
    name: "viewLeads",
    description:
      `OWNER ONLY: show the leads the agent has captured for ${instanceName} (the pipeline it built). ` +
      "If the caller isn't the owner, tell them this is owner-only and how to unlock (open the site with " +
      "?owner=<token>).",
    parameters: [],
    handler: async () => {
      let token = "";
      try { token = localStorage.getItem(tokenKey(slug)) || ""; } catch { /* ignore */ }
      try {
        const qs = slug ? `?instance=${encodeURIComponent(slug)}` : "";
        const res = await fetch(`/api/lead${qs}`, { headers: token ? { "x-portfolio-owner": token } : {} });
        if (res.status === 403) return "🔒 Owner only. Open your portfolio with `?owner=<your token>` once to unlock, then ask again.";
        const data = await res.json();
        if (!res.ok) return `Couldn't read the pipeline: ${data.error || res.status}`;
        if (!data.leads?.length) return `No leads captured yet for ${instanceName}.`;
        const rows = data.leads.slice(0, 10).map((l: { name: string; email: string; company: string; need: string }) => `• ${l.email}${l.name ? ` (${l.name}${l.company ? `, ${l.company}` : ""})` : ""}${l.need ? ` — ${l.need}` : ""}`).join("\n");
        return `📈 ${data.count} lead(s) the agent captured for ${instanceName}${data.durable ? " (durable)" : ""}:\n${rows}`;
      } catch (e) {
        return `Couldn't reach the pipeline: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: "syncSources",
    description:
      `OWNER ONLY: refresh ${instanceName}'s portfolio from its public sources (GitHub repos + YouTube videos) ` +
      "in one click — pulls the latest and adds them to the portfolio. If the caller isn't the owner, say it's " +
      "owner-only and how to unlock (open the site with ?owner=<token>). Note honestly that LinkedIn & X can't be " +
      "auto-synced (login-walled / paid) — those are added via the browser.",
    parameters: [],
    handler: async () => {
      if (!slug) return "Sync is available on hosted portfolios (made via /make).";
      let token = "";
      try { token = localStorage.getItem(tokenKey(slug)) || ""; } catch { /* ignore */ }
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { "x-portfolio-owner": token } : {}) },
          body: JSON.stringify({ instance: slug }),
        });
        if (res.status === 403) return "🔒 Owner only. Open your portfolio with `?owner=<your token>` once to unlock, then ask me to sync again.";
        const data = await res.json();
        if (!res.ok) return `Couldn't sync: ${data.error || res.status}`;
        const gh = data.synced?.github ?? 0, yt = data.synced?.youtube ?? 0;
        return `🔄 Synced ${instanceName}: ${gh} GitHub repo(s) + ${yt} YouTube video(s), ${data.added ?? 0} new added. (LinkedIn & X aren't auto-syncable — add those in your browser.)`;
      } catch (e) {
        return `Couldn't reach sync: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: "sendFeedback",
    description:
      "Send a feature SUGGESTION or a COMPLAINT about this app to its builders. ANYONE can use this " +
      "(public, rate-limited) — call it whenever the user proposes a feature, reports friction, or " +
      "complains about how something works. Pass their words VERBATIM as `text`. Ask ONCE if they'd " +
      "like an email notice when it ships; include it as `contact` only if they volunteer one — never " +
      "require or invent it. Feedback goes into a weekly build review.",
    parameters: [
      { name: "kind", type: "string", description: "'suggestion' or 'complaint'", required: true },
      { name: "text", type: "string", description: "The user's suggestion/complaint, verbatim", required: true },
      { name: "contact", type: "string", description: "Optional email the user volunteered for a ship notice", required: false },
    ],
    handler: async ({ kind, text, contact }) => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, text, contact, slug, page: window.location.pathname }),
        });
        const data = await res.json();
        if (!res.ok) return `Couldn't send that: ${data.error || res.status}`;
        return `📬 ${data.message}`;
      } catch (e) {
        return `Couldn't reach the feedback inbox: ${(e as Error).message}`;
      }
    },
  });

  return null;
}
