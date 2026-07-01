"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PracticesMindmap — the 12X Future Practices as a 1→3→12 mindmap. A thin ADAPTER over
// the generic <Mindmap>: it maps the cluster/practice data (content/practices-map.ts) into
// Mindmap's leaves and supplies the TRUE detail panel as the render-prop. No tree/expand
// logic lives here — that's the shared component's job.
// ─────────────────────────────────────────────────────────────────────────────

import { Mindmap, type MindmapCluster } from "@/components/Mindmap";
import { CLUSTERS, PRACTICE_DETAILS, TRUE_LEGEND, type PracticeDetail, type TrueKey } from "@/content/practices-map";

type Practice = { n: number; name: string; body: string };

function TruePanel({ detail, body }: { detail: PracticeDetail; body: string }) {
  return (
    <div className="mt-2 grid gap-2 rounded-theme border border-edge bg-surface/60 p-3 text-sm">
      <p className="italic leading-relaxed text-muted">{body}</p>
      <div className="grid gap-1.5">
        {TRUE_LEGEND.map(({ key, title }) => (
          <p key={key} className="leading-relaxed">
            <span className="chip mr-2 border-accent/50 text-accent">{key}</span>
            <span className="font-medium text-ink">{title}:</span> <span className="text-muted">{detail.facets[key as TrueKey]}</span>
          </p>
        ))}
      </div>
      <div className="mt-1 grid gap-1 border-t border-edge pt-2 sm:grid-cols-2">
        <p className="text-muted"><span className="font-medium text-accent2">For you:</span> {detail.human}</p>
        <p className="text-muted"><span className="font-medium text-accent2">For an agent:</span> {detail.agent}</p>
      </div>
    </div>
  );
}

const TrueLegend = (
  <>
    Click any practice to expand. Each must be <strong className="text-ink">TRUE</strong>:{" "}
    <strong className="text-ink">T</strong>ransferable&nbsp;&amp;&nbsp;Transformative ·{" "}
    <strong className="text-ink">R</strong>eusable&nbsp;&amp;&nbsp;Refinable ·{" "}
    <strong className="text-ink">U</strong>nderstandable&nbsp;&amp;&nbsp;U-loop (Theory&nbsp;U) ·{" "}
    <strong className="text-ink">E</strong>xperienceable&nbsp;&amp;&nbsp;Experimentable — for a{" "}
    <span className="text-accent2">human</span> and for an <span className="text-accent2">agent</span> (skill / plugin / dynamic workflow / hook).
  </>
);

export function PracticesMindmap({ practices }: { practices: Practice[] }) {
  const byN = new Map(practices.map((p) => [p.n, p]));

  const clusters: MindmapCluster[] = CLUSTERS.map((c) => ({
    id: c.id,
    glyph: c.glyph,
    label: c.label,
    gist: c.gist,
    leaves: c.ns.map((n) => ({ id: String(n), label: byN.get(n)?.name ?? `Practice ${n}`, badge: String(n) })),
  }));

  const renderDetail = (leafId: string) => {
    const n = Number(leafId);
    const p = byN.get(n);
    const detail = PRACTICE_DETAILS[n];
    return p && detail ? <TruePanel detail={detail} body={p.body} /> : null;
  };

  return <Mindmap rootEyebrow="How I compound" rootTitle="1 → 3 → 12" clusters={clusters} renderDetail={renderDetail} legend={TrueLegend} />;
}
