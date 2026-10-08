// Unit tests for packages/core/src/post-types.ts — hosted writing on a hosted portfolio.
// The renderer is shown to every visitor, so most cases here are XSS attempts that must come out inert.
import { cleanPost, upsertPost, removePost, renderMarkdown, excerpt, postsEvidence, newPostId, MAX_BODY } from "../packages/core/src/post-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };
const now = new Date("2026-10-08T10:00:00Z");

// validation
check("empty body refused", typeof cleanPost({ title: "t", body: "  " }, undefined, now) === "string");
check("an article needs a title", typeof cleanPost({ kind: "article", body: "x" }, undefined, now) === "string");
const idea = cleanPost({ kind: "idea", body: "# 质量是设计出来的\n更多" }, undefined, now, "p-1");
check("an untitled idea takes its first line as the title (Chinese ok)", idea.title === "质量是设计出来的" && idea.kind === "idea");
check("server owns timestamps and id", idea.createdAt === now.toISOString() && idea.id === "p-1");
const edited = cleanPost({ title: "New", body: "b", createdAt: "1999-01-01" }, { ...idea }, new Date("2026-10-09T00:00:00Z"));
check("an edit keeps id + createdAt, moves updatedAt", edited.id === "p-1" && edited.createdAt === idea.createdAt && edited.updatedAt.startsWith("2026-10-09"));
check("body capped", cleanPost({ title: "t", body: "a".repeat(MAX_BODY + 50) }, undefined, now).body.length === MAX_BODY);
check("ids are URL-safe", /^p-[a-z0-9]+$/.test(newPostId()));

// list ops
const a = { id: "a", createdAt: "2026-10-01", title: "A" }, b = { id: "b", createdAt: "2026-10-05", title: "B" };
check("upsert sorts newest first", upsertPost([a], b).map((p) => p.id).join() === "b,a");
check("upsert replaces by id", upsertPost([a, b], { ...a, title: "A2" }).find((p) => p.id === "a").title === "A2");
check("remove by id", removePost([a, b], "a").map((p) => p.id).join() === "b");

// rendering — safety
const evil = renderMarkdown(`<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[click](javascript:alert(1))\n[ok](https://example.com)`);
check("script tag escaped", !evil.includes("<script") && evil.includes("&lt;script&gt;"));
check("img onerror escaped", !evil.includes("<img"));
check("javascript: link not emitted as a link", !/href="javascript/i.test(evil));
check("https link emitted with rel=noopener", evil.includes('<a href="https://example.com" rel="noopener nofollow" target="_blank">ok</a>'));
check("quote in URL can't break out of href", !renderMarkdown('[x](https://a.com/"onmouseover="alert(1))').includes('" onmouseover'));
// rendering — features
const md = renderMarkdown("# Title\n\nPara with **bold**, *it* and `code`.\n\n- one\n- two\n\n1. first\n\n> quote\n\n```\n<b>raw</b>\n```");
check("heading", md.includes("<h2>Title</h2>"));
check("bold/italic/code", md.includes("<strong>bold</strong>") && md.includes("<em>it</em>") && md.includes("<code>code</code>"));
check("lists", md.includes("<ul><li>one</li><li>two</li></ul>") && md.includes("<ol><li>first</li></ol>"));
check("quote", md.includes("<blockquote><p>quote</p></blockquote>"));
check("code block keeps text escaped", md.includes("<pre><code>&lt;b&gt;raw&lt;/b&gt;</code></pre>"));

// excerpt + evidence
check("excerpt strips markup", excerpt("# Hi **there** [x](https://a.b)") === "Hi there x");
const ev = postsEvidence([{ id: "x", kind: "article", title: "T", body: "long ".repeat(100), createdAt: "2026-10-08" }], 100);
check("evidence respects its budget with an excerpt", ev.includes("T") && ev.length < 400);

process.exit(ok ? 0 : 1);
