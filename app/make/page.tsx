"use client";

// /make — the non-technical Portfolio Maker. Fill a short form → 1 click → your agentic portfolio
// is live (hosted on the shared network, no code, no deploy). Friendly, low-pressure, honest.

import { useState } from "react";
import { CREATOR, CREATOR_URL, REPO_URL } from "@/components/MadeWith";

type Result = { url?: string; hosted?: boolean; slug?: string; pack?: unknown; note?: string; error?: string };

export default function Make() {
  const [f, setF] = useState({ name: "", email: "", linkedin: "", resume: "", x: "", fb: "", ig: "" });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function make() {
    if (!f.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { setRes({ error: "Please add your name and a valid email." }); return; }
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/make", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      setRes(await r.json());
    } catch (e) { setRes({ error: (e as Error).message }); }
    setBusy(false);
  }

  const Field = ({ label, k, ph, hint, textarea }: { label: string; k: keyof typeof f; ph: string; hint?: string; textarea?: boolean }) => (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {textarea
        ? <textarea value={f[k]} onChange={set(k)} rows={6} placeholder={ph} className="rounded-theme border border-edge bg-surface p-3 text-sm text-ink" />
        : <input value={f[k]} onChange={set(k)} placeholder={ph} className="rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );

  if (res?.url || (res && res.hosted === false)) {
    const live = res.url;
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">✨ Your portfolio is ready!</h1>
        {live ? (
          <div className="mt-6 grid gap-4">
            <p className="text-muted">It&apos;s live and already discoverable on the network — no code, no deploy.</p>
            <div className="card flex flex-wrap items-center gap-3 border-accent/30 bg-accent/5">
              <a href={live} target="_blank" rel="noreferrer" className="text-lg font-semibold text-accent hover:underline">{live}</a>
              <button onClick={() => { navigator.clipboard?.writeText(live); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="chip border-accent/50 text-accent">{copied ? "copied ✓" : "copy link"}</button>
              <a href={live} target="_blank" rel="noreferrer" className="chip border-accent2/50 text-accent2">open it →</a>
            </div>
            <p className="text-sm text-muted">Share it, put it in your bio, or <a href="/network" className="text-accent hover:underline">browse the network</a> you just joined. It has its own AI agent — recruiters can just ask it about you.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            <p className="text-muted">This deploy has no shared host configured, so here&apos;s your portfolio <strong className="text-ink">pack</strong> to deploy yourself:</p>
            <button onClick={() => { const b = new Blob([JSON.stringify(res.pack, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${res.slug}.json`; a.click(); }} className="chip border-accent/50 text-accent w-fit">⬇ download {res.slug}.json</button>
            <p className="text-xs text-muted">{res.note}</p>
          </div>
        )}
        <div className="mt-6"><button onClick={() => setRes(null)} className="text-sm text-accent hover:underline">← make another</button></div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Make your agentic portfolio — free</h1>
      <p className="mt-3 text-muted">
        Fill this in, click once, and you get a live portfolio with its own AI agent that answers questions about you —
        grounded in what you paste, hosted on <a href="/network" className="text-accent hover:underline">the network</a>. No code. No cost.
      </p>
      <p className="mt-1 text-xs text-muted">Built on <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">agentic-portfolio</a> by <a href={CREATOR_URL} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">{CREATOR}</a>.</p>

      <div className="mt-8 grid gap-5">
        <Field label="Your name *" k="name" ph="Jane Doe" />
        <Field label="Email *" k="email" ph="jane@example.com" hint="Used only to key your portfolio (re-run to update it). Not shown publicly." />
        <Field label="LinkedIn profile" k="linkedin" ph="https://www.linkedin.com/in/…" hint="We link to it (we don't log in on your behalf)." />
        <Field label="Your résumé / about you *" k="resume" ph="Paste your résumé or a few paragraphs about your work, skills, and highlights…" hint="This is what your agent is grounded in — the more real detail, the better." textarea />
        <details className="text-sm">
          <summary className="cursor-pointer text-accent">+ optional social links</summary>
          <div className="mt-3 grid gap-3">
            <Field label="X / Twitter" k="x" ph="https://x.com/…" />
            <Field label="Facebook" k="fb" ph="https://facebook.com/…" />
            <Field label="Instagram" k="ig" ph="https://instagram.com/…" />
          </div>
        </details>
        <div className="flex items-center gap-3">
          <button onClick={make} disabled={busy} className="chip border-accent/50 text-accent disabled:opacity-50">{busy ? "Building your portfolio…" : "✨ Make my portfolio"}</button>
          {res?.error && <span className="text-sm text-red-500">{res.error}</span>}
        </div>
        <p className="text-xs text-muted">Honest by design: things you claim show as <em>unverified</em> until proven, and your agent won&apos;t make up facts.</p>
      </div>
    </main>
  );
}
