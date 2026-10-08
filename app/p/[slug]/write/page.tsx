"use client";
// ─────────────────────────────────────────────────────────────────────────────
// /p/[slug]/write — the owner's back office for HOSTED WRITING: write or paste an article or an idea
// (Markdown, any language), preview it, publish it to /p/<slug>/w/<id>, edit or delete it later.
// Owner-only in effect: every write goes to /api/posts, which checks the per-portfolio owner token
// server-side. This page just carries the token the owner already has (the ?owner=… link, kept in
// localStorage by HostedOwnerBadge). Labels are bilingual because the first user writes in Chinese.
// ─────────────────────────────────────────────────────────────────────────────
import { use, useCallback, useEffect, useState } from "react";
import { renderMarkdown, type Post, type PostKind } from "@core/post-types";

const tokenKey = (slug: string) => `portfolio-owner:${slug}`;
type Draft = { id?: string; kind: PostKind; title: string; body: string };
const EMPTY: Draft = { kind: "article", title: "", body: "" };

export default function WritePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/posts?instance=${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (r.ok) setPosts((await r.json()).posts ?? []);
  }, [slug]);

  useEffect(() => {
    let t = "";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("owner");
      if (fromUrl) localStorage.setItem(tokenKey(slug), fromUrl);
      t = localStorage.getItem(tokenKey(slug)) || "";
    } catch { /* ignore */ }
    setToken(t);
    if (!t) { setOwner(false); return; }
    fetch(`/api/lead?instance=${encodeURIComponent(slug)}`, { headers: { "x-portfolio-owner": t } })
      .then((r) => setOwner(r.ok))
      .catch(() => setOwner(false));
    void load();
  }, [slug, load]);

  async function publish() {
    if (!draft.body.trim()) { setMsg("Write something first · 请先写内容"); return; }
    if (draft.kind === "article" && !draft.title.trim()) { setMsg("An article needs a title · 文章需要标题"); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`/api/posts?instance=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-portfolio-owner": token },
      body: JSON.stringify({ post: draft }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error || "Not published · 发布失败"); return; }
    if (!j.durable) { setMsg(j.note || "Not saved · 未保存"); return; }
    setMsg(`Published · 已发布 → ${j.url}`);
    setDraft(EMPTY); setPreview(false);
    void load();
  }

  async function remove(p: Post) {
    if (!window.confirm(`Delete “${p.title}”? · 确定删除？`)) return;
    const r = await fetch(`/api/posts?instance=${encodeURIComponent(slug)}&id=${encodeURIComponent(p.id)}`, { method: "DELETE", headers: { "x-portfolio-owner": token } });
    setMsg(r.ok ? "Deleted · 已删除" : "Not deleted · 删除失败");
    void load();
  }

  if (owner === null) return <main className="min-h-screen bg-surface p-8 text-muted">Loading…</main>;
  if (!owner) {
    return (
      <main className="mx-auto min-h-screen max-w-xl bg-surface p-8 text-ink">
        <h1 className="text-2xl font-bold">Write · 写作</h1>
        <p className="mt-3 text-muted">
          Only the owner can write here. Open your private owner link (the <code>?owner=…</code> link you got when you made this
          portfolio) once on this device, then come back. · 只有主页的主人可以写作。请先用创建主页时收到的专属链接打开一次。
        </p>
        <a href={`/p/${slug}`} className="mt-6 inline-block text-accent">← Back to the portfolio · 返回主页</a>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-surface p-6 pb-24 text-ink">
      <a href={`/p/${slug}`} className="text-sm text-muted hover:text-accent">← Back to the portfolio · 返回主页</a>
      <h1 className="mt-4 text-2xl font-bold">Write · 写作</h1>
      <p className="mt-1 text-sm text-muted">Articles and ideas you publish here appear on your portfolio, and your agent can answer questions about them. Markdown works: # heading, **bold**, - list, [link](https://…). · 发布后会出现在主页上，你的 AI 助手也能据此回答问题。</p>

      <section className="card mt-6">
        <div className="flex gap-2">
          {(["article", "idea"] as const).map((k) => (
            <button key={k} onClick={() => setDraft({ ...draft, kind: k })}
              className={`rounded-full px-3 py-1 text-sm ${draft.kind === k ? "bg-accent text-white" : "border border-edge text-muted"}`}>
              {k === "article" ? "Article · 文章" : "Idea · 想法"}
            </button>
          ))}
          {draft.id && <span className="ml-auto text-xs text-muted">Editing · 编辑中</span>}
        </div>
        <input
          className="mt-4 w-full rounded-lg border border-edge bg-surface p-3 text-lg font-semibold"
          placeholder={draft.kind === "idea" ? "Title (optional) · 标题（可选）" : "Title · 标题"}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        {preview ? (
          <div className="post-body mt-4 min-h-[16rem] rounded-lg border border-edge p-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body) }} />
        ) : (
          <textarea
            className="mt-4 min-h-[16rem] w-full rounded-lg border border-edge bg-surface p-3 font-mono text-sm leading-relaxed"
            placeholder={"Write or paste here… · 在这里写或粘贴…"}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={busy} onClick={publish} className="rounded-lg bg-accent px-5 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? "Publishing… · 发布中" : draft.id ? "Update · 更新" : "Publish · 发布"}
          </button>
          <button onClick={() => setPreview(!preview)} className="rounded-lg border border-edge px-4 py-2 text-sm">
            {preview ? "Edit · 编辑" : "Preview · 预览"}
          </button>
          {draft.id && <button onClick={() => { setDraft(EMPTY); setPreview(false); }} className="text-sm text-muted underline">New · 新建</button>}
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Published · 已发布 ({posts.length})</h2>
        <ul className="mt-3 space-y-2">
          {posts.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 !py-3">
              <span className="text-xs text-muted">{p.kind === "idea" ? "Idea" : "Article"} · {p.createdAt.slice(0, 10)}</span>
              <a href={`/p/${slug}/w/${p.id}`} className="flex-1 truncate font-medium text-ink hover:text-accent">{p.title}</a>
              <button onClick={() => { setDraft({ id: p.id, kind: p.kind, title: p.title, body: p.body }); setPreview(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm text-accent">Edit · 编辑</button>
              <button onClick={() => remove(p)} className="text-sm text-muted">Delete · 删除</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
