"use client";

// /society — the TRUE Society charter: the covenant (a smart contract you sign), the creed
// (why passivity has no place here), and the application (the mailing list). Membership is
// earned, not granted. High privilege, high standard — a scenius of builders.

import { useState } from "react";
import { TRUE_TENETS, CREED } from "@/content/society";
import { CREATOR, CREATOR_URL, REPO_URL } from "@/components/MadeWith";

export default function Society() {
  const [f, setF] = useState({ name: "", email: "", portfolio: "", contribution: "", agree: false });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);

  // TRUE standing — measured from your live portfolio, mapped to your leverage.
  const [surl, setSurl] = useState("");
  const [checking, setChecking] = useState(false);
  type St = { overall: number; tier: string; leverage: number; byTenet: Record<string, number>; gaps: string[] };
  const [st, setSt] = useState<{ standing?: St; error?: string } | null>(null);
  async function checkStanding() {
    if (!surl.trim()) return;
    setChecking(true); setSt(null);
    try {
      const r = await fetch("/api/standing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: surl.trim() }) });
      setSt(await r.json());
    } catch (e) { setSt({ error: (e as Error).message }); }
    setChecking(false);
  }

  async function apply() {
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      setRes(await r.json());
    } catch (e) { setRes({ error: (e as Error).message }); }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent2">Invite-only · earned, not granted</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">The TRUE Society</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        A selective society of builders who ship things that are <strong className="text-ink">TRUE</strong> — for humans
        and for agents. Not a place to lurk, complain, or coast. Your standing is <em>proven by your artifacts</em>, and it
        rises only when you build and lift others. Make an <a href="/make" className="text-accent hover:underline">agentic
        portfolio</a>, contribute, and you&apos;re on our radar.
      </p>

      {/* ── The smart contract ── */}
      <section className="mt-12">
        <h2 className="section-title">The TRUE covenant — the contract you sign</h2>
        <p className="mt-1 text-sm text-muted">Each tenet is measurable from real artifacts — belonging is proven, not asserted. And it binds your agent as much as you.</p>
        <div className="mt-6 grid gap-4">
          {TRUE_TENETS.map((t) => (
            <div key={t.key} className="card">
              <div className="mb-1 flex items-baseline gap-3">
                <span className="text-2xl font-black text-accent">{t.key}</span>
                <h3 className="text-lg font-semibold text-ink">{t.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-ink">{t.gist}</p>
              <div className="mt-3 grid gap-1.5 text-sm">
                <p className="text-muted"><span className="text-accent">you:</span> {t.human}</p>
                <p className="text-muted"><span className="text-accent2">your agent:</span> {t.agent}</p>
                <p className="text-muted"><span className="text-accent">proof:</span> {t.proof}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUE standing — measured, not vibes ── */}
      <section className="mt-12">
        <h2 className="section-title">Your TRUE standing = your leverage</h2>
        <p className="mt-1 text-sm text-muted">Standing is <em>computed from your live portfolio</em>, not asserted. It maps to your <strong className="text-ink">leverage</strong> — how much AI + trust you can mobilize to make a dream true in a fraction of the time. Passivity decays it.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input value={surl} onChange={(e) => setSurl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkStanding()} placeholder="https://your-portfolio-url (make one at /make)" className="min-w-[16rem] flex-1 rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
          <button onClick={checkStanding} disabled={checking} className="chip border-accent/50 text-accent disabled:opacity-50">{checking ? "Measuring…" : "Check my standing"}</button>
        </div>
        {st?.error && <p className="mt-2 text-sm text-red-500">{st.error}</p>}
        {st?.standing && (
          <div className="mt-4 card grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-ink">{st.standing.leverage}×</div>
              <div className="text-xs uppercase tracking-widest text-accent">leverage · {st.standing.tier}</div>
              <div className="mt-1 text-xs text-muted">standing {st.standing.overall}/100</div>
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(st.standing.byTenet).map(([k, v]) => (
                  <span key={k} className="chip border-edge text-muted"><span className="font-black text-accent">{k}</span> {v}</span>
                ))}
              </div>
              {st.standing.gaps.length > 0 && (
                <ul className="grid gap-1 text-sm text-muted">
                  {st.standing.gaps.slice(0, 4).map((g, i) => <li key={i}><span className="text-accent">rise:</span> {g}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── The creed / culture ── */}
      <section className="mt-12">
        <h2 className="section-title">The creed</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {CREED.map((c) => (
            <div key={c.title} className="card">
              <h3 className="font-semibold text-ink">{c.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Apply (the mailing list) ── */}
      <section className="mt-12">
        <h2 className="section-title">Apply</h2>
        <p className="mt-1 text-sm text-muted">Applying isn&apos;t admission — membership is earned. Tell us the ONE thing you&apos;ll build or 10X first.</p>
        {res?.ok ? (
          <div className="mt-6 card border-accent2/40 bg-accent2/5">
            <p className="text-ink">✓ {res.message}</p>
            <p className="mt-2 text-sm text-muted">Now go build it — then <a href="/network" className="text-accent hover:underline">join the network</a> and ship your first 10X.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name *" className="rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email * (the society's dispatch)" className="rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
            <input value={f.portfolio} onChange={(e) => setF({ ...f, portfolio: e.target.value })} placeholder="Your agentic portfolio URL (make one at /make)" className="rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
            <textarea value={f.contribution} onChange={(e) => setF({ ...f, contribution: e.target.value })} rows={3} placeholder="The ONE thing you'll build or 10X first * (a skill, a theme, an instance, a fix — and who it helps)" className="rounded-theme border border-edge bg-surface p-3 text-sm text-ink" />
            <label className="flex items-start gap-2 text-sm text-muted">
              <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} className="mt-1" />
              <span>I agree to the TRUE covenant: I build things that are Transferable, Reusable, Understandable, and Experienceable — for humans and agents — I turn complaints into 10X, and I accept that passivity forfeits my standing.</span>
            </label>
            <div className="flex items-center gap-3">
              <button onClick={apply} disabled={busy} className="chip border-accent/50 text-accent disabled:opacity-50">{busy ? "Sending…" : "Apply to the Society"}</button>
              {res?.error && <span className="text-sm text-red-500">{res.error}</span>}
            </div>
          </div>
        )}
      </section>

      <p className="mt-12 text-sm text-muted">
        Founded by <a href={CREATOR_URL} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">{CREATOR}</a> ·
        built on <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">agentic-portfolio</a> (open source, free).
      </p>
    </main>
  );
}
