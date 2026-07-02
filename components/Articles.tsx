"use client";

import { useRef, useState } from "react";
import { linkedinActivityTimeMs, orderByRecency } from "@/lib/linkedin";

export type Article = {
  title: string;
  url: string;
  date: string;
  category: string;
  summary: string;
};

function whenLabel(a: Article): string {
  const ms = linkedinActivityTimeMs(a.url);
  if (ms != null) return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return a.date || "";
}

export function Articles({
  articles,
  isOwner = false,
  onSync,
  linkedInTip,
}: {
  articles: Article[];
  isOwner?: boolean;
  onSync?: () => Promise<string>;
  linkedInTip?: string;
}) {
  const categories = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];
  const [active, setActive] = useState("All");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const rowRef = useRef<HTMLDivElement>(null);

  async function handleSync() {
    if (!onSync || syncing) return;
    setSyncing(true);
    setSyncMsg("Syncing your feeds…");
    try {
      setSyncMsg(await onSync());
    } catch {
      setSyncMsg("Sync failed — try again.");
    } finally {
      setSyncing(false);
    }
  }

  // Owner sync controls — server feeds (Substack/Medium/RSS) + the in-browser LinkedIn harvest.
  const controls = isOwner && (onSync || linkedInTip) ? (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {onSync && (
          <button onClick={handleSync} disabled={syncing} className="chip text-accent hover:border-accent disabled:opacity-50" title="Pull new posts from your Substack/Medium/RSS feeds">
            {syncing ? "⟳ Syncing…" : "⟳ Sync feeds"}
          </button>
        )}
        {linkedInTip && (
          <button onClick={() => setSyncMsg(linkedInTip)} className="chip text-muted hover:border-accent hover:text-ink" title="LinkedIn is login-walled — harvest it in your own browser">
            in Sync from LinkedIn
          </button>
        )}
      </div>
      {syncMsg && <p className="mt-2 text-sm text-muted">{syncMsg}</p>}
    </div>
  ) : null;

  if (articles.length === 0) {
    return (
      <div>
        {controls}
        <p className="text-muted">
          Articles coming soon — {isOwner ? "hit ⟳ Sync feeds above, or " : "just "}tell the agent{" "}
          <span className="text-accent">“add my LinkedIn article …”</span>, or edit{" "}
          <code className="text-accent">content/portfolio.yaml</code>.
        </p>
      </div>
    );
  }

  // Filter by category, then order newest-first (most recent on the LEFT). orderByRecency
  // uses decoded publish time where available and slots undatable posts into feed order,
  // so a brand-new post with no decodable id still lands on the left, not buried at the end.
  const list = orderByRecency(active === "All" ? articles : articles.filter((a) => a.category === active));

  const slide = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  return (
    <div>
      {controls}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`chip ${active === c ? "chip-active" : "text-muted hover:text-ink"}`}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted sm:inline">{list.length} posts · newest first →</span>
          <button onClick={() => slide(-1)} aria-label="Scroll to newer" className="chip text-ink hover:border-accent">‹</button>
          <button onClick={() => slide(1)} aria-label="Scroll to older" className="chip text-ink hover:border-accent">›</button>
        </span>
      </div>

      {/* Horizontal slider — one row, scroll/snap left↔right, most recent on the left. */}
      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {list.map((a) => (
          <a
            key={a.url || a.title}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="card block w-72 shrink-0 snap-start sm:w-80"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{a.category}</span>
              {whenLabel(a) && <span className="whitespace-nowrap text-xs text-muted">{whenLabel(a)}</span>}
            </div>
            <h3 className="mb-1 line-clamp-2 font-semibold text-ink">{a.title}</h3>
            <p className="line-clamp-4 text-sm text-muted">{a.summary}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
