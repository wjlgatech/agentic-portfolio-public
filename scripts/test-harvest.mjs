// Tests the SHARED self-healing collector (extension/harvest-core.js) that powers
// both the browser extension and the console harvester. Run: node scripts/test-harvest.mjs
//
// The collector's union-find dedupe is the tricky part: the SAME post arrives under
// multiple aliases (an activity id AND a canonical URL, a /pulse/ share AND a
// /feed/update/), and only fusing them keeps the count honest. This drives the same
// fixture through it and asserts class-independence + cross-alias fusion.

const core = (await import("../extension/harvest-core.js")).default;
const { createCollector, urlRe } = core;
const c = createCollector();

const html = `
<div class="xQzAb_99" data-urn="urn:li:activity:7777777777"><span dir="ltr">Short post.</span>
 <a href="https://www.linkedin.com/feed/update/urn:li:activity:7777777777/?utm=feed">x</a></div>
<div class="newRandomClass_2026" data-urn="urn:li:activity:8888888888">
 <a href="https://www.linkedin.com/pulse/language-becoming-infrastructure-trust-requires-formal-wu-phd-qfykc/?trk=x">Language Is Becoming Infrastructure</a></div>
<a href="https://www.linkedin.com/posts/pauljialiangwu_some-slug-activity-9999999999-abcd">repost</a>
<code style="display:none">{"included":[{"entityUrn":"urn:li:activity:1010101010","commentary":{"text":{"text":"Embedded JSON body."}}}]}</code>`;

// Strategy 1 — stable public-route URLs (and bare urns) found in the markup.
(html.match(urlRe()) || []).forEach((u) => c.add(u, "", ""));
(html.match(/urn:li:activity:\d+/g) || []).forEach((u) => c.add("https://www.linkedin.com/feed/update/" + u + "/", "", ""));
// Strategy 2 — a data-urn container whose pulse link is fused by activity id.
c.add("https://www.linkedin.com/pulse/language-becoming-infrastructure-trust-requires-formal-wu-phd-qfykc/", "Language Is Becoming Infrastructure", "", "8888888888");
// Strategy 3 — embedded JSON model.
for (const m of html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/gi)) {
  try {
    (function w(o) {
      if (!o || typeof o !== "object") return;
      const urn = o.entityUrn;
      const txt = o.commentary && o.commentary.text && o.commentary.text.text;
      if (typeof urn === "string" && txt) c.add("https://www.linkedin.com/feed/update/" + urn + "/", txt.slice(0, 90), txt.slice(0, 400), urn.match(/\d+/)[0]);
      for (const k in o) if (typeof o[k] === "object") w(o[k]);
    })(JSON.parse(m[1]));
  } catch { /* not JSON */ }
}

const items = c.items;
console.log("unique posts:", items.length);
items.forEach((i) => console.log("   rank" + c.rank(i.url), c.actId(i.url) || "-", i.url.slice(0, 64), "| ", (i.title || "(none)").slice(0, 36)));
const p = items.find((i) => /pulse/.test(i.url));
const ok = items.length === 4 && p && p.title.includes("Infrastructure") && items.filter((i) => /pulse/.test(i.url)).length === 1;
console.log(ok ? "✅ 4 unique posts; pulse fused across URL+id; richest URL+title kept; class-independent" : "❌ FAIL");
process.exit(ok ? 0 : 1);
