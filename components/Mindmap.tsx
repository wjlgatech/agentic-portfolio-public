"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Mindmap — a reusable 1 → N-clusters → leaves tree with click-to-expand detail.
// SINGLE RESPONSIBILITY: it owns the layout + the "which leaf is open" state, nothing
// domain-specific. Callers inject the data (clusters/leaves) and a `renderDetail(leafId)`
// render-prop for the expanded panel — so Practices (TRUE) and Values (lived/in-work/agent)
// are thin adapters over the SAME component (DRY / open-closed). Theme-safe token cards.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, type ReactNode } from "react";

export type MindmapLeaf = { id: string; label: string; badge?: string };
export type MindmapCluster = { id: string; glyph?: string; label: string; gist?: string; leaves: MindmapLeaf[] };

// Literal class strings so Tailwind's content scan keeps them (no dynamic class names).
const COLS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

export function Mindmap({
  rootEyebrow,
  rootTitle,
  clusters,
  renderDetail,
  legend,
}: {
  rootEyebrow: string;
  rootTitle: string;
  clusters: MindmapCluster[];
  renderDetail: (leafId: string) => ReactNode;
  legend?: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const colClass = COLS[clusters.length] ?? "lg:grid-cols-3";

  return (
    <div className="grid gap-6">
      {/* ── Root (1) — the hub ───────────────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <div className="card inline-block border-accent/40 px-6 py-3 text-center">
          <p className="text-xs uppercase tracking-widest text-accent">{rootEyebrow}</p>
          <p className="font-semibold text-ink">{rootTitle}</p>
        </div>
        <div className="h-6 w-px bg-edge" aria-hidden />
      </div>

      {/* ── Clusters → leaves ────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${colClass}`}>
        {clusters.map((cluster) => (
          <div key={cluster.id} className="card border-t-2 border-t-accent/50">
            <div className="mb-3">
              <p className="font-semibold text-ink">{cluster.glyph ? `${cluster.glyph} ` : ""}{cluster.label}</p>
              {cluster.gist && <p className="text-xs text-muted">{cluster.gist}</p>}
            </div>
            <div className="grid gap-2">
              {cluster.leaves.map((leaf) => {
                const isOpen = open === leaf.id;
                return (
                  <div key={leaf.id}>
                    <button
                      onClick={() => setOpen(isOpen ? null : leaf.id)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center gap-2 rounded-theme border px-3 py-2 text-left text-sm transition-colors ${isOpen ? "border-accent/60 bg-accent/5" : "border-edge hover:border-accent/40"}`}
                    >
                      {leaf.badge && <span className="font-mono text-xs text-accent2">{leaf.badge}</span>}
                      <span className="flex-1 font-medium text-ink">{leaf.label}</span>
                      <span className="text-muted">{isOpen ? "▾" : "▸"}</span>
                    </button>
                    {isOpen && renderDetail(leaf.id)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {legend && <div className="text-xs leading-relaxed text-muted">{legend}</div>}
    </div>
  );
}
