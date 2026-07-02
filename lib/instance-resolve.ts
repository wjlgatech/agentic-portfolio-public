// ─────────────────────────────────────────────────────────────────────────────
// lib/instance-resolve.ts — resolve the config + public base URL for a DISCOVERY request
// (agent-card / a2a / llms.txt). A hosted portfolio at /p/<slug> is a network node in its own
// right, so its discovery endpoints (rewritten to these routes with `?slug=<slug>`) must answer
// from ITS config (KV `portfolio:<slug>`), based at /p/<slug> — not the deploy's active instance.
// Without a slug → the deploy's active instance, based at the origin (unchanged behavior).
// ─────────────────────────────────────────────────────────────────────────────
import type { NextRequest } from "next/server";
import { kvGetJSON } from "@/lib/storage";
import { validateInstance, type InstanceConfig } from "@core/instance-types";
import { getActiveInstance } from "@/content/instances";

const slugRe = /^[a-z0-9-]{1,64}$/i;

export async function resolveInstance(req: NextRequest): Promise<{ config: InstanceConfig; base: string; slug: string | null }> {
  const origin = req.nextUrl.origin;
  const raw = req.nextUrl.searchParams.get("slug");
  const slug = raw && slugRe.test(raw) ? raw.toLowerCase() : null;
  if (slug) {
    const stored = await kvGetJSON<unknown>(`portfolio:${slug}`);
    const v = stored ? validateInstance(stored) : null;
    if (v?.ok && v.config) return { config: v.config, base: `${origin}/p/${slug}`, slug };
  }
  return { config: getActiveInstance(), base: origin, slug: null };
}
