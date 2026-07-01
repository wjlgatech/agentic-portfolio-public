// ─────────────────────────────────────────────────────────────────────────────
// MakerLanding — the front door of the HOSTED maker deploy (rendered at `/` when MAKER_HOME is set).
// This deploy is the *maker service*, not anyone's personal portfolio — so the home page pitches
// "make your own in 60s" and sends non-technical people straight to /make. (A forker who deploys the
// template as their OWN portfolio leaves MAKER_HOME unset and gets the personal site instead.)
// Presentational server component; the global MadeWith footer + credit render below it via layout.
// ─────────────────────────────────────────────────────────────────────────────

const EXAMPLE_URL = "https://agentic-portfolio-lovat.vercel.app/";

const STEPS = [
  { n: "1", t: "Enter your basics", d: "Your name, email, and either a few lines of your résumé or just your LinkedIn URL. That's it." },
  { n: "2", t: "Click once", d: "We build you a live site with its own AI agent, grounded in what you gave — no code, no deploy." },
  { n: "3", t: "Share it — it stays fresh", d: "Recruiters just ask your agent. Add GitHub/YouTube and it auto-syncs your latest work." },
];

export function MakerLanding() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent2">Free · open source · no code</p>
      <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
        Make your own <span className="text-accent">agentic portfolio</span> in 60 seconds
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted sm:text-xl">
        Not a personal website — a living page with <strong className="text-ink">its own AI agent</strong> that answers
        questions about you, 24/7. Enter your basics, click once, and it&apos;s live. No code, no cost.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a href="/make" className="rounded-theme bg-accent px-6 py-3 text-base font-semibold text-white hover:opacity-90">✨ Make mine — free →</a>
        <a href={EXAMPLE_URL} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">See a live example ↗</a>
      </div>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="section-title">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card">
              <div className="text-2xl font-black text-accent">{s.n}</div>
              <h3 className="mt-1 font-semibold text-ink">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="mt-14">
        <h2 className="section-title">What you get</h2>
        <ul className="mt-5 grid gap-3 text-muted sm:grid-cols-2">
          <li className="card"><span className="text-ink">🤖 Your own AI agent</span> — answers about your work, grounded in your real material (never makes things up).</li>
          <li className="card"><span className="text-ink">🔒 You own it</span> — a private owner link; only you can manage it or see who your agent captured.</li>
          <li className="card"><span className="text-ink">🌐 On the network</span> — instantly discoverable, and other people&apos;s agents can query yours.</li>
          <li className="card"><span className="text-ink">🔄 Stays current</span> — auto-syncs your latest GitHub repos + YouTube videos.</li>
        </ul>
      </section>

      <div className="mt-14 rounded-theme border border-edge bg-surface p-6 text-center">
        <p className="text-lg font-semibold text-ink">Ready? It takes about a minute.</p>
        <a href="/make" className="mt-3 inline-block rounded-theme bg-accent px-6 py-3 text-base font-semibold text-white hover:opacity-90">✨ Make my agentic portfolio →</a>
        <p className="mt-4 text-sm text-muted">
          Or explore <a href="/network" className="text-accent hover:underline">the network</a> ·
          {" "}<a href="/society" className="text-accent hover:underline">the TRUE Society</a>
        </p>
      </div>
    </main>
  );
}
