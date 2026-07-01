"use client";

// ─────────────────────────────────────────────────────────────────────────────
// JobFit.tsx — the "Role Fit" section. Paste a job-posting URL (or the JD text) and the
// agent scores how well the role fits the owner across THREE axes — past experience,
// current skillset, and future mission/value/vision trajectory — grounded in the same
// corpus the rest of the site is. MINIMALIST: the page shows the ESSENCE (overall fit +
// level + the honest one-line call + top gap) and tucks the per-axis breakdown behind ONE
// disclosure. Presentational only; the scoring runs server-side (/api/job-fit).
//
// CREDIBILITY is the feature: a "trust badge" shows how often this scorer agrees with a
// human-labeled GOLDEN set (content/jobfit-eval.json), so a verdict carries a measured
// accuracy, not just an opinion. Honest by design — a misaligned role scores low, and the
// gaps (why it might NOT fit) sit right next to the score.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { FIT_AXES, FIT_LEVELS, type JobFit as JobFitReport, type FitEval, type FitLevel } from "@core/jobfit-types";

// Level hues: semantic status colors (not theme tokens), mid-shade so they read on light + dark.
const LEVEL_CLASS: Record<FitLevel, string> = {
  strong: "border-emerald-500/50 text-emerald-500",
  promising: "border-amber-500/50 text-amber-500",
  stretch: "border-orange-500/50 text-orange-500",
  misaligned: "border-edge text-muted",
};
const levelMeta = (id: FitLevel) => FIT_LEVELS.find((l) => l.id === id)!;
const axisMeta = (id: string) => FIT_AXES.find((a) => a.id === id)!;

export function JobFit({
  fit,
  evalReport,
  onScore,
}: {
  fit: JobFitReport;
  evalReport: FitEval;
  onScore: (input: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const has = fit.axes.length > 0;
  const lvl = levelMeta(fit.level);

  async function run() {
    const v = input.trim();
    if (v.length < 6) { setNote("Paste a job-posting URL, or the full JD text."); return; }
    setBusy(true);
    setNote(/^https?:\/\//i.test(v) || (!/\s/.test(v) && /\./.test(v)) ? "Fetching the posting + scoring against the corpus…" : "Scoring the JD against the corpus…");
    setNote(await onScore(v));
    setBusy(false);
  }

  // The credibility badge — how the scorer did against the human-labeled golden set.
  const trust = evalReport.n > 0 ? (
    <div className="card border-accent/30 bg-accent/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">Why trust this</p>
        <span className="font-mono text-sm text-ink">{evalReport.within1}/{evalReport.n} within one band · {evalReport.accuracy}%</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        This scorer is itself held to the standard it holds JDs to: it was run over a {evalReport.n}-example
        <strong className="text-ink"> golden set</strong> with human-assigned fit labels and agreed within one band
        {" "}{evalReport.accuracy}% of the time ({evalReport.exactMatches} exact). Verify, don’t vibe.
      </p>
      <button onClick={() => setShowEval((s) => !s)} className="mt-2 text-sm font-medium text-accent">
        {showEval ? "▾ Hide the eval" : "▸ Show the golden-set eval"}
      </button>
      {showEval && (
        <ul className="mt-3 grid gap-1.5 text-sm">
          {evalReport.examples.map((e, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-2 rounded-theme border border-edge bg-surface/60 p-2">
              <span>{e.hit ? "✅" : "❌"}</span>
              <span className="text-ink">{e.title}</span>
              <span className="ml-auto font-mono text-xs text-muted">
                want {e.expected} · got {e.predicted} ({e.overall})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    <p className="text-xs text-muted">Scorer not yet evaluated against the golden set — run <code>node scripts/eval-jobfit.mjs</code>.</p>
  );

  // The public scoring input — always visible.
  const panel = (
    <div className="card border-accent/30">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">Score a role against me</p>
      <p className="mt-1 text-sm text-muted">
        Paste a job-posting URL (Ashby/Greenhouse/Lever, fetched live) or the JD text. The agent scores fit across
        past <span className="text-ink">experience</span>, current <span className="text-ink">skillset</span>, and
        future <span className="text-ink">mission/values/vision</span> — and tells you, honestly, where it doesn’t fit.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="https://jobs.ashbyhq.com/…  — or paste the full job description"
        className="mt-3 w-full rounded-theme border border-edge bg-surface p-3 text-sm text-ink"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={run} disabled={busy} className="chip border-accent/50 text-accent disabled:opacity-50">
          {busy ? "Scoring…" : "Score fit"}
        </button>
        {note && <span className="text-sm text-muted">{note}</span>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5">
      {panel}
      {trust}

      {!has ? (
        <div className="card text-muted"><p>No role scored yet — paste a posting above to see the fit breakdown.</p></div>
      ) : (
        <>
          {/* ── ESSENCE: overall fit + the honest call + top gap ─────────────────── */}
          <div className="card grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-ink">{fit.overall}<span className="text-2xl text-muted">/100</span></div>
              <div className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${LEVEL_CLASS[fit.level]}`}>{lvl.icon} {lvl.label}</div>
            </div>
            <div className="grid gap-2">
              <p className="text-lg leading-snug text-ink">
                {fit.job.title}{fit.job.company ? ` · ${fit.job.company}` : ""}
              </p>
              {fit.recommendation && <p className="text-sm"><span className="text-accent">the call:</span> <span className="text-ink">{fit.recommendation}</span></p>}
              {fit.honestGaps.length > 0 && (
                <p className="text-sm text-muted"><span className="text-accent">honest gap:</span> {fit.honestGaps[0]}</p>
              )}
              {/* the three axis scores at a glance */}
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                {fit.axes.map((a) => (
                  <span key={a.axis} className="chip border-edge text-muted">{axisMeta(a.axis).label}: <span className="ml-1 font-mono text-ink">{a.score}</span></span>
                ))}
              </div>
            </div>
          </div>

          {/* ── ONE disclosure: the per-axis breakdown ───────────────────────────── */}
          <button onClick={() => setOpen((o) => !o)} className="justify-self-start text-sm font-medium text-accent">
            {open ? "▾ Hide the breakdown" : "▸ Show the 3-axis breakdown"}
          </button>

          {open && (
            <div className="grid gap-4">
              {fit.axes.map((a) => {
                const m = axisMeta(a.axis);
                return (
                  <div key={a.axis} className="card">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">{m.label}</span>
                      <span className="font-mono text-sm text-muted">{a.score}/100 · w{m.weight}</span>
                    </div>
                    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-edge/40">
                      <div className="h-full bg-accent" style={{ width: `${a.score}%` }} />
                    </div>
                    {a.rationale && <p className="text-sm leading-relaxed text-ink">{a.rationale}</p>}
                    {a.evidence.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-sm">
                        {a.evidence.map((e, j) => (
                          <li key={j} className="text-muted"><span className="text-accent">evidence:</span> <span className="text-ink">{e}</span></li>
                        ))}
                      </ul>
                    )}
                    {a.gaps.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-sm">
                        {a.gaps.map((g, j) => (
                          <li key={j} className="text-muted"><span className="text-accent">gap:</span> {g}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted">
            Scored {fit.generatedAt ? new Date(fit.generatedAt).toLocaleDateString() : ""} · model {fit.model || "—"}
            {fit.job.source ? ` · source: ${fit.job.source}` : ""}. The overall score is computed in code from the axis
            scores, never taken from the model.
          </p>
        </>
      )}
    </div>
  );
}
