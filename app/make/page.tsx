"use client";

// /make — the non-technical Portfolio Maker. Fill a short form → 1 click → your agentic portfolio
// is live (hosted on the shared network, no code, no deploy). Friendly, low-pressure, honest.

import { useEffect, useState } from "react";
import { CREATOR, CREATOR_URL, REPO_URL } from "@/components/MadeWith";
import { SharePanel } from "@/components/SharePanel";

type Result = { url?: string; hosted?: boolean; slug?: string; pack?: unknown; note?: string; source?: "resume" | "linkedin" | "thin"; error?: string; tagline?: string; ownerUrl?: string; referredBy?: string | null };

export default function Make() {
  const [f, setF] = useState({ name: "", email: "", linkedin: "", resume: "", x: "", fb: "", ig: "", github: "", youtube: "" });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [ref, setRef] = useState(""); // who invited you (?ref=<slug>) — public handle, never a contact list
  const [example, setExample] = useState(CREATOR_URL); // a portfolio you want yours to look like (a style reference)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setRef((q.get("ref") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48));
    const ex = (q.get("example") || "").trim();
    if (/^https?:\/\//i.test(ex)) setExample(ex.slice(0, 200)); // an example portfolio to model yours on
  }, []);

  async function make() {
    if (!f.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { setRes({ error: "Please add your name and a valid email." }); return; }
    if (f.resume.trim().length < 40 && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(f.linkedin.trim())) {
      setRes({ error: "Add your LinkedIn profile URL OR paste a few lines of your résumé — either one works." }); return;
    }
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/make", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, ref }) });
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
            <p className="text-muted">It&apos;s live and already discoverable on the network — no code, no deploy.{res.source === "linkedin" ? " Built from your public LinkedIn." : ""}</p>
            {res.note && <p className="rounded-theme border border-edge bg-surface p-3 text-sm text-muted">ℹ️ {res.note}</p>}
            <div className="card flex flex-wrap items-center gap-3 border-accent/30 bg-accent/5">
              <a href={live} target="_blank" rel="noreferrer" className="text-lg font-semibold text-accent hover:underline">{live}</a>
              <button onClick={() => { navigator.clipboard?.writeText(live); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="chip border-accent/50 text-accent">{copied ? "copied ✓" : "copy link"}</button>
              <a href={live} target="_blank" rel="noreferrer" className="chip border-accent2/50 text-accent2">open it →</a>
            </div>
            <p className="text-sm text-muted">Put it in your bio, or <a href="/network" className="text-accent hover:underline">browse the network</a> you just joined. It has its own AI agent — recruiters can just ask it about you.</p>
            {res.ownerUrl && (
              <div className="card border-amber-400/40 bg-amber-400/5">
                <p className="text-sm font-semibold text-ink">🔑 Your private owner link — save this now</p>
                <p className="mt-1 text-xs text-muted">Open this once to become the <strong className="text-ink">owner</strong> of your portfolio (manage it + see who your agent captured). Anyone without it is just a visitor. We show it only once and can&apos;t recover it — re-making rotates it.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="max-w-full overflow-x-auto rounded bg-surface px-2 py-1 text-xs text-ink">{res.ownerUrl}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(res.ownerUrl!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="chip border-accent/50 text-accent">{copied ? "copied ✓" : "copy owner link"}</button>
                </div>
              </div>
            )}
            <div className="card border-accent2/30 bg-accent2/5">
              <p className="text-sm font-semibold text-ink">Now grow your network — share it 👇</p>
              <p className="mt-1 text-xs text-muted">Grab your thumbnail + a ready-made caption, and post in one click. Every person who makes their own from your portfolio lifts your TRUE standing — this is how 1 becomes 2 becomes 4, without ever touching anyone&apos;s contacts.</p>
              <SharePanel url={live} name={f.name} tagline={res.tagline || ""} className="mt-3" />
            </div>
            {res?.referredBy && <p className="text-xs text-muted">You were invited by <span className="text-ink">{res.referredBy}</span> — you just lifted their standing. Pay it forward. 🌱</p>}
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
        Fill in your name, email, and <strong className="text-ink">either your LinkedIn URL or a few lines about yourself</strong> —
        click once, and you get a live portfolio with its own AI agent, hosted on <a href="/network" className="text-accent hover:underline">the network</a>. No code. No cost.
      </p>
      <p className="mt-1 text-xs text-muted">Built on <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">agentic-portfolio</a> by <a href={CREATOR_URL} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">{CREATOR}</a>.</p>

      {/* Model yours on an example — a live portfolio you like. It's a style reference: your CONTENT
          comes from your résumé/LinkedIn below; every portfolio here shares this structure. */}
      <div className="mt-6 card border-accent/30 bg-accent/5">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-ink">✨ Make one like this example</span>
          <div className="flex flex-wrap items-center gap-2">
            <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="https://a-portfolio-you-like" className="min-w-[14rem] flex-1 rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />
            {/^https?:\/\//i.test(example) && <a href={example} target="_blank" rel="noreferrer" className="chip border-accent/50 text-accent">open example ↗</a>}
          </div>
          <span className="text-xs text-muted">Open it to see the style you&apos;ll get. Yours will look like this, <strong className="text-ink">customized to your résumé or LinkedIn</strong> below — every portfolio here shares this structure.</span>
        </label>
      </div>

      <div className="mt-6 grid gap-5">
        <Field label="Your name *" k="name" ph="Jane Doe" />
        <Field label="Email *" k="email" ph="jane@example.com" hint="Used only to key your portfolio (re-run to update it). Not shown publicly." />
        <Field label="LinkedIn profile — or paste your résumé below" k="linkedin" ph="https://www.linkedin.com/in/…" hint="We auto-fill from your PUBLIC profile (best-effort — no login, we never post as you). If LinkedIn blocks it, just paste a few lines below." />
        <Field label="Your résumé / about you" k="resume" ph="Optional if you gave LinkedIn above. Paste your résumé or a few paragraphs about your work, skills, and highlights…" hint="The more real detail here, the richer your agent. Either this OR LinkedIn is enough to start." textarea />
        <details className="text-sm" open>
          <summary className="cursor-pointer text-accent">+ links to keep your portfolio auto-fresh</summary>
          <div className="mt-3 grid gap-3">
            <Field label="GitHub" k="github" ph="https://github.com/yourname" hint="Your recent repos sync in automatically." />
            <Field label="YouTube channel" k="youtube" ph="https://youtube.com/@yourchannel" hint="Your latest videos sync in (public RSS, no login)." />
            <Field label="X / Twitter" k="x" ph="https://x.com/…" hint="Linked only — X can't be auto-synced (paid/login)." />
            <Field label="Facebook" k="fb" ph="https://facebook.com/…" />
            <Field label="Instagram" k="ig" ph="https://instagram.com/…" />
          </div>
          <p className="mt-2 text-xs text-muted">GitHub + YouTube <strong className="text-ink">auto-sync</strong> to keep your portfolio current (1-click or on a schedule). LinkedIn &amp; X can&apos;t be pulled server-side — you add those in your browser.</p>
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
