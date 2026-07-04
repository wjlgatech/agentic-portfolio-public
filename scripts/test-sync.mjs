// Unit tests for the portfolio sync core — parsers + merge + honest feasibility.
import { sourceFeasibility, githubUserFromUrl, youtubeRefFromUrl, channelIdFromHtml, normalizeGitHubRepos, normalizeYouTubeFeed, mergeFeed } from "../packages/core/src/sync-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// Feasibility is honest: GitHub/YouTube syncable, X/LinkedIn not.
check("GitHub + YouTube are server-syncable", sourceFeasibility("github").serverSyncable && sourceFeasibility("youtube").serverSyncable);
check("X + LinkedIn are NOT server-syncable (walled/paid)", !sourceFeasibility("x").serverSyncable && !sourceFeasibility("linkedin").serverSyncable);

// URL extraction.
check("github user from a profile URL", githubUserFromUrl("https://github.com/wjlgatech") === "wjlgatech");
check("non-github URL → null", githubUserFromUrl("https://example.com/x") === null);
check("youtube channel id URL", youtubeRefFromUrl("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv")?.channelId === "UCabcdefghijklmnopqrstuv");
check("youtube @handle URL → handle to resolve", youtubeRefFromUrl("https://youtube.com/@AndrewNg")?.handle === "@AndrewNg");
check("channelId scraped from channel HTML", channelIdFromHtml('...,"channelId":"UCabcdefghijklmnopqrstuv",...') === "UCabcdefghijklmnopqrstuv");

// GitHub repos → items (forks + private dropped, newest first).
const repos = [
  { name: "old", html_url: "https://github.com/u/old", description: "d1", pushed_at: "2024-01-01T00:00:00Z", fork: false, private: false },
  { name: "new", html_url: "https://github.com/u/new", description: "d2", pushed_at: "2025-06-01T00:00:00Z", fork: false, private: false },
  { name: "aforked", html_url: "https://github.com/u/aforked", pushed_at: "2025-07-01T00:00:00Z", fork: true, private: false },
  { name: "secret", html_url: "https://github.com/u/secret", pushed_at: "2025-07-01T00:00:00Z", fork: false, private: true },
];
const g = normalizeGitHubRepos(repos);
check("github: forks and private repos are dropped", g.length === 2 && !g.some((i) => /aforked|secret/.test(i.title)));
check("github: newest repo first", g[0].title === "new" && g[0].category === "GitHub");
check("github: malformed input → empty (no throw)", normalizeGitHubRepos(null).length === 0);

// YouTube RSS → items.
const feed = `<feed><entry><title>My &amp; Video A</title><link rel="alternate" href="https://youtu.be/aaa"/><published>2025-06-02T00:00:00+00:00</published></entry>
<entry><title>Video B</title><link href="https://youtu.be/bbb"/><published>2025-06-05T00:00:00+00:00</published></entry></feed>`;
const y = normalizeYouTubeFeed(feed);
check("youtube: parses entries, decodes entities", y.length === 2 && y.some((i) => i.title === "My & Video A"));
check("youtube: newest first", y[0].url === "https://youtu.be/bbb" && y[0].category === "YouTube");

// Merge: dedupe by url, newest first, idempotent.
const merged = mergeFeed(g, y);
check("merge combines both sources", merged.some((i) => i.source === "github") && merged.some((i) => i.source === "youtube"));
check("merge is newest-first across sources", merged[0].date >= merged[merged.length - 1].date || !merged[merged.length - 1].date);
const twice = mergeFeed(merged, y.concat(g));
check("merge is idempotent (dedupe by url)", twice.length === merged.length);
check("merge caps the feed", mergeFeed([], Array.from({ length: 50 }, (_, i) => ({ source: "github", title: `r${i}`, url: `https://x/${i}`, date: `2025-01-${(i % 28) + 1}` })), 10).length === 10);
// REGRESSION (found live on a remade portfolio): the query string IS the identity for YouTube
// watch URLs — a dedupe key that strips `?v=<id>` collapses every synced video into one item.
const vids = [1, 2, 3].map((n) => ({ source: "youtube", title: `v${n}`, url: `https://www.youtube.com/watch?v=id${n}`, date: `2026-01-0${n}`, category: "YouTube" }));
check("watch?v= videos keep distinct identities", mergeFeed([], vids).length === 3);
check("same video (hash/trailing-slash variants) still dedupes", mergeFeed([{ ...vids[0], url: `${vids[0].url}#t=1` }], [vids[0]]).length === 1);

console.log(ok ? "✅ sync: all pass" : "❌ sync: FAIL");
process.exit(ok ? 0 : 1);
