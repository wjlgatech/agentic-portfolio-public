"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Deepen.tsx — the "Deep Dives" section. Presents the distilled knowledge + tools that
// super-u's flywheel (kgfy + skillfy) handed this node via POST /api/ingest-knowledge.
// The node RECEIVES + GROUNDS + PRESENTS + EDUCATES — it does not build graphs or forge
// skills (docs/DEEPEN-PIPELINE.md). So this is PURELY presentational: no on-page tools, no
// "deepen this" button (orchestration lives in super-u's flywheel, not the node).
//
// MINIMALIST: each card shows the ESSENCE (source + plain-language digest = "educate me")
// and tucks the knowledge-graph preview + the extracted skills behind ONE disclosure. A
// forged skill is shown UNPROVEN until super-u's outcome loop verifies it (the honesty rule).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { artifactStats, type DeepenFeed, type DeepenArtifact } from "@core/deepen-types";

function Card({ a }: { a: DeepenArtifact }) {
  const [open, setOpen] = useState(false);
  const s = artifactStats(a);
  const isSeed = a.producedBy === "seed-example";

  return (
    <div className="card grid gap-4">
      {/* ── ESSENCE: source + digest (educate) ─────────────────────────────────── */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <a href={a.source.url} target="_blank" rel="noreferrer" className="text-lg font-semibold text-ink underline decoration-edge hover:decoration-accent">
            {a.source.title}
          </a>
          <span className="chip border-edge text-muted">{a.source.kind}</span>
        </div>
        {a.digest && <p className="text-sm leading-relaxed text-ink">{a.digest}</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip border-edge text-muted">{s.nodes} concepts · {s.edges} links</span>
          <span className="chip border-edge text-muted">{s.skills} skill{s.skills === 1 ? "" : "s"}{s.skills ? ` · ${s.proven} proven` : ""}</span>
          {a.graph.graphUrl && (
            <a href={a.graph.graphUrl} target="_blank" rel="noreferrer" className="chip border-accent/50 text-accent">explore the full graph →</a>
          )}
        </div>
      </div>

      {(a.graph.nodes.length > 0 || a.skills.length > 0) && (
        <button onClick={() => setOpen((o) => !o)} className="justify-self-start text-sm font-medium text-accent">
          {open ? "▾ Hide the map + skills" : `▸ Show the ${s.nodes}-concept map + ${s.skills} skill${s.skills === 1 ? "" : "s"}`}
        </button>
      )}

      {open && (
        <div className="grid gap-5">
          {/* ── Knowledge-graph preview: nodes as chips + key edges as sentences ──── */}
          {a.graph.nodes.length > 0 && (
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase tracking-widest text-accent">Knowledge map{a.graph.title ? ` — ${a.graph.title}` : ""}</p>
              <div className="flex flex-wrap gap-1.5">
                {a.graph.nodes.map((n) => (
                  <span key={n.id} className="chip border-edge text-muted" title={n.summary}>{n.name}</span>
                ))}
              </div>
              {a.graph.edges.length > 0 && (
                <ul className="grid gap-1 text-sm text-muted">
                  {a.graph.edges.slice(0, 10).map((e, i) => {
                    const src = a.graph.nodes.find((n) => n.id === e.source)?.name ?? e.source;
                    const tgt = a.graph.nodes.find((n) => n.id === e.target)?.name ?? e.target;
                    return (
                      <li key={i}><span className="text-ink">{src}</span> <span className="text-accent">{e.type}</span> <span className="text-ink">{tgt}</span></li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ── Extracted skills (skillfy) — honest edges + proven/unproven badge ─── */}
          {a.skills.length > 0 && (
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase tracking-widest text-accent">Extracted skills</p>
              {a.skills.map((sk) => (
                <div key={sk.id} className="card">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{sk.name}</span>
                    <span className="chip border-edge text-muted">{sk.kind}</span>
                    <span className={`chip ${sk.verified ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500"}`}>
                      {sk.verified ? "✅ proven" : "⚠ unproven"}
                    </span>
                  </div>
                  {sk.oneLine && <p className="text-sm text-ink">{sk.oneLine}</p>}
                  {sk.mechanism && <p className="mt-1 text-sm text-muted"><span className="text-accent">mechanism:</span> {sk.mechanism}</p>}
                  {sk.characteristicMove && <p className="mt-1 text-sm text-muted"><span className="text-accent">the move:</span> {sk.characteristicMove}</p>}
                  {sk.notGoodAt.length > 0 && (
                    <p className="mt-1 text-sm text-muted"><span className="text-accent">not good at:</span> {sk.notGoodAt.join("; ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted">
            {isSeed
              ? "Sample deep-dive (hand-built from the public repo + paper as the worked example). Real dives arrive via super-u's flywheel → POST /api/ingest-knowledge."
              : `Distilled by ${a.producedBy}${a.generatedAt ? ` · ${new Date(a.generatedAt).toLocaleDateString()}` : ""}.`}
            {a.source.discoveredVia ? " Discovered via a shared post." : ""} Skills are shown unproven until an outcome confirms them.
          </p>
        </div>
      )}
    </div>
  );
}

export function Deepen({ feed }: { feed: DeepenFeed }) {
  if (feed.artifacts.length === 0) {
    return <div className="card text-muted"><p>No deep dives yet — super-u&apos;s flywheel posts distilled knowledge + skills here.</p></div>;
  }
  return (
    <div className="grid gap-5">
      {feed.artifacts.map((a) => <Card key={a.id} a={a} />)}
    </div>
  );
}
