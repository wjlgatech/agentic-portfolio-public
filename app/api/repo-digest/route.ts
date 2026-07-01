// ─────────────────────────────────────────────────────────────────────────────
// /api/repo-digest — fetch REAL content from a public GitHub repo (README + top-level
// file/dir tree + metadata) so the agent can compose a new section grounded in what's
// actually in the repo, instead of inventing tool names. Used by the addSection flow
// (e.g. "highlight my agentic tools from wjlgatech/sos"). Public repos only.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

// Accepts "owner/name", a full github URL, or "name" (defaults to the portfolio owner).
function parseRepo(input: string): { owner: string; name: string } | null {
  const s = String(input).trim();
  const m = s.match(/github\.com\/([^/]+)\/([^/?#]+)/i) || s.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
  if (m) return { owner: m[1], name: m[2].replace(/\.git$/, "") };
  if (/^[A-Za-z0-9._-]+$/.test(s)) return { owner: "wjlgatech", name: s };
  return null;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`repo-digest:${clientKey(req)}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit — retry in ${rl.retryAfter}s.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let repoInput = "";
  try {
    repoInput = String((await req.json())?.repo ?? "");
  } catch {
    return NextResponse.json({ error: "Send { repo: 'owner/name' }." }, { status: 400 });
  }
  const repo = parseRepo(repoInput);
  if (!repo) return NextResponse.json({ error: `Couldn't parse a repo from "${repoInput}".` }, { status: 400 });

  const base = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
  try {
    const metaRes = await fetch(base, { headers: ghHeaders(), cache: "no-store" });
    if (metaRes.status === 404) return NextResponse.json({ error: `Repo ${repo.owner}/${repo.name} not found or private.` }, { status: 404 });
    if (!metaRes.ok) return NextResponse.json({ error: `GitHub error ${metaRes.status}.` }, { status: 502 });
    const meta = (await metaRes.json()) as Record<string, unknown>;

    const [readmeRes, treeRes] = await Promise.all([
      fetch(`${base}/readme`, { headers: { ...ghHeaders(), Accept: "application/vnd.github.raw" }, cache: "no-store" }),
      fetch(`${base}/git/trees/${meta.default_branch}`, { headers: ghHeaders(), cache: "no-store" }),
    ]);
    const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, 3500) : "";
    let dirs: string[] = [];
    let files: string[] = [];
    if (treeRes.ok) {
      const tree = (await treeRes.json()) as { tree?: Array<{ path: string; type: string }> };
      for (const t of tree.tree ?? []) {
        if (t.type === "tree") dirs.push(t.path);
        else if (t.type === "blob") files.push(t.path);
      }
      dirs = dirs.slice(0, 40);
      files = files.slice(0, 60);
    }

    return NextResponse.json({
      repo: `${repo.owner}/${repo.name}`,
      url: meta.html_url,
      description: meta.description ?? "",
      language: meta.language ?? null,
      topics: Array.isArray(meta.topics) ? meta.topics : [],
      stars: meta.stargazers_count ?? 0,
      dirs,
      files,
      readmeExcerpt: readme,
    });
  } catch (e) {
    return NextResponse.json({ error: `Couldn't reach GitHub: ${(e as Error).message}` }, { status: 502 });
  }
}
