// ─────────────────────────────────────────────────────────────────────────────
// /api/sync-projects — sync the Projects section from GitHub. TWO triggers, one sync:
//   • POST — the 1-click owner button (x-portfolio-owner → 403 otherwise)
//   • GET  — the WEEKLY cron (Vercel Cron Bearer CRON_SECRET, or x-sync-secret); no owner token
//            needed. A plain GET (no cron secret) just reports config for the UI.
// Fetches the owner's repos (public + private via GITHUB_TOKEN), MERGES them into the live projects
// — preserving curated category/highlight/featured, updating live fields, adding new repos, never
// deleting — and persists the durable override (KV projects:config). Private repos keep url:null
// (the "view →" link is derived at render).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/owner";
import { isCronRequest } from "@/lib/cron-auth";
import { profile } from "@/content/profile";
import { readProjectsAsync, writeProjectsDurable } from "@/lib/projects";
import { fetchOwnerRepos } from "@/lib/github-repos";
import { mergeGithubRepos } from "@core/projects-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The one sync, shared by the owner button (POST) and the weekly cron (GET).
async function runProjectsSync(): Promise<{ status: number; body: Record<string, unknown> }> {
  const repos = await fetchOwnerRepos(profile.handle);
  if (repos.length === 0) {
    return { status: 502, body: { ok: false, error: "GitHub returned no repos (rate-limited, or GITHUB_TOKEN missing/insufficient). Nothing changed." } };
  }
  // Only ADD new repos pushed within ~18 months (keeps the curated grid lean); already-listed repos update regardless.
  const cutoff = new Date(Date.now() - 18 * 30 * 86400000).toISOString().slice(0, 10);
  const current = await readProjectsAsync();
  const { merged, added, updated, skipped } = mergeGithubRepos(current, repos, { addNewSince: cutoff });
  const { persisted, durable } = await writeProjectsDurable(merged);
  return {
    status: 200,
    body: { ok: persisted, durable, total: merged.length, added, updated, skipped, fetched: repos.length, note: durable ? undefined : "No durable store (KV) configured — merge computed but not persisted. Set POSTGRES_URL to persist." },
  };
}

export async function GET(req: NextRequest) {
  if (isCronRequest(req)) {
    const { status, body } = await runProjectsSync();
    return NextResponse.json({ ...body, ranBy: "cron" }, { status });
  }
  return NextResponse.json({
    tokenScope: process.env.GITHUB_TOKEN ? "authenticated (public + private)" : "public only (no GITHUB_TOKEN)",
    handle: profile.handle,
  });
}

export async function POST(req: NextRequest) {
  if (!isOwnerRequest(req)) {
    return NextResponse.json({ ok: false, error: "Only the owner can sync projects." }, { status: 403 });
  }
  const { status, body } = await runProjectsSync();
  return NextResponse.json(body, { status });
}
