// ─────────────────────────────────────────────────────────────────────────────
// /api/posts — HOSTED WRITING for a hosted portfolio (/p/<slug>).
//   GET    ?instance=<slug>[&id=<post>]   → public: the posts (or one post)
//   POST   ?instance=<slug>  {post}       → OWNER: create, or update when post.id matches an existing one
//   DELETE ?instance=<slug>&id=<post>     → OWNER: remove one post
// Ownership is the per-portfolio token (lib/instance-owner.ts) — never a client claim. The pure model,
// validation and the XSS-safe renderer are packages/core/src/post-types.ts (scripts/test-posts.mjs).
// Without a durable store, a write returns durable:false and is NOT kept — said so, never faked.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { ownsInstance } from "@/lib/instance-owner";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { kvConfigured, kvGetJSON, kvSetJSON } from "@/lib/storage";
import { cleanPost, postsKey, removePost, upsertPost, type Post } from "@core/post-types";

export const dynamic = "force-dynamic";
const slugRe = /^[a-z0-9-]{1,64}$/i;
const instanceParam = (v: string | null) => (v && slugRe.test(v) ? v.toLowerCase() : null);
const read = async (slug: string) => (await kvGetJSON<Post[]>(postsKey(slug))) ?? [];

export async function GET(req: NextRequest) {
  const slug = instanceParam(req.nextUrl.searchParams.get("instance"));
  if (!slug) return NextResponse.json({ error: "instance required" }, { status: 400 });
  const posts = await read(slug);
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const p = posts.find((x) => x.id === id);
    return p ? NextResponse.json({ post: p }) : NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ instance: slug, count: posts.length, posts });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`posts:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: `Slow down — retry in ${rl.retryAfter}s.` }, { status: 429 });
  const slug = instanceParam(req.nextUrl.searchParams.get("instance"));
  if (!slug) return NextResponse.json({ error: "instance required" }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only. Sign in with your owner link first." }, { status: 403 });
  let body: { post?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const all = await read(slug);
  const existing = typeof body.post?.id === "string" ? all.find((p) => p.id === body.post!.id) : undefined;
  const clean = cleanPost(body.post, existing);
  if (typeof clean === "string") return NextResponse.json({ error: clean }, { status: 400 });
  const next = upsertPost(all, clean);
  const durable = kvConfigured() && (await kvSetJSON(postsKey(slug), next));
  return NextResponse.json({ ok: true, durable, post: clean, url: `/p/${slug}/w/${clean.id}`, ...(durable ? {} : { note: "Not saved: this deploy has no durable store." }) });
}

export async function DELETE(req: NextRequest) {
  const slug = instanceParam(req.nextUrl.searchParams.get("instance"));
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!slug || !id) return NextResponse.json({ error: "instance and id required" }, { status: 400 });
  if (!(await ownsInstance(req, slug))) return NextResponse.json({ error: "Owner only." }, { status: 403 });
  const all = await read(slug);
  const next = removePost(all, id);
  if (next.length === all.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const durable = kvConfigured() && (await kvSetJSON(postsKey(slug), next));
  return NextResponse.json({ ok: true, durable });
}
