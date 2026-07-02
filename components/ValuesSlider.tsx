"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ValuesSlider — the "Values & Love" section as a horizontal card slider (same UX + styling as
// PracticesSlider). Self-evident: the section header names it, the chips ARE the two parts
// (How I work · Who it's for), each card is a value you click to open its detail. No prose.
// Bodies from profile.ts (values + love, override-editable); details from content/values-map.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { VALUE_CLUSTERS, VALUE_DETAILS, LOVE_TITLE } from "@/content/values-map";

type Value = { title: string; body: string };

// value title → its part label (How I work / Who it's for), for the card label + the filter.
const PART_OF = new Map<string, string>();
for (const c of VALUE_CLUSTERS) for (const t of c.titles) PART_OF.set(t, c.label);

export function ValuesSlider({ values, love }: { values: Value[]; love: string }) {
  const [active, setActive] = useState("All");
  const rowRef = useRef<HTMLDivElement>(null);

  const byTitle = new Map(values.map((v) => [v.title, v.body]));
  const bodyFor = (title: string) => (title === LOVE_TITLE ? love : byTitle.get(title) ?? "");

  // Left → right by part (How I work → Who it's for), preserving each part's own order.
  const ordered: Value[] = VALUE_CLUSTERS.flatMap((c) => c.titles.map((t) => ({ title: t, body: bodyFor(t) })));
  const list = active === "All" ? ordered : ordered.filter((v) => PART_OF.get(v.title) === VALUE_CLUSTERS.find((c) => c.id === active)?.label);

  const slide = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  return (
    <div>
      {/* Chips = the two parts. Arrows = scroll. Nothing to explain. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {["All", ...VALUE_CLUSTERS.map((c) => c.id)].map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`chip ${active === id ? "chip-active" : "text-muted hover:text-ink"}`}
          >
            {id === "All" ? "All" : VALUE_CLUSTERS.find((c) => c.id === id)!.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => slide(-1)} aria-label="Scroll left" className="chip text-muted hover:border-accent hover:text-ink">‹</button>
          <button onClick={() => slide(1)} aria-label="Scroll right" className="chip text-muted hover:border-accent hover:text-ink">›</button>
        </span>
      </div>

      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3"
        style={{ scrollbarWidth: "thin" }}
      >
        {list.map((v) => {
          const detail = VALUE_DETAILS[v.title];
          return (
            <div key={v.title} className="card flex w-72 shrink-0 snap-start flex-col sm:w-80">
              <span className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{PART_OF.get(v.title)}</span>
              <h3 className="mb-1.5 font-semibold leading-snug text-ink">{v.title}</h3>
              {v.body && <p className="text-sm leading-relaxed text-muted">{v.body}</p>}
              {detail && (
                <details className="mt-auto pt-4 text-sm">
                  <summary className="cursor-pointer list-none text-xs text-muted transition-colors hover:text-accent">
                    how it lives ↓
                  </summary>
                  <div className="mt-3 grid gap-2 leading-relaxed text-muted">
                    <p><span className="text-accent">Lived</span> — {detail.lived}</p>
                    <p><span className="text-accent">In the work</span> — {detail.inWork}</p>
                    <p><span className="text-accent2">For an agent</span> — {detail.forAgent}</p>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
