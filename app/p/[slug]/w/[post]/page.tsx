// ─────────────────────────────────────────────────────────────────────────────
// /p/[slug]/w/[post] — one post (article or idea) written ON a hosted portfolio. Server-rendered from the
// durable store; the body goes through renderMarkdown (packages/core/src/post-types.ts), which escapes
// everything and emits only its own tags, so an owner's text can never run script for a visitor.
// ─────────────────────────────────────────────────────────────────────────────
import { notFound } from "next/navigation";
import { kvGetJSON } from "@/lib/storage";
import { SEED_PACKS } from "@/content/instances/seeds";
import { validateInstance } from "@core/instance-types";
import { excerpt, postsKey, renderMarkdown, type Post } from "@core/post-types";

export const dynamic = "force-dynamic";

async function load(slug: string, id: string) {
  const raw = (await kvGetJSON<unknown>(`portfolio:${slug}`)) ?? SEED_PACKS[slug] ?? null;
  const { ok, config } = raw ? validateInstance(raw) : { ok: false, config: null };
  if (!ok || !config) return null;
  const post = ((await kvGetJSON<Post[]>(postsKey(slug))) ?? []).find((p) => p.id === id);
  return post ? { config, post } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; post: string }> }) {
  const { slug, post } = await params;
  const d = await load(slug, post);
  if (!d) return { title: "Post not found" };
  const description = excerpt(d.post.body, 200);
  return {
    title: `${d.post.title} — ${d.config.entity.name}`,
    description,
    openGraph: { title: d.post.title, description, type: "article" },
    twitter: { card: "summary", title: d.post.title, description },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string; post: string }> }) {
  const { slug, post } = await params;
  const d = await load(slug, post);
  if (!d) notFound();
  const { config: c, post: p } = d;
  return (
    <div className="min-h-screen bg-surface text-ink">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var ok=["anthropic","openai","google","apple","vercel","stripe","swiss","brutalist","notion"];var o=localStorage.getItem("webapp-style");document.documentElement.dataset.theme=(o&&ok.indexOf(o)>-1)?o:${JSON.stringify(c.theme)};}catch(e){}})();`,
        }}
      />
      <article className="mx-auto max-w-2xl px-5 py-12">
        <a href={`/p/${slug}`} className="text-sm text-muted hover:text-accent">← {c.entity.name}</a>
        <p className="mt-8 text-xs uppercase tracking-widest text-accent">{p.kind === "idea" ? "Idea · 想法" : "Article · 文章"} · {p.createdAt.slice(0, 10)}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">{p.title}</h1>
        <div className="post-body mt-8 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        {p.tags?.length ? <p className="mt-8 text-sm text-muted">{p.tags.map((t) => `#${t}`).join(" ")}</p> : null}
        <p className="mt-12 border-t border-edge pt-6 text-sm text-muted">
          Written by {c.entity.name} · <a href={`/p/${slug}`} className="text-accent">ask their agent about it →</a>
        </p>
      </article>
    </div>
  );
}
