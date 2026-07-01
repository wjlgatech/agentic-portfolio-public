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

export function Projects({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  // PRs per repo in the last 30 days (live GitHub) — loads after mount; grid still
  // sorts by date until it arrives, then "Active" ranking becomes meaningful.
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [prWindow, setPrWindow] = useState(30);

  useEffect(() => {
    let off = false;
    fetch("/api/repo-activity")
      .then((r) => r.json())
      .then((d) => { if (!off && d && d.counts) { setPrs(d.counts); setPrWindow(d.windowDays ?? 30); } })
      .catch(() => { /* leave empty — date sort still works */ });
    return () => { off = true; };
  }, []);

  const cats = CATEGORY_ORDER.filter((c) => c === "All" || projects.some((p) => p.category === c));

  let list = active === "All" ? projects : projects.filter((p) => p.category === active);
  if (!showAll) list = list.filter((p) => p.featured);

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
        </span>
      </div>

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
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">view →</a>}
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
