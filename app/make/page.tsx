"use client";

// /make — the non-technical Portfolio Maker. Fill a short form → 1 click → your agentic portfolio
// is live (hosted on the shared network, no code, no deploy). Friendly, low-pressure, honest.

import { useEffect, useState } from "react";
import { CREATOR, CREATOR_URL, REPO_URL } from "@/components/MadeWith";
import { SharePanel } from "@/components/SharePanel";
import { categorySpec, MAKE_CATEGORIES, type MakeCategory } from "@core/make-category";

type SourceReport = { source: string; status: "pulled" | "blocked" | "walled" | "empty"; items?: number; note: string };
type Result = { url?: string; hosted?: boolean; slug?: string; pack?: unknown; note?: string; source?: "resume" | "linkedin" | "public" | "thin"; sources?: SourceReport[]; error?: string; tagline?: string; ownerUrl?: string; referredBy?: string | null };

// Per-source pull report — the honest answer to "why is my page thin?": what was read,
// what was blocked, what's login-walled by design (with the paste-to-include escape hatch).
const STATUS_ICON: Record<SourceReport["status"], string> = { pulled: "✅", blocked: "⚠️", walled: "🔒", empty: "◻️" };
function SourcePullReport({ sources }: { sources: SourceReport[] }) {
  if (!sources.length) return null;
  return (
    <div className="card">
      <p className="text-sm font-semibold text-ink">What we pulled from your sources</p>
      <ul className="mt-2 grid gap-1.5">
        {sources.map((s) => (
          <li key={s.source} className="text-xs text-muted">
            {STATUS_ICON[s.status]} <strong className="text-ink">{s.source}</strong> — {s.note}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Who is this page for? One pipeline, three intakes (labels + grounding wording swap; the
// engine difference lives in @core/make-category). MODULE-SCOPE data, not a component.
const CATEGORY_META: Record<MakeCategory, { chip: string; blurb: string; demo: { slug: string; label: string }[] }> = {
  individual: { chip: "🧑‍💻 Me (a person)", blurb: "engineer · nurse · artist · any professional", demo: [{ slug: "demo-artist", label: "🎨 artist" }] },
  business: { chip: "🏪 My business", blurb: "dentist · roofer · shop · practice", demo: [{ slug: "demo-dentist", label: "🦷 dentist" }, { slug: "demo-roofer", label: "🏠 roofer" }] },
  community: { chip: "🤝 My community", blurb: "church · prayer group · running club", demo: [{ slug: "demo-church", label: "⛪ church" }, { slug: "demo-running-club", label: "🏃 running club" }] },
};

// MODULE-SCOPE (stable identity). Defining this INSIDE Make() remounts the input on every
// keystroke → focus is lost after each character. Keep it out here; pass value + onChange.
function Field({ label, value, onChange, ph, hint, textarea }: {
  label: string; value: string; ph: string; hint?: string; textarea?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {textarea
        ? <textarea value={value} onChange={onChange} rows={6} placeholder={ph} className="rounded-theme border border-edge bg-surface p-3 text-sm text-ink" />
        : <input value={value} onChange={onChange} placeholder={ph} className="rounded-theme border border-edge bg-surface px-3 py-2 text-sm text-ink" />}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export default function Make() {
  const [f, setF] = useState({ name: "", email: "", linkedin: "", resume: "", x: "", fb: "", ig: "", github: "", youtube: "", website: "" });
  const [category, setCategory] = useState<MakeCategory>("individual");
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
    // Enough to ground on = your own words OR any READABLE source (LinkedIn public metadata,
    // your website, GitHub, YouTube). X/IG/FB are login-walled → links only, never grounding.
    const liOk = category === "individual" && /^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(f.linkedin.trim());
    const pullable = liOk || [f.website, f.github, f.youtube].some((u) => /^https?:\/\//i.test(u.trim()));
    if (f.resume.trim().length < 40 && !pullable) {
      setRes({ error: categorySpec(category).intake.groundingError }); return;
    }
    setBusy(true); setRes(null);
    try {
      const r = await fetch("/api/make", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, ref, category }) });
      setRes(await r.json());
    } catch (e) { setRes({ error: (e as Error).message }); }
    setBusy(false);
  }

  if (res?.url || (res && res.hosted === false)) {
    const live = res.url;
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">✨ Your portfolio is ready!</h1>
        {live ? (
          <div className="mt-6 grid gap-4">
            <p className="text-muted">It&apos;s live and already discoverable on the network — no code, no deploy.{res.source === "linkedin" ? " Built from your public LinkedIn." : res.source === "public" ? " Built from your public sources." : ""}</p>
            {res.note && <p className="rounded-theme border border-edge bg-surface p-3 text-sm text-muted">ℹ️ {res.note}</p>}
            {res.sources && <SourcePullReport sources={res.sources} />}
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

      {/* Category chips — one pipeline, three intakes. Plain buttons (never a component defined
          in here — that's the focus-loss bug); the wording below swaps from @core/make-category. */}
      <div className="mt-6 grid gap-2">
        <span className="text-sm font-medium text-ink">This page is for…</span>
        <div className="flex flex-wrap gap-2">
          {MAKE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? "border-accent text-accent" : "border-edge text-muted"}`} title={CATEGORY_META[c].blurb}>
              {CATEGORY_META[c].chip}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">
          {CATEGORY_META[category].blurb} · see a live demo:{" "}
          {CATEGORY_META[category].demo.map((d, i) => (
            <span key={d.slug}>{i > 0 && " · "}<a href={`/p/${d.slug}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{d.label} ↗</a></span>
          ))}
        </span>
      </div>

      <div className="mt-6 grid gap-5">
        <Field label={category === "individual" ? "Your name *" : category === "business" ? "Business name *" : "Community name *"} value={f.name} onChange={set("name")} ph={category === "individual" ? "Jane Doe" : category === "business" ? "Brightside Dental Studio" : "Riverside Running Crew"} />
        <Field label="Email *" value={f.email} onChange={set("email")} ph="jane@example.com" hint="Used only to key your page (re-run to update it). Not shown publicly." />
        {category === "individual" && (
          <Field label="LinkedIn profile — or paste your résumé below" value={f.linkedin} onChange={set("linkedin")} ph="https://www.linkedin.com/in/…" hint="We auto-fill from your PUBLIC profile (best-effort — no login, we never post as you). If LinkedIn blocks it, just paste a few lines below." />
        )}
        <Field label={categorySpec(category).intake.aboutLabel} value={f.resume} onChange={set("resume")} ph={categorySpec(category).intake.aboutPlaceholder} hint={category === "individual" ? "The more real detail here, the richer your agent. Either this OR LinkedIn is enough to start." : "The more real detail here, the richer your agent. Plain words beat marketing copy."} textarea />
        <details className="text-sm" open>
          <summary className="cursor-pointer text-accent">+ links to keep your portfolio auto-fresh</summary>
          <div className="mt-3 grid gap-3">
            <Field label="Website / blog" value={f.website} onChange={set("website")} ph="https://yoursite.com" hint="We READ your site's public text right now and ground your page on it." />
            <Field label="GitHub" value={f.github} onChange={set("github")} ph="https://github.com/yourname" hint="Your recent repos are pulled in right now, and keep syncing." />
            <Field label="YouTube channel" value={f.youtube} onChange={set("youtube")} ph="https://youtube.com/@yourchannel" hint="Your latest videos are pulled in right now (public RSS, no login), and keep syncing." />
            <Field label="X / Twitter" value={f.x} onChange={set("x")} ph="https://x.com/…" hint="Linked only — X is login-walled; paste your best posts in the About box to include them." />
            <Field label="Facebook" value={f.fb} onChange={set("fb")} ph="https://facebook.com/…" hint="Linked only (login-walled)." />
            <Field label="Instagram" value={f.ig} onChange={set("ig")} ph="https://instagram.com/…" hint="Linked only (login-walled) — paste highlights in the About box to include them." />
          </div>
          <p className="mt-2 text-xs text-muted">Website + GitHub + YouTube are <strong className="text-ink">read at make time</strong> and ground your page; GitHub + YouTube also <strong className="text-ink">auto-sync</strong> to keep it current. LinkedIn, X, Facebook &amp; Instagram are login-walled — no server can read them, so they stay links (paste your highlights instead; it&apos;s honest by design).</p>
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
