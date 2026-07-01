"use client";

// Presentational section bodies extracted from Portfolio.tsx (which was a 1,100+ line
// god-component). These are pure: data in, cards out — no state, no actions — so they're
// easy to read, reuse, and (later) snapshot-test. Portfolio.tsx's renderBody() now just
// routes to these.

import type { SectionItem } from "@/lib/portfolio";

type Practice = { n: number; name: string; body: string };
type ValueItem = { title: string; body: string };

export function PracticesGrid({ practices }: { practices: Practice[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {practices.map((p) => (
        <div key={p.n} className="card">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-mono text-accent">{String(p.n).padStart(2, "0")}</span>
            <h3 className="font-semibold text-ink">{p.name}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">{p.body}</p>
        </div>
      ))}
    </div>
  );
}

export function ValuesAndLove({ values, love }: { values: ValueItem[]; love: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <div key={v.title} className="card">
            <h3 className="mb-1 font-semibold text-ink">{v.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{v.body}</p>
          </div>
        ))}
      </div>
      <div className="card border-accent/40 bg-accent/5">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">What I love</p>
        <p className="text-lg leading-relaxed text-ink">{love}</p>
      </div>
    </div>
  );
}

// Body for an agent-created custom section: a grid of item cards.
export function CustomSectionBody({ items }: { items: SectionItem[] }) {
  if (items.length === 0) return <p className="text-muted">This section is empty — tell the agent what to add.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => {
        const inner = (
          <>
            <div className="mb-1 flex items-center gap-2">
              {it.tag && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">{it.tag}</span>}
              <h3 className="font-semibold text-ink">{it.title}</h3>
            </div>
            {it.body && <p className="text-sm leading-relaxed text-muted">{it.body}</p>}
          </>
        );
        return it.url ? (
          <a key={i} href={it.url} target="_blank" rel="noreferrer" className="card block hover:border-accent">{inner}</a>
        ) : (
          <div key={i} className="card">{inner}</div>
        );
      })}
    </div>
  );
}
