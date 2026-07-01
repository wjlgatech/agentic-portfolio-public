// ─────────────────────────────────────────────────────────────────────────────
// lib/og.tsx — one shared share-card renderer (next/og) so every page's thumbnail speaks the same
// visual language: dark gradient, an eyebrow, a big title, a subtitle, and a CTA/foot row. Each
// route's `opengraph-image.tsx` is a thin wrapper that calls `ogCard(...)`. Import ONLY from
// opengraph-image route files (server image generation). 1200×630 — the standard OG/Twitter size.
// ─────────────────────────────────────────────────────────────────────────────
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT = "agentic-portfolio";

type Card = {
  eyebrow: string;   // small top line (with an emoji)
  title: string;     // the big headline
  subtitle?: string; // one supporting line
  cta?: string;      // bottom-left accent line
  accent?: string;   // hex for eyebrow + cta (per-page color)
};

export function ogCard({ eyebrow, title, subtitle = "", cta = "Ask my agent anything →", accent = "#7dd3fc" }: Card): ImageResponse {
  const titleSize = title.length > 28 ? 72 : title.length > 18 ? 88 : 100;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "72px 80px",
          background: "linear-gradient(135deg, #0b0b12 0%, #171733 55%, #0d0d1a 100%)",
          color: "#f5f5fa", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: accent }}>
          <span>{eyebrow}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
          {subtitle ? (
            <div style={{ fontSize: 40, color: "#c9c9e8", maxWidth: 1000, lineHeight: 1.25 }}>
              {subtitle.length > 120 ? subtitle.slice(0, 117) + "…" : subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
          <span style={{ color: accent }}>{cta}</span>
          <span style={{ color: "#7a7aa8" }}>made free · agentic-portfolio</span>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
