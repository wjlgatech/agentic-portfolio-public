// ─────────────────────────────────────────────────────────────────────────────
// opengraph-image — the "amazing thumbnail" for a hosted portfolio, generated dynamically from the
// person's real name + tagline (shared renderer in lib/og). Next auto-wires it as og:image +
// twitter:image for /p/<slug>, so every link a user shares unfurls a branded 1200×630 card with
// zero work. Downloadable at /p/<slug>/opengraph-image. Graceful: unknown slug → a generic card.
// ─────────────────────────────────────────────────────────────────────────────
import { kvGetJSON } from "@/lib/storage";
import { validateInstance, type InstanceConfig } from "@core/instance-types";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agentic portfolio — ask my AI";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let c: InstanceConfig | null = null;
  try {
    const raw = await kvGetJSON<unknown>(`portfolio:${slug}`);
    const v = raw ? validateInstance(raw) : null;
    c = v?.ok && v.config ? v.config : null;
  } catch { /* KV unavailable → generic card */ }

  return ogCard({
    eyebrow: "🤖 agentic portfolio · ask my AI",
    title: c?.entity.name || "Agentic Portfolio",
    subtitle: c?.entity.tagline || "An AI agent that answers for me, 24/7.",
    cta: "Ask my agent anything →",
  });
}
