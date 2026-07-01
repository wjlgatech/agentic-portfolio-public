// ─────────────────────────────────────────────────────────────────────────────
// linkedin-parse.ts — extract the PUBLIC profile signal from a LinkedIn page's HTML (pure, fs-free,
// network-free → testable with a fixture). We read only the SEO metadata LinkedIn already serves to
// logged-out visitors and Google: og:title ("Name - Headline | LinkedIn") and og:description
// (headline · experience · education · location). NO login, NO credentials, NO behind-the-wall
// scraping — the same public bytes a search engine sees. Keys off stable <meta> tags, never CSS
// classes. Best-effort: an authwall/blocked page has no og:title → ok:false (caller falls back).
// ─────────────────────────────────────────────────────────────────────────────

export type LinkedInProfile = { name: string; headline: string; summary: string; ok: boolean };

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#x2F": "/", "#47": "/", nbsp: " " };
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => ENT[n] ?? ENT[n.toLowerCase()] ?? m);
}

// Read a <meta> content by og/twitter/name property, tolerant of attribute order.
function meta(html: string, prop: string): string {
  const p = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*?content=["']([^"']*)["']`, "i"));
  const b = a ? null : html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${p}["']`, "i"));
  const m = a || b;
  return m ? decodeEntities(m[1]).trim() : "";
}

export function parseLinkedInProfile(html: string): LinkedInProfile {
  const title = meta(html, "og:title");
  const description = meta(html, "og:description");

  // "Name - Headline | LinkedIn" → name + headline. Strip the trailing "| LinkedIn".
  const cleanTitle = title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  let name = cleanTitle;
  let headline = "";
  const dash = cleanTitle.indexOf(" - ");
  if (dash > 0) {
    name = cleanTitle.slice(0, dash).trim();
    headline = cleanTitle.slice(dash + 3).trim();
  }

  const ok = name.length > 0 && name.length <= 80 && !/sign ?in|log ?in|join now/i.test(name);
  return { name: ok ? name : "", headline: ok ? headline : "", summary: ok ? description : "", ok };
}

// Compose a résumé-equivalent grounding text from the public profile (what the LLM will ground on).
export function linkedinToResumeText(p: LinkedInProfile, url: string): string {
  if (!p.ok) return "";
  const lines = [
    p.name && `Name: ${p.name}`,
    p.headline && `Headline: ${p.headline}`,
    p.summary && `Public profile summary: ${p.summary}`,
    url && `LinkedIn: ${url}`,
  ].filter(Boolean);
  return lines.join("\n");
}
