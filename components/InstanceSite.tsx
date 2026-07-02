// ─────────────────────────────────────────────────────────────────────────────
// InstanceSite.tsx — the VISUAL render for a non-portfolio instance (Instances).
// A server component that paints a different brand's site straight from its InstanceConfig:
// hero (entity + mission), principles (story), offerings (content), writing, and outcomes.
// The portfolio keeps its own rich, agent-editable <Portfolio>; this is the generic page
// every OTHER vertical gets for free — so a second config is a real site, not
// just a curl-able A2A endpoint. Theme applies via a data-theme wrapper (token seam).
// ─────────────────────────────────────────────────────────────────────────────
import type { InstanceConfig, SectionSpec, Verdict } from "@core/instance-types";

// Use the matching section's TITLE where the pack defined one, else a sensible fallback.
function headingFor(cfg: InstanceConfig, pred: (s: SectionSpec) => boolean, fallback: string): string {
  return cfg.sections.find((s) => s.visible !== false && pred(s))?.title ?? fallback;
}

// Semantic verdict hues (not theme tokens) — same mid-shades the Receipts section uses.
const VERDICT_HUE: Record<Verdict, string> = {
  corroborated: "border-emerald-500/50 text-emerald-500",
  partial: "border-amber-500/50 text-amber-500",
  unverified: "border-edge text-muted",
  contradicted: "border-red-500/50 text-red-500",
};

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      {eyebrow && <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">{eyebrow}</p>}
      <h2 className="section-title mb-8">{title}</h2>
      {children}
    </section>
  );
}

export function InstanceSite({ config }: { config: InstanceConfig }) {
  const c = config.content ?? { offerings: [], outcomes: [], writings: [] };
  const links = config.entity.links ?? {};
  const site = /^https?:/.test(links.site ?? "") ? links.site! : links.site ? `https://${links.site}` : "";

  // GEO: schema.org JSON-LD so AI answer engines + agents parse the business unambiguously.
  // Built from the instance config only (no fabrication). Offerings → an ItemList; FAQ from them.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: config.entity.name, description: config.entity.blurb || config.entity.tagline, ...(site ? { url: site } : {}) },
      { "@type": "WebSite", name: config.entity.name, ...(site ? { url: site } : {}) },
      ...(c.offerings.length
        ? [{ "@type": "ItemList", name: `${config.entity.name} offerings`, itemListElement: c.offerings.map((o, i) => ({ "@type": "ListItem", position: i + 1, name: o.name, description: o.summary || o.category })) }]
        : []),
    ],
  };

  // The theme is set on <html> by the layout (instance default) + the StyleSwitcher (live). This
  // wrapper deliberately carries NO data-theme, so switching styles actually takes effect here.
  return (
    <div className="min-h-screen bg-surface text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ── Hero / Mission ──────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-6xl px-5 pb-6 pt-20 sm:pt-28">
        <p className="mb-3 font-mono text-sm text-accent2">{config.vertical}{config.entity.location ? ` · ${config.entity.location}` : ""}</p>
        <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{config.entity.name}</h1>
        <p className="mt-3 text-lg text-muted sm:text-xl">{config.entity.tagline}</p>
        {config.entity.blurb && <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{config.entity.blurb}</p>}
        {config.story.mission && (
          <div className="mt-8 rounded-theme border border-edge bg-surface/70 p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-widest text-accent">Mission</p>
            <p className="text-lg leading-relaxed text-ink">{config.story.mission}</p>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          {Object.entries(links).map(([k, v]) => (
            <a key={k} href={/^https?:|^mailto:/.test(v) ? v : `https://${v}`} className="chip text-ink hover:border-accent" target="_blank" rel="noreferrer">{k}</a>
          ))}
          <span className="chip border-accent2/40 text-accent2">⌘ Ask the agent (bottom-right)</span>
        </div>
      </header>

      {/* ── Principles (story) ──────────────────────────────────────────────── */}
      {config.story.principles.length > 0 && (
        <Section title={headingFor(config, (s) => ["practices", "values"].includes(s.id) || /how|why|principle|value|method/i.test(s.title), "Principles")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.story.principles.map((p, i) => (
              <div key={i} className="card">
                <h3 className="font-semibold text-ink">{p.title}</h3>
                {p.body && <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Offerings (the main content: tracks / services / products / menu) ── */}
      {c.offerings.length > 0 && (
        <Section title={headingFor(config, (s) => s.id.startsWith("custom-") || s.id === "projects" || /track|course|offer|service|menu|product|project/i.test(s.title), "Offerings")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.offerings.map((o, i) => (
              <article key={i} className="card flex flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{o.name}</h3>
                  {o.private && <span className="shrink-0 rounded-full border border-edge px-2 py-0.5 text-[11px] text-muted">private</span>}
                </div>
                <p className="mb-1 text-xs uppercase tracking-wide text-accent2">{o.category}</p>
                {o.summary && <p className="flex-1 text-sm leading-relaxed text-muted">{o.summary}</p>}
                {o.url && !o.private && <a href={o.url} target="_blank" rel="noreferrer" className="mt-3 text-sm text-accent hover:underline">learn more →</a>}
              </article>
            ))}
          </div>
        </Section>
      )}

      {/* ── Writing (lessons / essays / posts) ──────────────────────────────── */}
      {c.writings.length > 0 && (
        <Section title={headingFor(config, (s) => s.id === "writing" || /writ|lesson|essay|post|blog/i.test(s.title), "Writing")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.writings.map((w, i) => (
              <a key={i} href={w.url} target="_blank" rel="noreferrer" className="card block">
                {w.category && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{w.category}</span>}
                <h3 className="mt-2 font-semibold text-ink">{w.title}</h3>
                {w.summary && <p className="mt-1 text-sm text-muted">{w.summary}</p>}
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* ── Outcomes (proof, with honest verdicts) ──────────────────────────── */}
      {c.outcomes.length > 0 && (
        <Section
          eyebrow="Evidence, honestly — unproven claims stay 'unverified'"
          title={headingFor(config, (s) => s.id === "receipts" || /outcome|receipt|proof|result|track.?record/i.test(s.title), config.proof.label || "Outcomes")}
        >
          <ul className="grid gap-3">
            {c.outcomes.map((o, i) => (
              <li key={i} className="card flex items-start gap-3">
                <span className={`chip ${VERDICT_HUE[o.verdict]} shrink-0`}>{o.verdict}</span>
                <span className="text-ink">{o.claim}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="mx-auto max-w-6xl px-5 py-12 text-sm text-muted">
        <p className="mb-2"><a className="text-accent hover:underline" href="/network">🌐 Explore the Portfolio Network →</a></p>
        <p>{config.entity.name} · an <strong className="text-ink">Instances</strong> site ({config.vertical}) · Next.js + CopilotKit, free-LLM survival chain. Ask the agent anything.</p>
      </footer>
    </div>
  );
}
