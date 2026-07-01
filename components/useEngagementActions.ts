"use client";

// Article-import + verify + scout copilot actions extracted from Portfolio.tsx
// (god-component split, part 4): addArticle, addArticleFromUrl, importPosts,
// verifyResume, scoutNext, removeArticle. These are coupled to async helpers
// (runImport/onVerify/onScout) and the harvest tip, all passed via ctx. lib/linkedin
// is fs-free, so value-importing isLinkedInFeedUrl here is safe.

import { useCopilotAction } from "@copilotkit/react-core";
import { isLinkedInFeedUrl } from "@/lib/linkedin";
import type { PortfolioConfig, Article } from "@/lib/portfolio";

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
  onDraftResume: () => Promise<{ draft?: string; error?: string }>;
  onScoreJob: (input: string) => Promise<string>;
};

export function useEngagementActions({ cfgRef, isOwnerRef, tokenRef, gate, persist, runImport, harvestTip, onVerify, onScout, onDraftResume, onScoreJob }: EngagementCtx) {
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
