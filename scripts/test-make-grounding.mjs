// Unit tests for the make-time grounding core — corpus assembly + the honest per-source report.
import { buildGroundingCorpus, feedToText, makeSourceReport } from "../packages/core/src/make-grounding.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// ── feedToText ───────────────────────────────────────────────────────────────
const feed = [
  { source: "youtube", title: "How I climb V10", url: "https://youtube.com/watch?v=1", category: "YouTube", summary: "training" },
  { source: "github", title: "cool-repo", url: "https://github.com/u/cool-repo", category: "GitHub" },
];
const lines = feedToText(feed);
check("feed items render as labeled lines", lines.includes("[YouTube] How I climb V10 — training") && lines.includes("[GitHub] cool-repo"));
check("empty/blank feed → empty string", feedToText([]) === "" && feedToText([{ source: "github", title: "", url: "" }]) === "");

// ── buildGroundingCorpus ─────────────────────────────────────────────────────
const full = buildGroundingCorpus({ resume: "I build agents.", linkedin: "Jane — PM at Acme", website: "Jane's site\nabout stuff", feed });
check("all given parts contribute, maker's words first", full.used.join(",") === "resume,linkedin,website,feed" && full.corpus.indexOf("MAKER'S OWN WORDS") < full.corpus.indexOf("LINKEDIN"));
check("each part is labeled", ["MAKER'S OWN WORDS", "LINKEDIN", "WEBSITE", "RECENT PUBLIC WORK"].every((l) => full.corpus.includes(l)));

const feedOnly = buildGroundingCorpus({ feed });
check("feed alone still grounds (the YouTube-only maker)", feedOnly.used.join(",") === "feed" && feedOnly.corpus.includes("cool-repo"));
check("nothing given → empty corpus, no sources used", buildGroundingCorpus({}).corpus === "" && buildGroundingCorpus({}).used.length === 0);
check("whitespace-only resume does not count as used", !buildGroundingCorpus({ resume: "   " }).used.includes("resume"));

const big = buildGroundingCorpus({ resume: "r".repeat(20000), website: "w".repeat(20000) });
check("per-part caps hold (résumé ≤6000, one source can't crowd out)", big.corpus.length <= 9000 && big.corpus.includes("WEBSITE"));
check("total budget is a hard cap", buildGroundingCorpus({ resume: "x".repeat(20000) }, 500).corpus.length <= 500);

// ── makeSourceReport: honesty encoded ────────────────────────────────────────
const links = { linkedin: "https://linkedin.com/in/jane", x: "https://x.com/jane", instagram: "https://instagram.com/jane", github: "https://github.com/jane", youtube: "https://youtube.com/@jane", website: "https://jane.dev", facebook: "https://facebook.com/jane" };
const report = makeSourceReport({ resumeChars: 100, links, linkedinPulled: false, websitePulled: true, counts: { github: 3, youtube: 0 } });
const by = (s) => report.find((r) => r.source === s);
check("one row per given source (+about)", report.length === 8);
check("blocked LinkedIn reported as blocked, with the paste escape hatch", by("linkedin").status === "blocked" && /paste/i.test(by("linkedin").note));
check("walled sources (x/ig/fb) are ALWAYS walled — never pulled, never fabricated", ["x", "instagram", "facebook"].every((s) => by(s).status === "walled" && /login-walled/i.test(by(s).note)));
check("pulled github carries its item count", by("github").status === "pulled" && by("github").items === 3);
check("youtube with 0 items → empty, with a how-to-fix note", by("youtube").status === "empty" && /channel/i.test(by("youtube").note));
check("website pulled", by("website").status === "pulled");
check("own words acknowledged", by("about").status === "pulled");

const none = makeSourceReport({ resumeChars: 0, links: {}, linkedinPulled: false, websitePulled: false, counts: {} });
check("no links given → no invented rows", none.length === 0);
const liOk = makeSourceReport({ resumeChars: 0, links: { linkedin: "https://linkedin.com/in/j" }, linkedinPulled: true, websitePulled: false, counts: {} });
check("pulled LinkedIn says public-metadata, no login", liOk[0].status === "pulled" && /public/i.test(liOk[0].note));

process.exit(ok ? 0 : 1);
