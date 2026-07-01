// Unit tests for the gallery live-link swap — deterministic + idempotent.
import { buildGalleryTable, setLiveLinks, replaceBetweenMarkers, START, END } from "./set-live-links.mjs";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// Pre-deploy (no URL): the "live once you deploy" note + the flagship stays.
const pre = buildGalleryTable(null);
check("pre-deploy shows the 'live once you deploy' note", pre.includes("live once you [deploy this repo"));
check("pre-deploy network points at the flagship", pre.includes("agentic-portfolio-lovat.vercel.app/network"));
check("flagship 'live portfolio' row is present pre-deploy", pre.includes("[agentic-portfolio-lovat.vercel.app ↗]"));

// Post-deploy: /make + /network become live links to the deploy; flagship UNCHANGED.
const live = buildGalleryTable("https://demo.vercel.app/");
check("post-deploy /make is a live link to the deploy", live.includes("(https://demo.vercel.app/make)"));
check("post-deploy /network is a live link to the deploy", live.includes("(https://demo.vercel.app/network)"));
check("trailing slash on the deploy URL is stripped", !live.includes("demo.vercel.app//"));
check("post-deploy no longer shows the pre-deploy note", !live.includes("live once you [deploy this repo"));
check("flagship example stays Paul's portfolio (not the deploy)", live.includes("[agentic-portfolio-lovat.vercel.app ↗](https://agentic-portfolio-lovat.vercel.app/)"));

// Marker replacement + idempotence + content preservation.
const doc = `# Title\nintro\n\n${START}\nOLD TABLE\n${END}\n\ntrailing text`;
const once = setLiveLinks(doc, "https://demo.vercel.app");
check("replaces content between the markers", once.includes("https://demo.vercel.app/make") && !once.includes("OLD TABLE"));
check("preserves content outside the markers", once.startsWith("# Title\nintro") && once.endsWith("trailing text"));
check("markers survive the swap (re-runnable)", once.includes(START) && once.includes(END));
check("idempotent — running twice with same URL is a no-op", setLiveLinks(once, "https://demo.vercel.app") === once);
check("re-runnable — can swap to a different URL", setLiveLinks(once, "https://other.app").includes("https://other.app/make"));

// Missing markers → a clear error (never silently corrupt the README).
let threw = false;
try { replaceBetweenMarkers("no markers here", "x"); } catch { threw = true; }
check("throws if the markers are missing (no silent corruption)", threw);

console.log(ok ? "✅ set-live-links: all pass" : "❌ set-live-links: FAIL");
process.exit(ok ? 0 : 1);
