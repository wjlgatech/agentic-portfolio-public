// ─────────────────────────────────────────────────────────────────────────────
// lib/source-fetch.ts — fetch a public source URL and return its title + plain text, for the
// Deep Dive generator (POST /api/deep-dive). Bounded (timeout + size cap), SSRF-guarded (no
// internal targets), HTML stripped to text for the LLM. Server-only. htmlToText is PURE (tested).
// ─────────────────────────────────────────────────────────────────────────────

// Block obviously-internal targets (SSRF guard) — mirrors app/api/fetch-article.
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  return false;
}

function pickTitle(html: string): string {
  const og = html.match(/<meta[^>]+(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return t?.[1]?.trim() ?? "";
}

// Strip scripts/styles/tags/entities → readable text. PURE.
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type SourceContent = { ok: boolean; title: string; text: string; error?: string };

// GitHub repo/arXiv/plain URLs → title + text. Caps the body so the LLM stays within free-tier TPM.
export async function fetchSourceText(rawUrl: string, maxChars = 12000): Promise<SourceContent> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, title: "", text: "", error: "Enter a valid URL (a real, fetchable source — a repo, a paper, an article)." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, title: "", text: "", error: "Only http(s) URLs." };
  if (isBlockedHost(url.hostname)) return { ok: false, title: "", text: "", error: "That host is blocked." };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "agentic-portfolio deep-dive (reads public sources)", Accept: "text/html,text/plain,*/*" },
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, title: "", text: "", error: `Source returned HTTP ${res.status}.` };
    const raw = (await res.text()).slice(0, 400_000); // hard cap the download
    const ct = res.headers.get("content-type") ?? "";
    const isHtml = ct.includes("html") || /<html|<!doctype/i.test(raw.slice(0, 200));
    const title = (isHtml ? pickTitle(raw) : "") || url.pathname.split("/").filter(Boolean).pop() || url.hostname;
    const text = (isHtml ? htmlToText(raw) : raw).slice(0, maxChars);
    if (text.length < 40) return { ok: false, title, text, error: "The source had almost no readable text (login-walled or JS-only?)." };
    return { ok: true, title, text };
  } catch (e) {
    return { ok: false, title: "", text: "", error: `Couldn't fetch the source: ${(e as Error).message}` };
  }
}
