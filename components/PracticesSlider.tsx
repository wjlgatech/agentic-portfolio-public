"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticesSlider — the 12X Future Practices as a horizontal card slider (same UX as the
// Writing section). Self-evident by design: the section header names the theme, the chips
// ARE the three parts (Aim · Loop · Compound), and each card is a practice you click to open
// its TRUE detail. No explanatory prose. Pure data in content/practices-map.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import { CLUSTERS, PRACTICE_DETAILS, TRUE_LEGEND, type TrueKey } from "@/content/practices-map";

type Practice = { n: number; name: string; body: string };

// practice number → its part (Aim / Loop / Compound), for the card label + the filter.
const PART_OF = new Map<number, string>();
for (const c of CLUSTERS) for (const n of c.ns) PART_OF.set(n, c.label);

export function PracticesSlider({ practices }: { practices: Practice[] }) {
  const [active, setActive] = useState("All");
  const rowRef = useRef<HTMLDivElement>(null);

  // Left → right by part (Aim → Loop → Compound), preserving each part's own order.
  const ordered: Practice[] = CLUSTERS.flatMap((c) =>
    c.ns.map((n) => practices.find((p) => p.n === n)).filter((p): p is Practice => !!p),
  );
  const list = active === "All" ? ordered : ordered.filter((p) => PART_OF.get(p.n) === CLUSTERS.find((c) => c.id === active)?.label);

  const slide = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: "smooth" });
  };

  return (
    <div>
      {/* Chips = the three parts. Arrows = scroll. Nothing to explain. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {["All", ...CLUSTERS.map((c) => c.id)].map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`chip ${active === id ? "chip-active" : "text-muted hover:text-ink"}`}
          >
            {id === "All" ? "All" : CLUSTERS.find((c) => c.id === id)!.label}
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
        {list.map((p) => {
          const detail = PRACTICE_DETAILS[p.n];
          return (
            <div key={p.n} className="card flex w-72 shrink-0 snap-start flex-col sm:w-80">
              <span className="mb-3 text-xs font-medium uppercase tracking-wider text-accent">{PART_OF.get(p.n)}</span>
              <h3 className="mb-1.5 font-semibold leading-snug text-ink">{p.name}</h3>
              <p className="text-sm leading-relaxed text-muted">{p.body}</p>
              {detail && (
                <details className="mt-auto pt-4 text-sm">
                  <summary className="cursor-pointer list-none text-xs text-muted transition-colors hover:text-accent">
                    the TRUE test ↓
                  </summary>
                  <div className="mt-3 grid gap-2 leading-relaxed text-muted">
                    {TRUE_LEGEND.map(({ key, title }) => (
                      <p key={key}>
                        <span className="font-semibold text-accent">{key}</span>{" "}
                        <span className="text-ink">{title}</span> — {detail.facets[key as TrueKey]}
                      </p>
                    ))}
                    <p className="mt-1"><span className="text-accent2">For you</span> — {detail.human}</p>
                    <p><span className="text-accent2">For an agent</span> — {detail.agent}</p>
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
