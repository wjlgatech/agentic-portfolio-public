// ─────────────────────────────────────────────────────────────────────────────
// /api/badge — the self-propelling backlink engine. Returns a small SVG badge showing the
// LIVE network size ("🌐 agentic network · N nodes"). Every node embeds it (linking back to
// /network), so each portfolio advertises the network → more discover it → more join. Classic
// "Powered by …" flywheel, but the number is real + grows with the registry.
// ─────────────────────────────────────────────────────────────────────────────
import { readRegistryAsync } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const n = (await readRegistryAsync()).length;
  const label = "agentic network";
  const value = `${n} node${n === 1 ? "" : "s"}`;
  // Rough monospace width so text fits without a font-metrics lib.
  const lw = 7 + label.length * 6.2;
  const vw = 12 + value.length * 6.2;
  const w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <rect rx="3" width="${w.toFixed(0)}" height="20" fill="#555"/>
  <rect rx="3" x="${lw.toFixed(0)}" width="${vw.toFixed(0)}" height="20" fill="#5b8cff"/>
  <rect rx="3" width="${w.toFixed(0)}" height="20" fill="url(#g)"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${(lw / 2 + 3).toFixed(0)}" y="14">🌐 ${esc(label)}</text>
    <text x="${(lw + vw / 2).toFixed(0)}" y="14">${esc(value)}</text>
  </g>
</svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short cache so the count stays fresh but CDN still helps.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
