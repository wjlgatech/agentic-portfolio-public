"use client";

import { useEffect, useState } from "react";

export type Project = {
  name: string;
  category: string;
  highlight: string;
  featured: boolean;
  private: boolean;
  language: string | null;
  stars: number;
  pushed: string;
  url: string | null;
};

const CATEGORY_ORDER = [
  "All",
  "Self-Improving Agentic OS",
  "Agent Frameworks & Tooling",
  "AI Products & Applications",
  "Faith · Family · Legacy",
  "Open Knowledge & Teaching",
];

type Sort = "recent" | "active";

export function Projects({ projects, isOwner = false, onSync }: { projects: Project[]; isOwner?: boolean; onSync?: () => Promise<string> }) {
  // Every repo gets a "view →" link — public ones carry their own url; private ones derive it
  // from the owner's GitHub base (only the owner can see the content, a visitor hits GitHub's
  // login/404). The base is read from the data itself (a public repo's url) so nothing is hardcoded.
  const repoBase = projects.find((p) => p.url)?.url?.replace(/\/[^/]+$/, "") ?? "https://github.com/wjlgatech";
  const [active, setActive] = useState("All");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  async function handleSync() {
    if (!onSync || syncing) return;
    setSyncing(true);
    setSyncMsg("Syncing from GitHub…");
    try {
      setSyncMsg(await onSync());
    } catch {
      setSyncMsg("Sync failed — try again.");
    } finally {
      setSyncing(false);
    }
  }
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [vis, setVis] = useState<"all" | "public" | "private">("all"); // public/private facet
  // PRs per repo in the last 30 days (live GitHub) — loads after mount; grid still
  // sorts by date until it arrives, then "Active" ranking becomes meaningful.
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [prWindow, setPrWindow] = useState(30);
  const [prAuthed, setPrAuthed] = useState(true); // assume authed until told otherwise (no false alarm)

  useEffect(() => {
    let off = false;
    fetch("/api/repo-activity")
      .then((r) => r.json())
      .then((d) => { if (!off && d && d.counts) { setPrs(d.counts); setPrWindow(d.windowDays ?? 30); setPrAuthed(d.authed !== false); } })
      .catch(() => { /* leave empty — date sort still works */ });
    return () => { off = true; };
  }, []);

  const cats = CATEGORY_ORDER.filter((c) => c === "All" || projects.some((p) => p.category === c));

  let list = active === "All" ? projects : projects.filter((p) => p.category === active);
  if (vis !== "all") list = list.filter((p) => (vis === "private" ? p.private : !p.private));
  // Featured-only applies just to the default view; picking Public/Private shows ALL of them.
  if (!showAll && vis === "all") list = list.filter((p) => p.featured);

  const publicCount = projects.filter((p) => !p.private).length;
  const privateCount = projects.filter((p) => p.private).length;
  const hasPrivate = privateCount > 0;

  const prCount = (p: Project) => prs[p.name] ?? 0;
  list = list.slice().sort((a, b) => {
    if (sort === "active") {
      const d = prCount(b) - prCount(a);
      if (d !== 0) return d;
    }
    return a.pushed < b.pushed ? 1 : a.pushed > b.pushed ? -1 : 0; // recency tiebreak / default
  });

  const totalPrs = Object.values(prs).reduce((s, n) => s + n, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setActive(c)} className={`chip ${active === c ? "chip-active" : "text-muted hover:text-ink"}`}>
            {c}
          </button>
        ))}
        {/* Public/private facet — a second filter dimension; toggling an active one clears it. */}
        <span className="mx-1 hidden text-edge sm:inline">·</span>
        <button
          onClick={() => setVis((v) => (v === "public" ? "all" : "public"))}
          className={`chip ${vis === "public" ? "chip-active" : "text-muted hover:text-ink"}`}
          title="Show public repos only"
        >
          Public {publicCount}
        </button>
        {hasPrivate && (
          <button
            onClick={() => setVis((v) => (v === "private" ? "all" : "private"))}
            className={`chip ${vis === "private" ? "chip-active" : "text-muted hover:text-ink"}`}
            title="Show private repos only"
          >
            🔒 Private {privateCount}
          </button>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSort("recent")}
            className={`chip ${sort === "recent" ? "chip-active" : "text-muted hover:text-ink"}`}
            title="Sort by last updated"
          >
            Recent
          </button>
          <button
            onClick={() => setSort("active")}
            className={`chip ${sort === "active" ? "chip-active" : "text-muted hover:text-ink"}`}
            title={`Sort by PRs in the last ${prWindow} days`}
          >
            🔥 Active {prWindow}d{totalPrs > 0 ? ` (${totalPrs})` : ""}
          </button>
          {/* Owner-only: 1-click sync from GitHub (public + private repos) → updates this grid. */}
          {isOwner && onSync && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="chip text-accent hover:border-accent disabled:opacity-50"
              title="Pull my repos from GitHub — updates live fields + adds new repos, keeps my curation"
            >
              {syncing ? "⟳ Syncing…" : "⟳ Sync from GitHub"}
            </button>
          )}
        </span>
      </div>

      {syncMsg && <p className="mb-4 text-sm text-muted">{syncMsg}</p>}

      {/* Owner-only self-diagnosis: private PR counts are blank because the deploy has no repo-scoped
          token, so GitHub's PR search can't see private repos. Don't fail silent — say why + the fix. */}
      {isOwner && hasPrivate && !prAuthed && (
        <p className="mb-4 text-xs text-muted">
          🔒 Private repos show no PR count — set a repo-scoped <code className="text-accent">GITHUB_TOKEN</code> on the deploy to include their last-30-day PRs.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const n = prCount(p);
          return (
            <article key={p.name} className="card flex flex-col">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">{p.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${p.private ? "border border-edge text-muted" : "bg-accent2/15 text-accent2"}`}>
                  {p.private ? "private" : "public"}
                </span>
              </div>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-muted">{p.highlight}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {p.language && <span>{p.language}</span>}
                {p.stars > 0 && <span>★ {p.stars}</span>}
                {n > 0 && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-accent">🔥 {n} PR·{prWindow}d</span>}
                <span className="ml-auto">{p.pushed}</span>
                <a href={p.url ?? `${repoBase}/${p.name}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">view →</a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <button onClick={() => setShowAll((s) => !s)} className="text-sm font-medium text-accent">
          {showAll ? "▾ Show featured only" : `▸ Show all ${projects.length} active projects`}
        </button>
      </div>
    </div>
  );
}
