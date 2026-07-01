// ─────────────────────────────────────────────────────────────────────────────
// lib/jobfit.ts — the SERVER fetch layer for the JD-fit scorer. Turns a job-posting URL
// into structured JD text WITHOUT scraping anything auth-walled: it speaks the PUBLIC
// posting APIs that the big ATSs expose (Ashby / Greenhouse / Lever), and falls back to a
// plain HTML fetch for any other public posting. The pure scoring model is
// @core/jobfit-types; the LLM judging happens in app/api/job-fit/route.ts.
//
// This is the on-ethic half of "proactively find jobs": public ATS APIs are fair game and
// need no login; LinkedIn (login-walled) is NEVER server-crawled — it stays an in-browser
// harvest. The example URL in the original ask (jobs.ashbyhq.com/Etched/…) resolves here.
//
// Kept import-free of "@/…" (only `import type` from @core, which the type-stripper erases)
// so parseJobUrl + htmlToText are loadable in a plain-Node test.
// ─────────────────────────────────────────────────────────────────────────────
import type { JobMeta } from "@core/jobfit-types";

export type Ats = "ashby" | "greenhouse" | "lever" | "generic";
export type ParsedJobUrl = { ats: Ats; org: string; id: string };

// Detect the ATS + pull (org, posting id) from a posting URL. The shapes:
//   jobs.ashbyhq.com/<org>/<uuid>
//   boards.greenhouse.io/<org>/jobs/<id>   (or job-boards.greenhouse.io/<org>/jobs/<id>)
//   jobs.lever.co/<org>/<uuid>
// Anything else → generic (we'll fetch the raw HTML). Returns null only for an unparseable URL.
export function parseJobUrl(input: string): ParsedJobUrl | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const segs = u.pathname.split("/").filter(Boolean);

  if (host.endsWith("ashbyhq.com")) {
    // /<org>/<id>
    if (segs.length >= 2) return { ats: "ashby", org: segs[0], id: segs[1] };
  }
  if (host.endsWith("greenhouse.io")) {
    // /<org>/jobs/<id>  (job-boards.greenhouse.io or boards.greenhouse.io)
    const ji = segs.indexOf("jobs");
    if (ji > 0 && segs[ji + 1]) return { ats: "greenhouse", org: segs[0], id: segs[ji + 1] };
  }
  if (host.endsWith("lever.co")) {
    // /<org>/<id>
    if (segs.length >= 2) return { ats: "lever", org: segs[0], id: segs[1] };
  }
  return { ats: "generic", org: host, id: u.pathname };
}

// Strip HTML to readable plain text: drop script/style, tags → spaces, decode the handful
// of entities the ATSs emit, collapse whitespace. Bounded so a huge page can't blow the budget.
export function htmlToText(html: string, budget = JD_CHAR_BUDGET): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > budget ? text.slice(0, budget) : text;
}

// Free-tier LLMs are token-bounded; the JD text is capped so the corpus + prompt still fit.
export const JD_CHAR_BUDGET = 8000;

const UA = "Mozilla/5.0 (agentic-portfolio JD-fit scorer; public posting APIs only)";
async function getJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export type FetchedJD = { job: JobMeta; text: string };

// Fetch + normalize a JD from its URL via the public posting APIs (no auth, no scraping).
export async function fetchJD(rawUrl: string): Promise<FetchedJD> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = parseJobUrl(url);
  if (!parsed) throw new Error(`Couldn't parse "${rawUrl}" as a URL.`);

  if (parsed.ats === "ashby") {
    const data = (await getJSON(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(parsed.org)}?includeCompensation=true`)) as {
      jobs?: Array<Record<string, unknown>>;
    };
    const job = (data.jobs ?? []).find((j) => String(j.id) === parsed.id);
    if (!job) throw new Error(`No public Ashby posting ${parsed.id} on the ${parsed.org} board.`);
    const desc = String(job.descriptionPlain ?? "") || htmlToText(String(job.descriptionHtml ?? ""));
    return {
      job: { title: String(job.title ?? "Role"), company: parsed.org, location: String(job.location ?? ""), url, source: "ashby" },
      text: desc.slice(0, JD_CHAR_BUDGET),
    };
  }

  if (parsed.ats === "greenhouse") {
    const j = (await getJSON(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(parsed.org)}/jobs/${encodeURIComponent(parsed.id)}`)) as Record<string, unknown>;
    const loc = (j.location && typeof j.location === "object" ? (j.location as Record<string, unknown>).name : "") as string;
    return {
      job: { title: String(j.title ?? "Role"), company: parsed.org, location: String(loc ?? ""), url, source: "greenhouse" },
      text: htmlToText(String(j.content ?? "")),
    };
  }

  if (parsed.ats === "lever") {
    const j = (await getJSON(`https://api.lever.co/v0/postings/${encodeURIComponent(parsed.org)}/${encodeURIComponent(parsed.id)}?mode=json`)) as Record<string, unknown>;
    const cats = (j.categories && typeof j.categories === "object" ? (j.categories as Record<string, unknown>) : {}) as Record<string, unknown>;
    const lists = (Array.isArray(j.lists) ? j.lists : []) as Array<{ text?: string; content?: string }>;
    const body = [String(j.descriptionPlain ?? ""), ...lists.map((l) => `${l.text ?? ""}\n${htmlToText(String(l.content ?? ""))}`)].join("\n\n");
    return {
      job: { title: String(j.text ?? "Role"), company: parsed.org, location: String(cats.location ?? ""), url, source: "lever" },
      text: body.slice(0, JD_CHAR_BUDGET),
    };
  }

  // Generic public posting: fetch the HTML and strip it. Best-effort — many career pages are
  // SPAs, so if there's little text we say so honestly rather than scoring against an empty JD.
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`Couldn't fetch ${url} (${res.status}).`);
  const text = htmlToText(await res.text());
  if (text.length < 200) throw new Error("That page didn't expose enough job text to score (it may be a login-walled or JS-rendered posting). Paste the JD text directly instead.");
  return { job: { title: "Role", company: parsed.org, location: "", url, source: "web" }, text };
}
