"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Deepen.tsx — the "Deep Dives" section. Presents distilled knowledge + skills, AND (owner-only)
// lets you GENERATE a new one: paste a source URL → POST /api/deep-dive fetches it, distills a
// digest + knowledge graph + skills (grounded), and saves it to the knowledge base. Two producers
// write one store now: this on-page generator AND super-u's inbound flywheel (POST
// /api/ingest-knowledge); `producedBy` distinguishes them (docs/DEEPEN-PIPELINE.md).
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

export function Deepen({
  feed,
  isOwner = false,
  onDeepDive,
}: {
  feed: DeepenFeed;
  isOwner?: boolean;
  onDeepDive?: (source: string) => Promise<{ artifact?: DeepenArtifact; error?: string }>;
}) {
  const [items, setItems] = useState(feed.artifacts);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    if (!onDeepDive || busy || !source.trim()) return;
    setBusy(true);
    setMsg("Reading the source + distilling…");
    try {
      const r = await onDeepDive(source.trim());
      if (r.error) setMsg(r.error);
      else if (r.artifact) {
        const art = r.artifact;
        setItems((prev) => [art, ...prev.filter((a) => a.id !== art.id)]);
        setMsg(`Saved “${art.source.title}” to your knowledge base.`);
        setSource("");
      }
    } catch {
      setMsg("Deep dive failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      {/* Owner-only generator: enter a source → distill a digest + knowledge graph + skills → saved below. */}
      {isOwner && onDeepDive && (
        <div className="card grid gap-3">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Deep-dive a source</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="Paste a source URL — a repo, a paper, an article"
              className="min-w-0 flex-1 rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button onClick={run} disabled={busy || !source.trim()} className="chip text-accent hover:border-accent disabled:opacity-50">
              {busy ? "🔎 Distilling…" : "🔎 Deep Dive"}
            </button>
          </div>
          <p className="text-xs text-muted">Distills a plain-language digest + a knowledge graph + skills, grounded in the source, and saves it to your knowledge base.</p>
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-muted">
          <p>No deep dives yet{isOwner ? " — paste a source above to generate one." : " — distilled knowledge + skills show here."}</p>
        </div>
      ) : (
        items.map((a) => <Card key={a.id} a={a} />)
      )}
    </div>
  );
}
