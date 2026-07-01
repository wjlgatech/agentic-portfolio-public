// ─────────────────────────────────────────────────────────────────────────────
// opengraph-image — the "amazing thumbnail" for a hosted portfolio, generated dynamically
// (next/og) from the person's real name + tagline. Next auto-wires it as og:image + twitter:image
// for /p/<slug>, so EVERY link a user shares (X, LinkedIn, Facebook, Slack, Discord) unfurls a
// branded 1200×630 card with zero manual work. Also downloadable at /p/<slug>/opengraph-image for
// platforms that don't unfurl (YouTube/Instagram). Graceful: unknown slug → a generic brand card.
// ─────────────────────────────────────────────────────────────────────────────
import { ImageResponse } from "next/og";
import { kvGetJSON } from "@/lib/storage";
import { validateInstance, type InstanceConfig } from "@core/instance-types";

export const runtime = "nodejs";
export const alt = "Agentic portfolio — ask my AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let c: InstanceConfig | null = null;
  try {
    const raw = await kvGetJSON<unknown>(`portfolio:${slug}`);
    const v = raw ? validateInstance(raw) : null;
    c = v?.ok && v.config ? v.config : null;
  } catch { /* KV unavailable → generic card */ }

  const name = c?.entity.name || "Agentic Portfolio";
  const tagline = c?.entity.tagline || "An AI agent that answers for me, 24/7.";

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
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#9b9bd0" }}>
          <span style={{ fontSize: 40 }}>🤖</span>
          <span>agentic portfolio · ask my AI</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: name.length > 22 ? 76 : 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }}>{name}</div>
          <div style={{ fontSize: 40, color: "#c9c9e8", maxWidth: 980, lineHeight: 1.25 }}>
            {tagline.length > 120 ? tagline.slice(0, 117) + "…" : tagline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
          <span style={{ color: "#7dd3fc" }}>Ask my agent anything →</span>
          <span style={{ color: "#7a7aa8" }}>made free · agentic-portfolio</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
