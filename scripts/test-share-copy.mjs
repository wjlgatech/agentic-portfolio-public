// Unit tests for per-platform share copy — deterministic, char-limit-aware.
import { shareCopy, tweetLength } from "../packages/core/src/share-copy.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const url = "https://deploy.example.com/p/jane-doe-9x2a";
const c = shareCopy("Jane Doe", "helps fintechs ship AI safely", url);

check("X copy fits the 280 limit (URL billed at 23)", tweetLength(c.x, url) <= 280);
check("every platform copy is non-empty", c.x && c.linkedin && c.youtube && c.instagram);
check("every platform copy includes the portfolio URL", [c.x, c.linkedin, c.youtube, c.instagram].every((s) => s.includes(url)));
check("LinkedIn is long-form (more than X)", c.linkedin.length > c.x.length);
check("YouTube description credits the open-source repo", c.youtube.includes("agentic-portfolio-public"));
check("hashtags are provided", Array.isArray(c.hashtags) && c.hashtags.length >= 3);

// A very long tagline must still yield a tweet within the limit (tagline dropped, then bare).
const longTag = "does a very very very very very very very very very very very very very very very long list of things across many industries and disciplines and continents";
const c2 = shareCopy("Somebody With A Long Name", longTag, url);
check("X stays ≤280 even with an absurd tagline", tweetLength(c2.x, url) <= 280);
check("X still includes the URL after trimming", c2.x.includes(url));

// Empty name/tagline is well-defined (no 'undefined', no crash).
const c3 = shareCopy("", "", url);
check("empty name/tagline still produces valid copy", c3.x.includes(url) && !/undefined/.test(c3.x + c3.linkedin + c3.youtube + c3.instagram));

// tweetLength bills the URL at 23, not its real length.
check("tweetLength counts a URL as 23 chars", tweetLength(`hi ${url}`, url) === 3 + 23);

console.log(ok ? "✅ share-copy: all pass" : "❌ share-copy: FAIL");
process.exit(ok ? 0 : 1);
