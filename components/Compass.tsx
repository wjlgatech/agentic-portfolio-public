"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Compass.tsx — the proactive "Next Projects" section. Renders the scout's moves
// along FOUR growth vectors (deepen / widen / lengthen / heighten — each grounded in
// a named strategy framework) plus REACH (collaborators). Each item is a drafted next
// move (a first step / a suggested intro) the owner acts on — human-in-the-loop,
// nothing auto-sends. The owner can "Scout now"; else the GitHub Action refreshes it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { GROWTH_VECTORS, PROJECT_KINDS, ideaCount, type CompassReport, type ProjectIdea, type ProjectKind, type CollaboratorLead } from "@core/compass-types";

// deepen/heighten = the ABSTRACT poles (accent); widen/lengthen = the CONCRETE poles (accent2).
const VECTOR_TONE: Record<ProjectKind, string> = {
  deepen: "border-accent/50 text-accent",
  heighten: "border-accent/50 text-accent",
  widen: "border-accent2/50 text-accent2",
  lengthen: "border-accent2/50 text-accent2",
};

function IdeaCard({ idea }: { idea: ProjectIdea }) {
  const v = GROWTH_VECTORS[idea.kind];
  return (
    <div className="card">
      <div className="mb-1 flex items-center gap-2">
        <span className={`chip ${VECTOR_TONE[idea.kind]}`}>{v.glyph} {v.label.toLowerCase()}</span>
        {idea.basis && <span className="font-mono text-xs text-muted">{idea.basis}</span>}
      </div>
      <h4 className="font-semibold text-ink">{idea.title}</h4>
      {idea.rationale && <p className="mt-1 text-sm leading-relaxed text-muted">{idea.rationale}</p>}
      {idea.firstStep && (
        <p className="mt-2 text-sm text-ink"><span className="text-accent">first step:</span> {idea.firstStep}</p>
      )}
    </div>
  );
}

// The legend that grounds each vector in its named framework — so "Next Projects" reads
// as a researched growth model, not four arbitrary buckets.
function VectorLegend() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {PROJECT_KINDS.map((k) => {
        const v = GROWTH_VECTORS[k];
        return (
          <div key={k} className="rounded-theme border border-edge bg-surface/60 p-3">
            <p className="text-sm font-semibold text-ink">{v.glyph} {v.label}</p>
            <p className="mt-0.5 text-xs text-muted">{v.gist}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">{v.framework}</p>
          </div>
        );
      })}
    </div>
  );
}

function CollaboratorCard({ c }: { c: CollaboratorLead }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between gap-2">
        <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-ink underline decoration-edge hover:decoration-accent">@{c.handle}</a>
        {c.sharedGround && <span className="font-mono text-xs text-muted">{c.sharedGround}</span>}
      </div>
      {c.whyMatch && <p className="text-sm leading-relaxed text-muted">{c.whyMatch}</p>}
      {c.suggestedIntro && (
        <div className="mt-3 rounded-theme border border-edge bg-surface/60 p-3">
          <p className="text-sm italic leading-relaxed text-ink">“{c.suggestedIntro}”</p>
          <button
            onClick={() => { navigator.clipboard?.writeText(c.suggestedIntro).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            className="mt-2 text-xs text-accent hover:underline"
          >
            {copied ? "copied ✓" : "copy intro"}
          </button>
        </div>
      )}
    </div>
  );
}

export function Compass({ report, isOwner }: { report: CompassReport; isOwner: boolean }) {
  const [open, setOpen] = useState(false);

  const ideas = PROJECT_KINDS.flatMap((k) => report[k]); // all four vectors, in canonical order
  const empty = ideas.length + report.collaborators.length === 0;
  const when = report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "never";
  const featured = ideas[0];
  const rest = ideas.slice(1);
  const hasMore = rest.length + report.collaborators.length > 0;

  // The scout TOOL lives in the agent — one quiet hint instead of an inline button.
  const ownerHint = isOwner && (
    <p className="text-xs text-muted">Owner? Ask the agent (bottom-right): <em>“scout my next projects”</em> — it drafts moves across the four vectors, never sends.</p>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>Runs <strong className="text-ink">{report.cadence || "weekly"}</strong> · last scouted {when}</span>
        {report.model === "seed-example" && <span className="chip border-edge text-muted">sample</span>}
      </div>

      {empty ? (
        <>
          <div className="card text-muted"><p>No scout run yet.</p></div>
          {ownerHint}
        </>
      ) : (
        <>
          {/* ── ESSENCE: the four-vector legend + one featured move (always visible) ─ */}
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">Four growth vectors</p>
            <VectorLegend />
          </div>
          {featured && <IdeaCard idea={featured} />}

          {/* ── ONE disclosure: the rest of the moves + Reach (collaborators) ─────── */}
          {hasMore && (
            <>
              <button onClick={() => setOpen((o) => !o)} className="justify-self-start text-sm font-medium text-accent">
                {open ? "▾ Hide" : `▸ Show all ${ideas.length} moves${report.collaborators.length ? ` + ${report.collaborators.length} collaborators` : ""}`}
              </button>
              {open && (
                <div className="grid gap-6">
                  {rest.length > 0 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {rest.map((idea, i) => <IdeaCard key={`${idea.kind}${i}`} idea={idea} />)}
                    </div>
                  )}
                  {report.collaborators.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">⇢ Reach — collaborators</p>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {report.collaborators.map((c, i) => <CollaboratorCard key={i} c={c} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {report.note && <p className="text-xs text-muted">{report.note}</p>}
          {ownerHint}
          <p className="text-xs text-muted">
            Drafted for your approval — nothing is sent automatically.
            {report.model && report.model !== "seed-example" ? ` · model ${report.model}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
