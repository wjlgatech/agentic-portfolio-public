"use client";

// Article-import + verify + scout copilot actions extracted from Portfolio.tsx
// (god-component split, part 4): addArticle, addArticleFromUrl, importPosts,
// verifyResume, scoutNext, removeArticle. These are coupled to async helpers
// (runImport/onVerify/onScout) and the harvest tip, all passed via ctx. lib/linkedin
// is fs-free, so value-importing isLinkedInFeedUrl here is safe.

import { useCopilotAction } from "@copilotkit/react-core";
import { isLinkedInFeedUrl } from "@/lib/linkedin";
import type { PortfolioConfig, Article } from "@/lib/portfolio";
import type { DeepenArtifact } from "@core/deepen-types";

type EngagementCtx = {
  cfgRef: { current: PortfolioConfig };
  isOwnerRef: { current: boolean };
  tokenRef: { current: string };
  gate: (next: PortfolioConfig, proposal: string, success: string) => string;
  persist: (next: PortfolioConfig) => void;
  runImport: (data: string, category?: string) => Promise<string>;
  harvestTip: () => string;
  onVerify: (resume: string) => Promise<string>;
  onScout: () => Promise<string>;
  onSyncProjects: () => Promise<string>;
  onSyncWriting: () => Promise<string>;
  onDeepDive: (source: string) => Promise<{ artifact?: DeepenArtifact; error?: string }>;
  onDraftResume: () => Promise<{ draft?: string; error?: string }>;
  onScoreJob: (input: string) => Promise<string>;
};

const WRITING_KINDS = ["substack", "medium", "rss", "linkedin", "x"];

export function useEngagementActions({ cfgRef, isOwnerRef, tokenRef, gate, persist, runImport, harvestTip, onVerify, onScout, onSyncProjects, onSyncWriting, onDeepDive, onDraftResume, onScoreJob }: EngagementCtx) {
  useCopilotAction({
    name: "addArticle",
    description:
      "Add a LinkedIn long-form article to the Writing section (owner only — for " +
      "a visitor this only proposes). date is YYYY-MM; category is free-form.",
    parameters: [
      { name: "title", type: "string", description: "Article title", required: true },
      { name: "url", type: "string", description: "Link to the article", required: true },
      { name: "date", type: "string", description: "Publish date as YYYY-MM", required: false },
      { name: "category", type: "string", description: "Free-form category", required: false },
      { name: "summary", type: "string", description: "One or two sentence summary", required: false },
    ],
    handler: async ({ title, url, date, category, summary }) => {
      const cur = cfgRef.current;
      const article: Article = {
        title: String(title).trim(),
        url: String(url).trim(),
        date: (date ? String(date) : "").trim(),
        category: (category ? String(category) : "Uncategorized").trim() || "Uncategorized",
        summary: (summary ? String(summary) : "").trim(),
      };
      const articles = [...cur.articles.filter((a) => a.title.toLowerCase() !== article.title.toLowerCase()), article];
      const sections = cur.sections.map((s) => (s.id === "writing" ? { ...s, visible: true } : s));
      return gate({ ...cur, articles, sections }, `add the article "${article.title}" to Writing`, `Added "${article.title}" to Writing (${articles.length} article(s) total).`);
    },
  });

  useCopilotAction({
    name: "addArticleFromUrl",
    description:
      "Add an article to Writing from JUST its URL — the server fetches the page " +
      "and pulls the title + summary (handles LinkedIn). Owner only. Use this when " +
      "the user gives a link without typing out the title/summary.",
    parameters: [
      { name: "url", type: "string", description: "The article URL", required: true },
      { name: "category", type: "string", description: "Optional category (free-form)", required: false },
    ],
    handler: async ({ url, category }) => {
      if (!isOwnerRef.current) return `🔒 Proposal only — only the owner can add articles. Proposed: fetch and add the article at ${url}.`;
      if (isLinkedInFeedUrl(String(url))) return harvestTip();
      let meta: { title?: string; summary?: string; url?: string; error?: string };
      try {
        const res = await fetch("/api/fetch-article", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}) },
          body: JSON.stringify({ url: String(url) }),
        });
        meta = await res.json();
        if (!res.ok) return `Couldn't fetch that article: ${meta.error || res.status}. You can still add it by giving me the title and summary.`;
      } catch (e) {
        return `Couldn't reach the fetch service: ${(e as Error).message}`;
      }
      const cur = cfgRef.current;
      const article: Article = {
        title: String(meta.title).trim(),
        url: String(meta.url || url).trim(),
        date: "",
        category: (category ? String(category) : "Uncategorized").trim() || "Uncategorized",
        summary: (meta.summary || "").trim(),
      };
      const articles = [...cur.articles.filter((a) => a.title.toLowerCase() !== article.title.toLowerCase()), article];
      const sections = cur.sections.map((s) => (s.id === "writing" ? { ...s, visible: true } : s));
      persist({ ...cur, articles, sections });
      return `Fetched and added "${article.title}" (category: ${article.category}). Say the word if you want a different category or a tweaked summary.`;
    },
  });

  useCopilotAction({
    name: "importPosts",
    description:
      "Bulk-import LinkedIn posts the user harvested with the bookmarklet (a JSON " +
      "array of {url,title,summary}) or a pasted list of URLs. Owner only. " +
      "Pass the user's pasted text VERBATIM as `data`. Skips anything already " +
      "present (dedupes by URL and title).",
    parameters: [
      { name: "data", type: "string", description: "The pasted JSON array or URL list, verbatim", required: true },
      { name: "category", type: "string", description: "Optional category for all imported posts", required: false },
    ],
    handler: async ({ data, category }) => {
      if (!isOwnerRef.current) return "🔒 Proposal only — only the owner can import posts. Unlock owner mode first.";
      return runImport(String(data || ""), category ? String(category) : undefined);
    },
  });

  useCopilotAction({
    name: "verifyResume",
    description:
      "Audit a résumé/CV against Paul's portfolio + live public GitHub, producing a " +
      "per-claim verdict report and an aggregate credibility score in the Resume Verification " +
      "section. ANYONE can run this (it's the public self-proof demo; rate-limited). Pass the " +
      "user's pasted résumé text VERBATIM as `resume`. It honestly flags claims that need an " +
      "external source — it does NOT rubber-stamp. A visitor's run is shown in-session only; only " +
      "the owner's run publishes. After it runs, the owner can draftVerifiedResume to close the loop.",
    parameters: [{ name: "resume", type: "string", description: "The full résumé/CV text to verify, verbatim", required: true }],
    handler: async ({ resume }) => {
      if (String(resume || "").trim().length < 40) return "Paste the full résumé text (a few lines at least) and I'll verify each claim.";
      return onVerify(String(resume));
    },
  });

  useCopilotAction({
    name: "draftVerifiedResume",
    description:
      "Close the verification loop: draft an HONEST résumé built from ONLY the verified " +
      "(corroborated/partial) claims in the current Resume Verification report, each with its " +
      "citation, dropping anything unprovable. Owner only. It DRAFTS — it never sends. Use this " +
      "after a résumé has been verified, when the owner asks to 'generate/make a verified résumé'. " +
      "Return the draft Markdown to the user so they can review + copy it.",
    parameters: [],
    handler: async () => {
      if (!isOwnerRef.current) return "🔒 Only the owner can generate a verified résumé. Unlock owner mode first.";
      const r = await onDraftResume();
      if (r.error) return r.error;
      return r.draft ? `Here's a verified résumé drafted from your corroborated claims only (review before sending — nothing is sent):\n\n${r.draft}` : "No draft was produced — verify a résumé first.";
    },
  });

  useCopilotAction({
    name: "scoreJobFit",
    description:
      "Score whether a JOB is a good fit for Paul across THREE axes — past experience, current " +
      "skillset, and future mission/values/vision trajectory — grounded in the portfolio corpus + live " +
      "GitHub. ANYONE can run this (public, rate-limited). Pass a job-posting URL (Ashby/Greenhouse/Lever " +
      "are fetched server-side via their public APIs) OR the pasted JD text, verbatim, as `input`. It is " +
      "SKEPTICAL: a misaligned role scores low and the honest gaps (why it might NOT fit) are surfaced. The " +
      "overall score is computed in code, and the scorer's accuracy is published from a golden-set eval. " +
      "Results land in the Role Fit section. LinkedIn job URLs are login-walled — if given one, ask the user " +
      "to paste the JD text or the underlying ATS (Ashby/Greenhouse/Lever) link instead.",
    parameters: [{ name: "input", type: "string", description: "A job-posting URL, or the full JD text, verbatim", required: true }],
    handler: async ({ input }) => {
      if (String(input || "").trim().length < 6) return "Give me a job-posting URL (Ashby/Greenhouse/Lever) or paste the JD text, and I'll score the fit.";
      return onScoreJob(String(input));
    },
  });

  useCopilotAction({
    name: "scoutNext",
    description:
      "Run the proactive Next Projects scout: surface the next moves along FOUR growth vectors — " +
      "DEEPEN (foundational), WIDEN (adjacent), LENGTHEN (mature an existing repo), HEIGHTEN " +
      "(generalize/abstract) — plus the next collaborators to reach, grounded in Paul's real GitHub " +
      "fleet + verified strengths. Owner only. Drafts moves for approval — it does NOT send anything. " +
      "Results land in the Next Projects section.",
    parameters: [],
    handler: async () => {
      if (!isOwnerRef.current) return "🔒 Only the owner can run the scout. Unlock owner mode first.";
      return onScout();
    },
  });

  useCopilotAction({
    name: "syncProjectsFromGithub",
    description:
      "Sync the Projects section from GitHub: pull the owner's repos (public AND private via their " +
      "server-side token) and MERGE — updating live fields (language, stars, last-pushed, private, url) and " +
      "adding new repos, while PRESERVING curation (category, highlight, featured) and never deleting. " +
      "Private repos keep a derived 'view →' link. Owner only.",
    parameters: [],
    handler: async () => {
      if (!isOwnerRef.current) return "🔒 Only the owner can sync projects. Unlock owner mode first.";
      return onSyncProjects();
    },
  });

  useCopilotAction({
    name: "deepDiveSource",
    description:
      "Deep-dive a source URL (a repo, paper, or article): fetch it, distill a plain-language digest + a " +
      "knowledge graph (concepts + links) + reusable skills — grounded ONLY in the source — and SAVE it to " +
      "the knowledge base (the Deep Dives section). Owner only. Each skill is shown UNPROVEN until an outcome " +
      "confirms it; ungrounded nodes/skills are dropped.",
    parameters: [{ name: "source", type: "string", description: "The source URL to deep-dive", required: true }],
    handler: async ({ source }: { source: string }) => {
      if (!isOwnerRef.current) return "🔒 Only the owner can run a deep dive. Unlock owner mode first.";
      const r = await onDeepDive(String(source ?? "").trim());
      if (r.error) return r.error;
      const a = r.artifact;
      return a
        ? `Deep-dived “${a.source.title}” → saved ${a.graph.nodes.length} concept(s) + ${a.skills.length} skill(s) to the knowledge base.`
        : "Deep dive returned nothing usable.";
    },
  });

  useCopilotAction({
    name: "syncWriting",
    description:
      "Sync the Writing section from its configured sources: pulls new posts from server-syncable feeds " +
      "(Substack, Medium, any RSS) and merges them (deduped). Login-walled sources (LinkedIn, X) can't be " +
      "server-synced — they're harvested in the browser. Owner only.",
    parameters: [],
    handler: async () => {
      if (!isOwnerRef.current) return "🔒 Only the owner can sync Writing. Unlock owner mode first.";
      return onSyncWriting();
    },
  });

  useCopilotAction({
    name: "addWritingSource",
    description:
      "Add a source to sync Writing from (MCP-ready registry). kind = substack|medium|rss (server-synced) " +
      "or linkedin|x (browser-harvest). ref = a handle (e.g. @me, myblog) or a full feed/profile URL. " +
      "Owner only. After adding, say “sync writing” to pull posts.",
    parameters: [
      { name: "kind", type: "string", description: "substack | medium | rss | linkedin | x", required: true },
      { name: "ref", type: "string", description: "handle (e.g. @me, myblog) or a full feed/profile URL", required: true },
      { name: "label", type: "string", description: "display label / category (optional)", required: false },
    ],
    handler: ({ kind, ref, label }: { kind: string; ref: string; label?: string }) => {
      const cur = cfgRef.current;
      const k = String(kind ?? "").toLowerCase().trim();
      if (!WRITING_KINDS.includes(k)) return `Unknown source kind “${kind}”. Use substack|medium|rss|linkedin|x.`;
      const src = { kind: k, ref: String(ref ?? "").trim(), label: String(label ?? "").trim() };
      if (!src.ref) return "Give the source's handle or feed/profile URL.";
      const writingSources = [...(cur.writingSources ?? []), src] as typeof cur.writingSources;
      return gate({ ...cur, writingSources }, `add the ${k} writing source “${src.ref}”`, `Added ${k} source “${src.ref}”. Say “sync writing” to pull posts.`);
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
          body: JSON.stringify({ kind, text, contact, page: window.location.pathname }),
        });
        const data = await res.json();
        if (!res.ok) return `Couldn't send that: ${data.error || res.status}`;
        return `📬 ${data.message}`;
      } catch (e) {
        return `Couldn't reach the feedback inbox: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: "removeArticle",
    description: "Remove an article from Writing by (approximate) title (owner only).",
    parameters: [{ name: "title", type: "string", description: "Title of the article to remove", required: true }],
    handler: async ({ title }) => {
      const cur = cfgRef.current;
      const q = String(title).toLowerCase();
      const match = cur.articles.find((a) => a.title.toLowerCase() === q || a.title.toLowerCase().includes(q));
      if (!match) return `No article matching "${title}" was found.`;
      return gate({ ...cur, articles: cur.articles.filter((a) => a !== match) }, `remove the article "${match.title}"`, `Removed "${match.title}".`);
    },
  });
}
