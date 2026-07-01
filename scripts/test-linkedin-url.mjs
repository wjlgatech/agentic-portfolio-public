// Regression test for LinkedIn URL classification (lib/linkedin.ts).
// This locks in the handling of the EXACT query a user reported failing:
//   "https://www.linkedin.com/in/pauljialiangwu/recent-activity/all/ fetch all"
// A feed/activity/profile URL must classify as a FEED (→ harvester guidance, never a
// server fetch); an individual post/article must classify as fetchable. If this ever
// regresses, `node scripts/test-linkedin-url.mjs` fails before it reaches a user.

const mod = await import("../lib/linkedin.ts").catch(async () => {
  // Node can't import .ts directly in all setups — fall back to evaluating the source.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../lib/linkedin.ts", import.meta.url), "utf8");
  const body = src.replace(/export function/, "function") + "\nexport { isLinkedInFeedUrl };";
  const dataUrl = "data:text/javascript;base64," + Buffer.from(body).toString("base64");
  return import(dataUrl);
});
const { isLinkedInFeedUrl } = mod;

const FEED = [
  "https://www.linkedin.com/in/pauljialiangwu/recent-activity/all/", // the reported query
  "https://www.linkedin.com/in/pauljialiangwu/recent-activity/all/ fetch all".split(" ")[0],
  "https://www.linkedin.com/in/jialiang-wu-67aa7179/",
  "https://www.linkedin.com/feed/",
  "https://linkedin.com/in/someone/recent-activity/shares/",
];
const FETCHABLE = [
  "https://www.linkedin.com/pulse/language-becoming-infrastructure-wu-phd-qfykc/",
  "https://www.linkedin.com/posts/pauljialiangwu_some-slug-activity-9999999999-abcd",
  "https://www.linkedin.com/feed/update/urn:li:activity:7777777777/",
];

let ok = true;
for (const u of FEED) {
  const r = isLinkedInFeedUrl(u);
  console.log(`${r ? "✅" : "❌"} feed      ${u.slice(0, 70)}`);
  if (!r) ok = false;
}
for (const u of FETCHABLE) {
  const r = isLinkedInFeedUrl(u);
  console.log(`${!r ? "✅" : "❌"} fetchable ${u.slice(0, 70)}`);
  if (r) ok = false;
}
console.log(ok ? "✅ LinkedIn URL classification correct (reported query → feed/harvester path)" : "❌ FAIL");

// ── publish-time decode (Snowflake activity id → ms), used to sort the slider ──
const { linkedinActivityTimeMs } = mod;
const newer = "https://www.linkedin.com/feed/update/urn:li:activity:7250000000000000000/";
const older = "https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000/";
const tNew = linkedinActivityTimeMs(newer);
const tOld = linkedinActivityTimeMs(older);
const yr = tNew ? new Date(tNew).getUTCFullYear() : 0;
const fakeShort = linkedinActivityTimeMs("https://www.linkedin.com/feed/update/urn:li:activity:7777777777/"); // implausible → null
const noId = linkedinActivityTimeMs("https://www.linkedin.com/pulse/some-article-wu/");
const tok =
  tNew && tOld && tNew > tOld &&            // bigger id = more recent
  yr >= 2015 && yr <= 2030 &&               // decodes to a plausible year
  fakeShort === null && noId === null;      // junk/no-id → null (won't poison the sort)
console.log(`${tok ? "✅" : "❌"} activity-id → publish time decode (newer>${yr}, junk→null)`);

// ── slider ordering: a brand-new UNDATABLE post (no activity id) must stay newest ──
const { orderByRecency } = mod;
const now = Date.UTC(2026, 5, 29);
const mayId = (BigInt(Date.UTC(2026, 4, 26)) << 22n).toString(); // a dated May-26 post
const items = [
  { url: "https://www.linkedin.com/posts/me_just-posted-yesterday-no-id", date: "" }, // newest, undatable, index 0
  { url: "https://www.linkedin.com/feed/update/urn:li:activity:" + mayId + "/", date: "" }, // May 26 (datable)
  { url: "https://www.linkedin.com/posts/me_another-undatable", date: "" }, // older undatable
];
const ordered = orderByRecency(items, now);
const otok = ordered[0].url.includes("just-posted-yesterday") && ordered[1].url.includes("activity:");
console.log(`${otok ? "✅" : "❌"} slider order: brand-new undatable post stays on the LEFT (not buried)`);

process.exit(ok && tok && otok ? 0 : 1);
