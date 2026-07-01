// ─────────────────────────────────────────────────────────────────────────────
// lib/linkedin-public.ts — best-effort fetch of a LinkedIn PUBLIC profile's SEO metadata (server
// side), for the 1-click Maker when a non-technical user gives their LinkedIn URL instead of a
// pasted résumé. We fetch the logged-out page (the same public bytes Google indexes) and parse only
// og:title/og:description via the pure parser. NO credentials, NO auth-wall bypass, single low-volume
// request per make. GRACEFUL: LinkedIn often blocks datacenter/serverless IPs (999/403) — on any
// failure or a thin/blocked page we return null and the caller falls back honestly (asks for a
// paragraph). Never fabricate. The parsing (testable) lives in @core/linkedin-parse.
// ─────────────────────────────────────────────────────────────────────────────
import { parseLinkedInProfile, linkedinToResumeText, type LinkedInProfile } from "@core/linkedin-parse";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export function isLinkedInProfileUrl(url: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return /(^|\.)linkedin\.com$/i.test(u.hostname) && /\/in\/[^/]+/i.test(u.pathname);
  } catch {
    return false;
  }
}

export async function fetchLinkedInPublic(url: string): Promise<{ profile: LinkedInProfile; resumeText: string } | null> {
  if (!isLinkedInProfileUrl(url)) return null;
  const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(full, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!r.ok) return null; // 999/403/etc → blocked from this IP; caller falls back
    const html = (await r.text()).slice(0, 600_000);
    const profile = parseLinkedInProfile(html);
    if (!profile.ok) return null;
    return { profile, resumeText: linkedinToResumeText(profile, full) };
  } catch {
    return null; // timeout / network / abort → graceful
  }
}
