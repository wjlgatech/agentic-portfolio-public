"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Receipts.tsx — the "Resume Verification" section. MINIMALIST: the page shows the
// ESSENCE (the corroboration score + headline + verdict counts + the single top gap),
// and tucks the full audit (by-category, the gap punch-list, the per-claim breakdown)
// behind ONE "show the audit" disclosure. The owner TOOLS (verify a résumé, generate a
// verified résumé) live in the Copilot agent — not as forms on the page — so a visitor
// gets a clean, scannable proof and the owner drives depth by chat. Presentational only.
//
// Honesty is still the feature (12X #4): unverified/contradicted counts sit right next
// to the green ones, and the top gap is shown up front.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { VERDICT_META, type VerificationReport, type Verdict } from "@core/verification-types";

// Verdict colors are semantic status hues (green/amber/red), deliberately not theme
// tokens — and chosen mid-shade so they read on both light (swiss) and dark (vercel) brands.
const VERDICT_CLASS: Record<Verdict, string> = {
  corroborated: "border-emerald-500/50 text-emerald-500",
  partial: "border-amber-500/50 text-amber-500",
  unverified: "border-edge text-muted",
  contradicted: "border-red-500/50 text-red-500",
};

export function Receipts({ report, isOwner, onVerify }: { report: VerificationReport; isOwner: boolean; onVerify: (resume: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [resume, setResume] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");

  const has = report.claims.length > 0;
  const s = report.summary;
  // The punch-list: every non-corroborated claim + the concrete thing that would close it.
  const gaps = report.claims.filter((c) => c.verdict !== "corroborated" && c.gapCloser);

  async function runVerify() {
    if (resume.trim().length < 40) { setVerifyNote("Paste the full résumé text (a few lines at least)."); return; }
    setBusy(true);
    setVerifyNote("Auditing each claim against live public GitHub…");
    setVerifyNote(await onVerify(resume.trim()));
    setBusy(false);
  }

  // The public self-proof input — paste a résumé and watch it audited live. Always visible.
  const pastePanel = (
    <div className="card border-accent/30">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">Verify it yourself</p>
      <p className="mt-1 text-sm text-muted">
        Skeptical? Paste a résumé — mine, or any — and watch each claim audited live against real public GitHub.
        Honest by design: unprovable claims come back <span className="text-ink">unverified</span>, never rubber-stamped.
      </p>
      <textarea
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={5}
        placeholder="Paste résumé / CV text here…"
        className="mt-3 w-full rounded-theme border border-edge bg-surface p-3 text-sm text-ink"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={runVerify} disabled={busy} className="chip border-accent/50 text-accent disabled:opacity-50">
          {busy ? "Verifying…" : "Verify résumé"}
        </button>
        {verifyNote && <span className="text-sm text-muted">{verifyNote}</span>}
      </div>
      <p className="mt-2 text-xs text-muted">
        Your run is shown here in your browser; it doesn’t change the published proof{isOwner ? " — except yours, as owner, which publishes." : "."}
      </p>
    </div>
  );

  // The owner's loop-closer (drafting a verified résumé) still lives in the agent.
  const ownerHint = isOwner && (
    <p className="text-xs text-muted">
      Owner? After verifying, ask the agent (bottom-right): <em>“generate a verified résumé”</em> — it drafts from your verified claims only, never sends.
    </p>
  );

  if (!has) {
    return (
      <div className="grid gap-5">
        {pastePanel}
        <div className="card text-muted"><p>No résumé has been verified yet — paste one above to see the audit.</p></div>
        {ownerHint}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {pastePanel}
      {/* ── ESSENCE: the scorecard + the one top gap (always visible) ─────────── */}
      <div className="card grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="text-center">
          <div className="text-5xl font-extrabold text-ink">{s.overallScore}<span className="text-2xl text-muted">/100</span></div>
          <div className="mt-1 text-xs uppercase tracking-widest text-accent">Corroboration index</div>
        </div>
        <div className="grid gap-3">
          <p className="text-lg leading-relaxed text-ink">{s.headline}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(VERDICT_META) as Verdict[]).map((v) =>
              s.counts[v] > 0 ? (
                <span key={v} className={`chip ${VERDICT_CLASS[v]}`}>{VERDICT_META[v].icon} {s.counts[v]} {VERDICT_META[v].label}</span>
              ) : null,
            )}
          </div>
          {gaps.length > 0 && (
            <p className="text-sm text-muted">
              <span className="text-accent">top gap:</span> {gaps[0].claim} — <span className="text-ink">{gaps[0].gapCloser}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── ONE disclosure: the full audit ───────────────────────────────────── */}
      <button onClick={() => setOpen((o) => !o)} className="justify-self-start text-sm font-medium text-accent">
        {open ? "▾ Hide the audit" : `▸ Show the ${report.claims.length}-claim audit`}
      </button>

      {open && (
        <div className="grid gap-6">
          {/* By category */}
          {s.byCategory.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.byCategory.map((c) => (
                <div key={c.category} className="card">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="font-medium capitalize text-ink">{c.category}</span>
                    <span className="font-mono text-sm text-muted">{c.corroborated}/{c.total}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-edge/40">
                    <div className="h-full bg-accent" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Close the loop — the gap punch-list (decision: prove / fix / drop, then re-verify) */}
          {gaps.length > 0 && (
            <div className="card border-accent/30 bg-accent/5">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">Close the loop</p>
              <p className="mb-3 text-sm text-muted">For each unproven claim: <strong className="text-ink">prove</strong> it (add the evidence), <strong className="text-ink">fix</strong> the wording to match reality, or <strong className="text-ink">drop</strong> it — then re-verify (ask the agent).</p>
              <ul className="grid gap-2 text-sm">
                {gaps.map((c, i) => (
                  <li key={i} className="rounded-theme border border-edge bg-surface/60 p-3">
                    <span className="mr-1">{VERDICT_META[c.verdict].icon}</span>
                    <span className="text-ink">{c.claim}</span>
                    <span className="mt-1 block text-muted"><span className="text-accent">to close it:</span> {c.gapCloser}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-claim breakdown */}
          <div className="grid gap-4">
            {report.claims.map((c, i) => (
              <div key={i} className="card">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`chip ${VERDICT_CLASS[c.verdict]}`}>{VERDICT_META[c.verdict].icon} {VERDICT_META[c.verdict].label}</span>
                  <span className="chip border-edge text-muted capitalize">{c.category}</span>
                  {c.inferred && <span className="chip border-edge text-muted">inferred</span>}
                  <span className="ml-auto font-mono text-xs text-muted">{Math.round(c.confidence * 100)}% conf.</span>
                </div>
                <p className="font-medium text-ink">{c.claim}</p>
                {c.context && <p className="mt-1 text-sm leading-relaxed text-muted">{c.context}</p>}
                {c.evidence.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {c.evidence.map((e, j) => (
                      <li key={j} className="text-muted">
                        <span className="text-accent">{e.type === "external-needed" ? "needs" : "evidence"}:</span>{" "}
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noreferrer" className="text-ink underline decoration-edge hover:decoration-accent">{e.ref}</a>
                        ) : (
                          <span className="text-ink">{e.ref}</span>
                        )}{" "}
                        — {e.detail}
                      </li>
                    ))}
                  </ul>
                )}
                {c.gapCloser && (
                  <p className="mt-2 text-sm text-muted"><span className="text-accent">closes the gap:</span> {c.gapCloser}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ownerHint}

      {/* Provenance */}
      <p className="text-xs text-muted">
        {report.model === "seed-example"
          ? "Sample receipts (built from public repos). Ask the agent to verify a real résumé."
          : `Verified ${report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : ""} · model ${report.model || "—"}`}
        {report.resumePreview ? ` · source: “${report.resumePreview.slice(0, 90)}…”` : ""}
      </p>
    </div>
  );
}
