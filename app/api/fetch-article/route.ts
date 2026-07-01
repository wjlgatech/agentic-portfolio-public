// ─────────────────────────────────────────────────────────────────────────────
// /api/fetch-article — server-side metadata fetch for the "add by URL" flow.
//
// The agent's actions run in the BROWSER, which CORS-blocks fetching a LinkedIn
// (or any cross-origin) page directly — that's the "Failed to fetch" error. This
// route fetches the page SERVER-SIDE (no CORS), pulls the title + summary from the
// page's Open Graph / meta tags, and returns them so the agent can fill an article
// from just a URL.
//
// Owner-gated (same secret as writes) + basic SSRF guard so it can't be used to
// probe internal hosts.
//   POST { url } → { title, summary, url }  |  4xx on bad/blocked URL.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Block obviously-internal targets (SSRF guard). Not exhaustive, but stops the
// common cases for a personal site.
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  return false;
}

function pickMeta(html: string, names: string[]): string {
  for (const name of names) {
    // property="og:title" content="…"  (either attribute order)
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

export async function POST(req: NextRequest) {
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ error: "Only the owner can fetch articles." }, { status: 403 });
  }

  let url = "";
  try {
    url = String((await req.json())?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) URLs are allowed" }, { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "That host is not allowed" }, { status: 400 });
  }

  let html = "";
  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        // A real UA helps public pages (incl. LinkedIn) return OG tags.
        "User-Agent": "Mozilla/5.0 (compatible; AgenticPortfolio/1.0; +https://github.com/wjlgatech/agentic-portfolio)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}` }, { status: 502 });
    }
    html = (await res.text()).slice(0, 600_000); // cap to keep parsing cheap
  } catch (e) {
    return NextResponse.json(
      { error: `Could not fetch the page: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const rawTitle =
    pickMeta(html, ["og:title", "twitter:title"]) ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
  const rawSummary = pickMeta(html, ["og:description", "twitter:description", "description"]);

  const title = decodeEntities(rawTitle).replace(/\s+/g, " ").trim();
  const summary = decodeEntities(rawSummary).replace(/\s+/g, " ").trim();

  if (!title) {
    return NextResponse.json(
      { error: "Couldn't find a title on that page (it may require login)." },
      { status: 422 },
    );
  }

  return NextResponse.json({ title, summary, url: parsed.toString() });
}
