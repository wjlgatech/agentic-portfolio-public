// Unit tests for the Writing sync core: source→feed resolution, generic RSS/Atom parsing, dedupe.
import { resolveFeedUrl, sourceMethod, parseFeedArticles, mergeArticles } from "../packages/core/src/writing-sources.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// ── feed resolution ──
check("substack handle → host feed", resolveFeedUrl({ kind: "substack", ref: "myblog", label: "S" }) === "https://myblog.substack.com/feed");
check("substack full url → /feed", resolveFeedUrl({ kind: "substack", ref: "https://foo.substack.com", label: "S" }) === "https://foo.substack.com/feed");
check("medium @handle → feed", resolveFeedUrl({ kind: "medium", ref: "@me", label: "M" }) === "https://medium.com/feed/@me");
check("medium bare handle → @feed", resolveFeedUrl({ kind: "medium", ref: "me", label: "M" }) === "https://medium.com/feed/@me");
check("rss passthrough url", resolveFeedUrl({ kind: "rss", ref: "https://blog.example.com/rss.xml", label: "R" }) === "https://blog.example.com/rss.xml");
check("rss non-url → null", resolveFeedUrl({ kind: "rss", ref: "not a url", label: "R" }) === null);
check("linkedin is not server-syncable → null", resolveFeedUrl({ kind: "linkedin", ref: "in/me", label: "L" }) === null);
check("x is not server-syncable → null", resolveFeedUrl({ kind: "x", ref: "@me", label: "X" }) === null);

// ── method catalog ──
check("substack/medium/rss are server-rss", sourceMethod("substack") === "server-rss" && sourceMethod("medium") === "server-rss" && sourceMethod("rss") === "server-rss");
check("linkedin/x are browser-harvest", sourceMethod("linkedin") === "browser-harvest" && sourceMethod("x") === "browser-harvest");

// ── RSS parsing ──
const rss = `<rss><channel>
  <item><title>Post One</title><link>https://blog.example.com/one</link><pubDate>Wed, 02 Jul 2025 10:00:00 GMT</pubDate><description><![CDATA[<p>Hello &amp; hi</p>]]></description></item>
  <item><title>Post Two</title><link>https://blog.example.com/two</link><pubDate>Sun, 01 Jun 2025 10:00:00 GMT</pubDate></item>
  <item><title>No Link</title><pubDate>Sun, 01 Jan 2025 10:00:00 GMT</pubDate></item>
</channel></rss>`;
const rssItems = parseFeedArticles(rss, "Substack");
check("RSS: parses items with a link (drops the no-link one)", rssItems.length === 2);
check("RSS: newest first (2025-07 before 2025-06)", rssItems[0].url === "https://blog.example.com/one" && rssItems[0].date === "2025-07");
check("RSS: description stripped + entity-decoded", rssItems[0].summary === "Hello & hi");
check("RSS: category tagged from the source label", rssItems.every((a) => a.category === "Substack"));

// ── Atom parsing ──
const atom = `<feed>
  <entry><title>Atom One</title><link href="https://m.example.com/a" rel="alternate"/><published>2025-05-15T00:00:00Z</published><summary>An atom summary</summary></entry>
</feed>`;
const atomItems = parseFeedArticles(atom, "Medium");
check("Atom: link from href, date → YYYY-MM", atomItems.length === 1 && atomItems[0].url === "https://m.example.com/a" && atomItems[0].date === "2025-05");
check("Atom: summary parsed", atomItems[0].summary === "An atom summary");

// ── dedupe ──
const existing = [{ title: "Kept", url: "https://blog.example.com/one", date: "2025-07", category: "X", summary: "" }];
const { merged, added } = mergeArticles(existing, rssItems);
check("merge dedupes by url (existing wins, only new added)", added === 1 && merged.length === 2 && merged[0].title === "Kept");

console.log(ok ? "\n✅ writing-sources: all pass" : "\n❌ writing-sources: FAIL");
process.exit(ok ? 0 : 1);
