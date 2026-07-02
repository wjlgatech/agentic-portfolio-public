"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio.tsx — the agent-editable site body, with an owner/visitor boundary.
//
// Holds the layout config (theme, section order/visibility/labels, articles) in
// React state, seeded from content/portfolio.yaml (server) and overlaid by the
// browser's last session (localStorage). Registers CopilotKit ACTIONS so the
// on-page agent can turn natural language into structured edits.
//
// AUTHORIZATION
//   • OWNER   — can APPLY edits (they persist to the YAML file in local dev, and
//               to localStorage on the live site).
//   • VISITOR — can ask questions and PROPOSE edits, but the agent refuses to
//               apply them. Enforced here (client) and in /api/portfolio (server).
// Ownership is proven by PORTFOLIO_OWNER_TOKEN (server-side secret). If no token
// is configured, the instance is un-gated (local dev) and everyone is owner.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useCopilotReadable } from "@copilotkit/react-core";
import { Projects, type Project } from "@/components/Projects";
import { Articles } from "@/components/Articles";
import { Receipts } from "@/components/Receipts";
import { JobFit } from "@/components/JobFit";
import { Deepen } from "@/components/Deepen";
import { Compass } from "@/components/Compass";
import { OwnerBadge } from "@/components/OwnerBadge";
import { CustomSectionBody } from "@/components/sections";
import { PracticesSlider } from "@/components/PracticesSlider";
import { ValuesSlider } from "@/components/ValuesSlider";
import { useLayoutActions } from "@/components/useLayoutActions";
import { useContentActions } from "@/components/useContentActions";
import { useEngagementActions } from "@/components/useEngagementActions";
import type { PortfolioConfig, SectionMeta, Article } from "@/lib/portfolio";
import { normalizeReport, type VerificationReport } from "@core/verification-types";
import { normalizeFit, EMPTY_FIT, type JobFit as JobFitReport, type FitEval } from "@core/jobfit-types";
import { type DeepenFeed } from "@core/deepen-types";
import { normalizeCompass, ideaCount, type CompassReport } from "@core/compass-types";
import { isLinkedInFeedUrl } from "@/lib/linkedin";

const THEME_IDS = [
  "anthropic", "openai", "google", "apple", "vercel",
  "stripe", "swiss", "brutalist", "notion",
];
const KNOWN_SECTION_IDS = ["practices", "projects", "writing", "receipts", "job-fit", "deep-dives", "compass", "values"];
const LS_KEY = "portfolio-cfg";
const LS_OWNER_TOKEN = "portfolio-owner-token";
const LS_REPORT = "portfolio-verification";
const LS_FIT = "portfolio-jobfit";
const LS_COMPASS = "portfolio-compass";

const EDITABLE = [
  "add a LinkedIn article from just its URL (the server fetches the title + summary)",
  "bulk-import many LinkedIn posts at once (harvested with the bookmarklet), de-duplicated",
  "add or remove articles manually",
  "verify a résumé/CV against the portfolio + live GitHub evidence, then generate a verified résumé (the Resume Verification section)",
  "score whether a job is a good fit — paste a posting URL or JD text and the agent scores experience/skillset/mission-vision fit, with honest gaps (the Role Fit section)",
  "scout the next projects across four growth vectors (deepen/widen/lengthen/heighten) + collaborators to reach (the Next Projects section)",
  "create a brand-new custom section (e.g. 'highlight my agentic tools') — grounded in a real repo",
  "remove a custom section you created",
  "edit the WORDING of any text (e.g. 'change Genentech to Accenture', reword the blurb/mission/a value/practice) — the schema stays fixed",
  "reorder the sections",
  "show or hide a section",
  "rename a section",
  "switch the brand theme",
];

type Profile = {
  name: string;
  handle: string;
  tagline: string;
  blurb: string;
  location: string;
  links: { github: string; linkedin: string; email: string };
};
type ValueItem = { title: string; body: string };
type Practice = { n: number; name: string; body: string };

export type PortfolioContent = {
  profile: Profile;
  mission: string;
  values: ValueItem[];
  love: string;
  futurePractices: Practice[];
  projects: Project[];
};

// Step-by-step LinkedIn import guidance, with a CLICKABLE absolute link to the
// harvester. LinkedIn's activity/feed is login-walled (a server only gets a tiny
// login page), so the harvest must run in the user's own logged-in browser. We
// build the URL from window.location.origin so the link works on any deployment.
function harvestTip(): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const script = `${base}/linkedin-harvest.js`;
  return [
    "That URL is your LinkedIn **activity/feed** page, which LinkedIn walls off from servers " +
      "(anti-bot), so it can't be fetched directly — the harvest has to run in *your* logged-in " +
      "browser. Two ways, easiest first; both grab **long-form articles AND short posts**:",
    "",
    "**① One-click (easiest) — the browser extension.** Load `extension/` unpacked once " +
      "(`chrome://extensions` → Developer mode → Load unpacked), then click the blue " +
      "**“⬆ Send my posts to my portfolio”** button on your LinkedIn activity page. It harvests " +
      "and imports automatically — no DevTools, no copy-paste. (Unlock owner mode here first.)",
    "",
    "**② No-install — the console script.**",
    `   1. Open ${script}, select-all (⌘/Ctrl-A), copy it.`,
    "   2. On your logged-in LinkedIn activity page: DevTools → **Console** (⌘/Ctrl-Shift-J), " +
      "paste, Enter. It copies all your posts to the clipboard as JSON.",
    "   3. Come back and say **\"import these posts:\"** then paste — I add them and skip duplicates.",
    "",
    "(Just one published article? Give me its direct `linkedin.com/pulse/…` link and I'll fetch that one.)",
  ].join("\n");
}

function mergeSections(saved: SectionMeta[]): SectionMeta[] {
  const known = new Set(KNOWN_SECTION_IDS);
  const seen = new Set<string>();
  const out: SectionMeta[] = [];
  for (const s of saved) {
    if (seen.has(s.id)) continue;
    // Keep known sections AND agent-created custom sections (which carry their items).
    if (known.has(s.id) || (s.custom && /^custom-/.test(s.id))) {
      seen.add(s.id);
      out.push(s);
    }
  }
  for (const id of KNOWN_SECTION_IDS) {
    if (!seen.has(id)) out.push({ id, title: id, visible: true });
  }
  return out;
}

export function Portfolio({
  initial,
  initialReport,
  initialFitEval,
  initialDeepen,
  initialCompass,
  content,
}: {
  initial: PortfolioConfig;
  initialReport: VerificationReport;
  initialFitEval: FitEval;
  initialDeepen: DeepenFeed;
  initialCompass: CompassReport;
  content: PortfolioContent;
}) {
  const { projects } = content;
  const [cfg, setCfg] = useState<PortfolioConfig>(initial);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Apply the agent-edited wording (cfg.overrides) on top of the fixed content schema,
  // so live edits like "change Genentech to Accenture" show immediately. Built explicitly
  // (not via the generic helper) to preserve the profile's handle/links types for the hero.
  const { profile, mission, love, values, futurePractices } = useMemo(() => {
    const ov = cfg.overrides ?? {};
    return {
      profile: {
        ...content.profile,
        name: ov["profile.name"] ?? content.profile.name,
        tagline: ov["profile.tagline"] ?? content.profile.tagline,
        blurb: ov["profile.blurb"] ?? content.profile.blurb,
        location: ov["profile.location"] ?? content.profile.location,
      },
      mission: ov["mission"] ?? content.mission,
      love: ov["love"] ?? content.love,
      values: content.values.map((v, i) => ({ title: ov[`values.${i}.title`] ?? v.title, body: ov[`values.${i}.body`] ?? v.body })),
      futurePractices: content.futurePractices.map((p, i) => ({ ...p, name: ov[`practices.${i}.name`] ?? p.name, body: ov[`practices.${i}.body`] ?? p.body })),
    };
  }, [content, cfg.overrides]);

  // The self-proof report: seeded from content/verification.json (server), overlaid
  // by this browser's last run (localStorage), updated live when the owner verifies.
  const [report, setReport] = useState<VerificationReport>(initialReport);

  // The JD-fit result: a scored role (overlaid by this browser's last run). The golden-set
  // eval scorecard (initialFitEval) is a static, committed artifact — passed straight through.
  const [fit, setFit] = useState<JobFitReport>(EMPTY_FIT);

  // The Compass scout report: same seed→overlay→live pattern.
  const [compass, setCompass] = useState<CompassReport>(initialCompass);

  // ── Role state ──────────────────────────────────────────────────────────────
  const [ownerRequired, setOwnerRequired] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const isOwnerRef = useRef(isOwner);
  isOwnerRef.current = isOwner;
  const tokenRef = useRef<string>(""); // verified owner token, sent with writes

  // Resolve role on mount: is the site gated? are we the owner?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ownerRequired } = await fetch("/api/owner").then((r) => r.json());
        if (cancelled) return;
        setOwnerRequired(Boolean(ownerRequired));
        if (!ownerRequired) {
          setIsOwner(true); // un-gated instance (local dev) — you're the owner
          return;
        }
        // Gated: try a token from the URL (?owner=…) or a previously saved one.
        const url = new URL(window.location.href);
        const fromUrl = url.searchParams.get("owner");
        const saved = (() => {
          try { return localStorage.getItem(LS_OWNER_TOKEN); } catch { return null; }
        })();
        const candidate = fromUrl || saved;
        if (candidate) {
          const ok = await unlock(candidate);
          if (ok && fromUrl) {
            url.searchParams.delete("owner"); // don't leave the secret in the address bar
            window.history.replaceState({}, "", url.toString());
          }
        }
      } catch {
        /* /api/owner unreachable — stay a visitor */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verify a candidate token against the server; on success, become owner.
  async function unlock(token: string): Promise<boolean> {
    try {
      const { owner } = await fetch("/api/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then((r) => r.json());
      if (owner) {
        tokenRef.current = token;
        try { localStorage.setItem(LS_OWNER_TOKEN, token); } catch { /* ignore */ }
        setIsOwner(true);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  function lock() {
    tokenRef.current = "";
    try { localStorage.removeItem(LS_OWNER_TOKEN); } catch { /* ignore */ }
    setIsOwner(false);
  }

  // Overlay the browser's last session on mount (client-only, post-hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PortfolioConfig;
        setCfg({
          theme: THEME_IDS.includes(saved.theme) ? saved.theme : initial.theme,
          sections: mergeSections(saved.sections ?? initial.sections),
          articles: Array.isArray(saved.articles) ? saved.articles : initial.articles,
          writingSources: Array.isArray(saved.writingSources) ? saved.writingSources : initial.writingSources,
          overrides: saved.overrides && typeof saved.overrides === "object" ? saved.overrides : (initial.overrides ?? {}),
        });
      }
    } catch {
      /* corrupt localStorage — keep server config */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overlay this browser's last verification run on mount (re-validated).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_REPORT);
      if (raw) setReport(normalizeReport(JSON.parse(raw)));
    } catch {
      /* corrupt — keep the server seed */
    }
    try {
      const rawF = localStorage.getItem(LS_FIT);
      if (rawF) setFit(normalizeFit(JSON.parse(rawF)));
    } catch {
      /* corrupt — keep empty */
    }
    try {
      const rawC = localStorage.getItem(LS_COMPASS);
      if (rawC) setCompass(normalizeCompass(JSON.parse(rawC)));
    } catch {
      /* corrupt — keep the server seed */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the live theme in sync with config (and with the StyleSwitcher's key).
  useEffect(() => {
    document.documentElement.dataset.theme = cfg.theme;
    try { localStorage.setItem("webapp-style", cfg.theme); } catch { /* ignore */ }
  }, [cfg.theme]);

  // The one write path: update state, cache locally, persist to the YAML file.
  // Only ever called for the owner (visitor handlers return before reaching here).
  function persist(next: PortfolioConfig) {
    setCfg(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    void fetch("/api/portfolio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}),
      },
      body: JSON.stringify(next),
    }).catch(() => { /* read-only fs / offline — state + localStorage hold it */ });
  }

  // Gate every mutation: owners apply + get the success line; visitors get a
  // clearly-labelled PROPOSAL and nothing changes.
  function gate(next: PortfolioConfig, proposal: string, success: string): string {
    if (!isOwnerRef.current) {
      return `🔒 Proposal only — I can't change ${profile.name}'s portfolio because you're a visitor, not the owner. Proposed change: ${proposal}. The owner can apply it in owner mode.`;
    }
    persist(next);
    return success;
  }

  // The shared LinkedIn-import pipeline, used by BOTH the copilot's `importPosts`
  // action and the one-click browser-extension handoff (a pending import dropped in
  // localStorage). Owner-only by construction — callers check ownership first.
  // Dedupes by URL and title against what's already present.
  async function runImport(data: string, category?: string): Promise<string> {
    const raw = String(data || "");
    if (raw.includes("LINKEDIN-HARVEST-DIAGNOSTIC")) {
      return "That's a harvester diagnostic (it collected 0 posts — LinkedIn changed its markup). Send it to the developer to update the harvester; it can't be imported as posts.";
    }
    let incoming: { url: string; title?: string; summary?: string }[] = [];
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) incoming = parsed.filter((x) => x && x.url);
    } catch {
      /* not JSON */
    }
    if (incoming.length === 0) {
      const urls = raw.match(/https?:\/\/[^\s"'<>]*linkedin\.com\/[^\s"'<>]+/gi) || [];
      incoming = urls.map((u) => ({ url: u }));
    }
    if (incoming.length > 0 && incoming.every((it) => isLinkedInFeedUrl(it.url))) return harvestTip();
    incoming = incoming.filter((it) => it.url && !isLinkedInFeedUrl(it.url));
    if (incoming.length === 0) return "I didn't find any importable post links in that. Paste the harvester's JSON (from /linkedin-harvest.js), or individual LinkedIn /pulse/ or /posts/ links.";

    const cur = cfgRef.current;
    const norm = (u: string) => String(u || "").split("?")[0].replace(/\/+$/, "").toLowerCase();
    const seenUrl = new Set(cur.articles.map((a) => norm(a.url)));
    const seenTitle = new Set(cur.articles.map((a) => a.title.toLowerCase()));
    const cat = (category ? String(category) : "LinkedIn").trim() || "LinkedIn";

    const toAdd: Article[] = [];
    let dupes = 0;
    let failed = 0;
    for (const it of incoming) {
      const url = String(it.url || "").trim();
      if (!url || seenUrl.has(norm(url))) { if (url) dupes++; continue; }
      let title = (it.title || "").trim();
      let summary = (it.summary || "").trim();
      if (!title) {
        // Bare URL (e.g. a /pulse/ article) — fetch its metadata server-side.
        try {
          const res = await fetch("/api/fetch-article", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}) },
            body: JSON.stringify({ url }),
          });
          const m = await res.json();
          if (res.ok) { title = (m.title || "").trim(); summary = (m.summary || summary).trim(); }
        } catch { /* leave title empty → counts as failed */ }
      }
      if (!title) { failed++; continue; }
      if (seenTitle.has(title.toLowerCase())) { dupes++; continue; }
      seenUrl.add(norm(url));
      seenTitle.add(title.toLowerCase());
      toAdd.push({ title, url, date: "", category: cat, summary });
    }

    if (toAdd.length > 0) {
      const sections = cur.sections.map((s) => (s.id === "writing" ? { ...s, visible: true } : s));
      persist({ ...cur, articles: [...cur.articles, ...toAdd], sections });
    }
    const parts = [`Imported ${toAdd.length} new post(s)`];
    if (dupes) parts.push(`skipped ${dupes} duplicate(s)`);
    if (failed) parts.push(`${failed} couldn't be read`);
    return parts.join(", ") + ".";
  }

  // ── Self-proof: verify a résumé against the portfolio + live GitHub ─────────
  // Owner-only (the route also 403s a non-owner). Updates the live report + caches
  // it; serverless can't persist the JSON, so the owner commits content/verification.json.
  // PUBLIC self-proof: anyone can paste a résumé and watch it audited (the route is
  // rate-limited). Only the OWNER's run publishes; a visitor's run is shown in-session only.
  async function onVerify(resume: string, linkedin?: string): Promise<string> {
    try {
      const res = await fetch("/api/verify-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}),
        },
        body: JSON.stringify({ resume: String(resume || ""), linkedin: String(linkedin || "") }),
      });
      const data = await res.json();
      if (!res.ok) return `Couldn't verify that résumé: ${data.error || res.status}`;
      const rep = normalizeReport(data.report);
      setReport(rep);
      // Only the owner caches/publishes; a visitor's run is ephemeral (reverts on refresh).
      if (isOwnerRef.current) { try { localStorage.setItem(LS_REPORT, JSON.stringify(rep)); } catch { /* ignore */ } }
      setCfg((c) => ({ ...c, sections: c.sections.map((s) => (s.id === "receipts" ? { ...s, visible: true } : s)) }));
      const s = rep.summary;
      const tail = data.published ? " (Published.)" : " (Shown here in your browser — it doesn't change the published proof.)";
      return `Verified ${rep.claims.length} claim(s) → ${s.overallScore}/100 corroboration index. ${s.headline}${tail}`;
    } catch (e) {
      return `Couldn't reach the verifier: ${(e as Error).message}`;
    }
  }

  // ── Close the loop: draft a verified résumé from the current report's claims ─
  // Owner-only (route 403s otherwise). Sends only the claims (the route keeps just
  // corroborated/partial) and gets back an honest, cited résumé draft — never sent.
  async function onDraftResume(): Promise<{ draft?: string; error?: string }> {
    if (!isOwnerRef.current) return { error: "🔒 Only the owner can generate a verified résumé." };
    if (report.claims.length === 0) return { error: "Verify a résumé first — there are no claims to build from." };
    try {
      const res = await fetch("/api/verified-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}) },
        body: JSON.stringify({ claims: report.claims }),
      });
      const data = await res.json();
      if (!res.ok) return { error: `Couldn't draft it: ${data.error || res.status}` };
      return { draft: String(data.draft || "") };
    } catch (e) {
      return { error: `Couldn't reach the drafter: ${(e as Error).message}` };
    }
  }

  // ── Proactive scout: next projects to deepen/widen + collaborators ──────────
  // Owner-only on demand ("Scout now"); the scheduled GitHub Action runs it headless.
  async function onScout(): Promise<string> {
    if (!isOwnerRef.current) return "🔒 Only the owner can run the scout. Unlock owner mode first.";
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}),
        },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) return `Couldn't scout: ${data.error || res.status}`;
      const rep = normalizeCompass(data.report);
      setCompass(rep);
      try { localStorage.setItem(LS_COMPASS, JSON.stringify(rep)); } catch { /* ignore */ }
      setCfg((c) => ({ ...c, sections: c.sections.map((s) => (s.id === "compass" ? { ...s, visible: true } : s)) }));
      const moves = ideaCount(rep);
      return `Scouted ${moves} project move(s) across deepen/widen/lengthen/heighten + ${rep.collaborators.length} collaborator(s) to reach.${data.persisted ? "" : " (Saved in this browser; the GitHub Action commits it on schedule.)"}`;
    } catch (e) {
      return `Couldn't reach the scout: ${(e as Error).message}`;
    }
  }

  // ── Sync Projects from GitHub (OWNER) — pull repos (public + private) and merge, keeping curation.
  async function onSyncProjects(): Promise<string> {
    if (!isOwnerRef.current) return "🔒 Only the owner can sync projects. Unlock owner mode first.";
    try {
      const res = await fetch("/api/sync-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}) },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) return `Couldn't sync: ${data.error || res.status}`;
      const added = (data.added ?? []).length;
      const updated = (data.updated ?? []).length;
      if (data.durable) setTimeout(() => location.reload(), 900);
      return `Synced ${data.total} repos from GitHub — ${added} added, ${updated} updated.${data.durable ? " Reloading…" : " (Not persisted — no durable store configured.)"}`;
    } catch (e) {
      return `Couldn't reach GitHub sync: ${(e as Error).message}`;
    }
  }

  // ── Sync Writing (OWNER) — pull server-syncable feeds (Substack/Medium/RSS); LinkedIn/X stay in-browser.
  async function onSyncWriting(): Promise<string> {
    if (!isOwnerRef.current) return "🔒 Only the owner can sync Writing. Unlock owner mode first.";
    try {
      const res = await fetch("/api/sync-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tokenRef.current ? { "x-portfolio-owner": tokenRef.current } : {}) },
        body: JSON.stringify({ sources: cfgRef.current.writingSources }),
      });
      const data = await res.json();
      if (!res.ok) return `Couldn't sync Writing: ${data.error || res.status}`;
      const added = data.added ?? 0;
      let msg = added > 0 ? `Synced ${added} new post(s) from your feeds.` : "No new posts from your server-synced feeds.";
      const browser = (data.browserSources ?? []).map((b: { label: string }) => b.label);
      if (browser.length) msg += ` ${browser.join(" + ")} is login-walled — use “Sync from LinkedIn” to harvest it in your browser.`;
      if (data.durable && added > 0) setTimeout(() => location.reload(), 900);
      return msg;
    } catch (e) {
      return `Couldn't reach Writing sync: ${(e as Error).message}`;
    }
  }

  // ── Role fit: score a job posting against the corpus (PUBLIC, like verify) ──
  // A URL is fetched server-side via the public ATS APIs (lib/jobfit.ts); free text is
  // scored directly. Anyone can run it (the route is rate-limited); the result is cached
  // per-browser and reveals the Role Fit section.
  async function onScoreJob(input: string): Promise<string> {
    const v = String(input || "").trim();
    const looksUrl = /^https?:\/\//i.test(v) || (!/\s/.test(v) && /\./.test(v));
    try {
      const res = await fetch("/api/job-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(looksUrl ? { url: v } : { text: v }),
      });
      const data = await res.json();
      if (!res.ok) return `Couldn't score that role: ${data.error || res.status}`;
      const f = normalizeFit(data.fit);
      setFit(f);
      try { localStorage.setItem(LS_FIT, JSON.stringify(f)); } catch { /* ignore */ }
      setCfg((c) => ({ ...c, sections: c.sections.map((s) => (s.id === "job-fit" ? { ...s, visible: true } : s)) }));
      return `Scored ${f.job.title || "the role"}${f.job.company ? ` @ ${f.job.company}` : ""} → ${f.overall}/100 (${f.level}). ${f.recommendation || ""}${f.honestGaps[0] ? ` Top gap: ${f.honestGaps[0]}` : ""}`;
    } catch (e) {
      return `Couldn't reach the scorer: ${(e as Error).message}`;
    }
  }

  // ── One-click extension handoff ─────────────────────────────────────────────
  // The browser extension (extension/) harvests LinkedIn in the user's own session
  // and drops the posts in localStorage["portfolio-pending-import"]. We consume it
  // here: owners get an automatic import + a toast; visitors get a nudge to unlock
  // (and the pending posts are kept so they apply the moment owner mode is on).
  const PENDING_KEY = "portfolio-pending-import";
  const [flash, setFlash] = useState("");
  function consumePending() {
    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING_KEY); } catch { return; }
    if (!raw) return;
    if (!isOwnerRef.current) {
      let n = 0;
      try { const a = JSON.parse(raw); if (Array.isArray(a)) n = a.length; } catch { /* ignore */ }
      setFlash(`🔒 ${n} LinkedIn post(s) ready from the extension — unlock owner mode (🔒 badge, bottom-left) and they'll import automatically.`);
      return; // keep the pending data until the owner unlocks
    }
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    setFlash("⏳ Importing your LinkedIn posts…");
    void runImport(raw).then((msg) => setFlash(`✓ ${msg}`));
  }

  // Consume on mount + whenever the extension pings (same tab) + once owner unlocks.
  useEffect(() => {
    consumePending();
    const onPing = () => consumePending();
    window.addEventListener("portfolio:pending-import", onPing);
    return () => window.removeEventListener("portfolio:pending-import", onPing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (isOwner) consumePending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(""), 9000);
    return () => window.clearTimeout(t);
  }, [flash]);

  // ── Agent grounding: role + what's editable ─────────────────────────────────
  useCopilotReadable({
    description:
      "YOUR ROLE and capabilities on this portfolio. When the user asks 'what can " +
      "you do', answer from THIS. Owners can apply edits; visitors may only ask " +
      "and propose. NEVER claim you applied a change for a visitor. Whenever you " +
      "decline an edit because the user is a visitor, you MUST also tell them how to " +
      "unlock owner mode (the howToBecomeOwner field) — never leave them at a dead end.",
    value: JSON.stringify({
      role: isOwner ? "owner" : "visitor",
      canAnswerQuestions: true,
      canProposeChanges: true,
      canApplyChanges: isOwner,
      editable: EDITABLE,
      ownerRequired,
      howToBecomeOwner: !ownerRequired
        ? "This instance is un-gated — everyone is the owner and edits apply immediately."
        : isOwner
          ? "You are the verified owner; edits apply."
          : "If the user IS the owner: tell them to click the 🔒 “View only” badge at the " +
            "bottom-left and enter the owner passphrase (or open the site once with " +
            "?owner=<token> in the URL). After unlocking, ask them to repeat the request and " +
            "it will apply. Offer this every time you decline an edit.",
      visitorNote: isOwner
        ? undefined
        : "This user is currently a VISITOR (owner mode not unlocked). You may answer and " +
          "PROPOSE edits, but must NOT claim to apply them. When they ask to change something, " +
          "state the proposal AND give the howToBecomeOwner steps so they can unlock and apply it.",
    }),
  });

  // Always-available, role-aware instructions for importing LinkedIn posts. The
  // agent reads this so even a conversational answer (no action call) is actionable
  // and carries the harvester link — instead of a vague “run the harvester”.
  useCopilotReadable({
    description:
      "HOW TO IMPORT LinkedIn posts/articles. Use this whenever the user asks to fetch or " +
      "import their LinkedIn posts, or pastes a LinkedIn activity/feed/profile URL (e.g. " +
      "/in/<name>/recent-activity/all/). Those URLs are login-walled — you CANNOT fetch them " +
      "server-side. Give the user these steps and render harvesterUrl as a clickable link.",
    value: JSON.stringify({
      walledUrls:
        "linkedin.com/in/<name>, /feed, or anything with /recent-activity — NOT fetchable server-side (login wall). The harvest must run in the user's own logged-in browser. ALWAYS offer the one-click extension FIRST, then the console script.",
      fetchableUrls:
        "a single linkedin.com/pulse/… or /posts/… link IS fetchable — use addArticleFromUrl for those",
      ownerNote:
        ownerRequired && !isOwner
          ? "User is in View-only mode — they must unlock owner mode FIRST (🔒 “View only” badge, bottom-left, enter the passphrase) before importing. Say this up front."
          : "Owner mode is active — they can import.",
      easiestOneClick:
        "The browser extension in extension/ — load it unpacked once (chrome://extensions → Developer mode → Load unpacked), then click the “⬆ Send my posts to my portfolio” button on the LinkedIn activity page. It harvests AND imports automatically — no DevTools, no copy-paste. Recommend this first.",
      noInstallFallback: [
        "1. Open /linkedin-harvest.js (render as a clickable link), select-all, copy the whole script.",
        "2. On the logged-in LinkedIn activity page: DevTools → Console, paste, Enter — it copies ALL posts (articles + short posts) to the clipboard as JSON.",
        "3. Paste here with “import these posts:” — importPosts adds them and dedupes by URL and title.",
      ],
    }),
  });

  // The CURRENT profile text (after any owner wording-edits) — answer with THIS, so the
  // agent never contradicts what's on the page after an edit like Genentech→Accenture.
  useCopilotReadable({
    description:
      "CURRENT profile wording (may have been owner-edited). Answer about his name, tagline, " +
      "blurb, location, mission, and 'what he loves' using THESE values, not any earlier text.",
    value: JSON.stringify({ name: profile.name, tagline: profile.tagline, blurb: profile.blurb, location: profile.location, mission, love }),
  });

  // Deep Dives: the distilled knowledge + skills super-u's flywheel handed this node. The
  // agent uses THIS to EDUCATE the user ("explain what I learned from Engram", "what's the
  // deepen skill about") — grounded in the ingested digest/graph/skills, never invented.
  useCopilotReadable({
    description:
      "DEEP DIVES — seminal sources super-u distilled into a knowledge map + skills, surfaced in the Deep Dives " +
      "section. Use this to educate the user about a source they deepened. Skills marked unproven are NOT yet " +
      "verified by an outcome — say so; never claim a skill works until it's proven.",
    value: JSON.stringify({
      dives: initialDeepen.artifacts.map((a) => ({
        title: a.source.title,
        url: a.source.url,
        digest: a.digest,
        concepts: a.graph.nodes.map((n) => n.name),
        skills: a.skills.map((s) => ({ name: s.name, oneLine: s.oneLine, notGoodAt: s.notGoodAt, proven: s.verified })),
      })),
    }),
  });

  useCopilotReadable({
    description:
      "Live editable layout of this portfolio (current theme, section order/" +
      "visibility, and articles). Section ids are fixed: practices, projects, " +
      "writing, values.",
    value: JSON.stringify({
      theme: cfg.theme,
      availableThemes: THEME_IDS,
      sectionOrder: cfg.sections.map((s) => ({ id: s.id, title: s.title, visible: s.visible })),
      articles: cfg.articles,
    }),
  });

  // ── Copilot actions: all extracted into domain hooks (Portfolio keeps state + helpers). ──
  // Articles + verify + scout (coupled to runImport/onVerify/onScout):
  useEngagementActions({ cfgRef, isOwnerRef, tokenRef, gate, persist, runImport, harvestTip, onVerify, onScout, onSyncProjects, onSyncWriting, onDraftResume, onScoreJob });
  // Layout/theme actions (reorder/show-hide/rename/setTheme/resetLayout):
  useLayoutActions({ cfgRef, isOwnerRef, setCfg, gate, lsKey: LS_KEY, themeIds: THEME_IDS, knownSectionIds: KNOWN_SECTION_IDS });

  // Content + custom-section actions (editWording/editText/getRepoDigest/addSection/removeSection).
  useContentActions({ cfgRef, gate, content });

  // ── Section bodies, keyed by id ─────────────────────────────────────────────
  function renderBody(s: SectionMeta) {
    if (s.custom) return <CustomSectionBody items={s.items ?? []} />;
    switch (s.id) {
      case "practices": return <PracticesSlider practices={futurePractices} />;
      case "projects": return <Projects projects={projects} isOwner={isOwner} onSync={onSyncProjects} />;
      case "writing": return <Articles articles={cfg.articles} isOwner={isOwner} onSync={onSyncWriting} linkedInTip={harvestTip()} />;
      case "receipts": return <Receipts report={report} isOwner={isOwner} onVerify={onVerify} />;
      case "job-fit": return <JobFit fit={fit} evalReport={initialFitEval} onScore={onScoreJob} />;
      case "deep-dives": return <Deepen feed={initialDeepen} />;
      case "compass": return <Compass report={compass} isOwner={isOwner} />;
      case "values": return <ValuesSlider values={values} love={love} />;
      default: return null;
    }
  }

  return (
    <>
      {/* Owner lock — discreet, bottom-left. Visitors see a lock; owners see unlocked. */}
      <OwnerBadge
        isOwner={isOwner}
        ownerRequired={ownerRequired}
        onUnlock={unlock}
        onLock={lock}
        name={profile.name}
      />

      {/* Extension import status — bottom-center toast, auto-dismisses. */}
      {flash && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-theme border border-edge bg-surface px-4 py-3 text-sm text-ink shadow-lg">
          <span className="leading-relaxed">{flash}</span>
          <button onClick={() => setFlash("")} className="text-muted hover:text-ink" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── Hero / Mission (fixed identity — always first) ─────────────────── */}
      <header className="mx-auto max-w-6xl px-5 pb-6 pt-20 sm:pt-28">
        <p className="mb-3 font-mono text-sm text-accent2">
          {profile.handle} · {profile.location}
        </p>
        <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-lg text-muted sm:text-xl">{profile.tagline}</p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{profile.blurb}</p>

        <div className="mt-8 rounded-theme border border-edge bg-surface/70 p-6">
          <p className="mb-1 text-sm font-medium uppercase tracking-widest text-accent">Mission</p>
          <p className="text-lg leading-relaxed text-ink">{mission}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <a href={profile.links.github} className="chip text-ink hover:border-accent" target="_blank" rel="noreferrer">GitHub</a>
          <a href={profile.links.linkedin} className="chip text-ink hover:border-accent" target="_blank" rel="noreferrer">LinkedIn</a>
          <a href={`mailto:${profile.links.email}`} className="chip text-ink hover:border-accent">Email</a>
          <span className="chip border-accent2/40 text-accent2">
            ⌘ Ask the agent (bottom-right) — “what can you do?”
          </span>
        </div>
      </header>

      {/* ── Agent-ordered sections ────────────────────────────────────────── */}
      {cfg.sections
        .filter((s) => s.visible)
        .map((s) => (
          <section key={s.id} id={s.id} className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            {s.eyebrow && (
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">{s.eyebrow}</p>
            )}
            <h2 className="section-title mb-8">{s.title}</h2>
            {renderBody(s)}
          </section>
        ))}

      <footer className="mx-auto max-w-6xl px-5 py-12 text-sm text-muted">
        <p className="mb-2">
          <a className="text-accent hover:underline" href="/network">🌐 Explore the Portfolio Network →</a> — discover & query other agent portfolios.
        </p>
        <p>
          Built in the open by {profile.name}. Agentic portfolio · Next.js + CopilotKit · powered by a
          free-LLM survival chain (NVIDIA NIM → Groq → Gemini). Inspired by{" "}
          <a className="text-accent hover:underline" href="https://github.com/wjlgatech/rbit-ai">rbit-ai</a>.
        </p>
      </footer>
    </>
  );
}

