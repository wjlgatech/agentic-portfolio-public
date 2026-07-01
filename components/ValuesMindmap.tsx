"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ValuesMindmap — the "Values & Love" section as a 1→2→6 mindmap. The SECOND thin adapter
// over the generic <Mindmap> (same component as PracticesMindmap): it maps the value
// clusters (content/values-map.ts) into leaves and supplies a "lived / in the work / for an
// agent" detail panel. Bodies come from profile.ts (override-editable); "Love" → profile.love.
// ─────────────────────────────────────────────────────────────────────────────

import { Mindmap, type MindmapCluster } from "@/components/Mindmap";
import { VALUE_CLUSTERS, VALUE_DETAILS, LOVE_TITLE, type ValueDetail } from "@/content/values-map";

type Value = { title: string; body: string };

function ValuePanel({ body, detail }: { body: string; detail?: ValueDetail }) {
  return (
    <div className="mt-2 grid gap-2 rounded-theme border border-edge bg-surface/60 p-3 text-sm">
      {body && <p className="italic leading-relaxed text-muted">{body}</p>}
      {detail && (
        <div className="grid gap-1.5">
          <p className="leading-relaxed"><span className="font-medium text-accent">Lived:</span> <span className="text-muted">{detail.lived}</span></p>
          <p className="leading-relaxed"><span className="font-medium text-accent">In the work:</span> <span className="text-muted">{detail.inWork}</span></p>
          <p className="leading-relaxed"><span className="font-medium text-accent2">For an agent:</span> <span className="text-muted">{detail.forAgent}</span></p>
        </div>
      )}
    </div>
  );
}

const ValuesLegend = (
  <>
    Click any value to expand — how it's <span className="text-accent">lived</span>, how it shows up{" "}
    <span className="text-accent">in the work</span>, and how an <span className="text-accent2">agent</span> embodies it.
  </>
);

export function ValuesMindmap({ values, love }: { values: Value[]; love: string }) {
  const byTitle = new Map(values.map((v) => [v.title, v.body]));
  const bodyFor = (title: string) => (title === LOVE_TITLE ? love : byTitle.get(title) ?? "");

  const clusters: MindmapCluster[] = VALUE_CLUSTERS.map((c) => ({
    id: c.id,
    glyph: c.glyph,
    label: c.label,
    gist: c.gist,
    leaves: c.titles.map((t) => ({ id: t, label: t })),
  }));

  const renderDetail = (leafId: string) => <ValuePanel body={bodyFor(leafId)} detail={VALUE_DETAILS[leafId]} />;

  return <Mindmap rootEyebrow="The why under the work" rootTitle="Values & Love" clusters={clusters} renderDetail={renderDetail} legend={ValuesLegend} />;
}
