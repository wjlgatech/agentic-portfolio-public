// Unit tests for the Projects GitHub-sync core: the merge preserves curation, updates live
// fields, adds new repos, keeps private repos, and never deletes.
import { normalizeProjects, mergeGithubRepos, DEFAULT_CATEGORY } from "../packages/core/src/projects-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const current = [
  { name: "sos", category: "Self-Improving Agentic OS", highlight: "curated highlight", featured: true, private: false, language: "Python", stars: 10, pushed: "2025-01-01", url: "https://github.com/wjlgatech/sos" },
  { name: "anyagent", category: "Agent Frameworks & Tooling", highlight: "private, high-level", featured: false, private: true, language: "Python", stars: 2, pushed: "2025-02-01", url: null },
  { name: "archived-old", category: "Old", highlight: "still curated", featured: false, private: false, language: "JS", stars: 1, pushed: "2020-01-01", url: "https://github.com/wjlgatech/archived-old" },
];

const repos = [
  // existing public repo: live fields changed, curation must survive
  { name: "sos", description: "GITHUB DESCRIPTION (should NOT overwrite curated highlight)", language: "TypeScript", stargazers_count: 42, pushed_at: "2026-06-01T00:00:00Z", private: false, html_url: "https://github.com/wjlgatech/sos", fork: false, archived: false },
  // existing private repo: stays private, url stays null, stars update
  { name: "anyagent", description: "should not overwrite", language: "Python", stargazers_count: 9, pushed_at: "2026-07-01T00:00:00Z", private: true, html_url: "https://github.com/wjlgatech/anyagent", fork: false, archived: false },
  // brand-new repo → description becomes highlight, default category
  { name: "brand-new", description: "a freshly synced repo", language: "Rust", stargazers_count: 3, pushed_at: "2026-05-01T00:00:00Z", private: false, html_url: "https://github.com/wjlgatech/brand-new", fork: false, archived: false },
  // a fork and an archived repo → skipped
  { name: "some-fork", description: "x", pushed_at: "2026-01-01T00:00:00Z", private: false, html_url: "https://github.com/wjlgatech/some-fork", fork: true, archived: false },
  { name: "an-archive", description: "x", pushed_at: "2026-01-01T00:00:00Z", private: false, html_url: "https://github.com/wjlgatech/an-archive", fork: false, archived: true },
];

const { merged, added, updated } = mergeGithubRepos(current, repos);
const byName = Object.fromEntries(merged.map((p) => [p.name, p]));

check("curated highlight preserved (not overwritten by GitHub description)", byName.sos.highlight === "curated highlight");
check("curated category + featured preserved", byName.sos.category === "Self-Improving Agentic OS" && byName.sos.featured === true);
check("live fields updated (stars 10→42, language, pushed)", byName.sos.stars === 42 && byName.sos.language === "TypeScript" && byName.sos.pushed === "2026-06-01");
check("public repo keeps its real url", byName.sos.url === "https://github.com/wjlgatech/sos");

check("private repo KEPT (not dropped like the public-feed normalizer)", !!byName.anyagent && byName.anyagent.private === true);
check("private repo url stays null (link derived at render)", byName.anyagent.url === null);
check("private repo live field updated (stars 2→9)", byName.anyagent.stars === 9);

check("new repo added with description→highlight", byName["brand-new"] && byName["brand-new"].highlight === "a freshly synced repo");
check("new repo gets the default category", byName["brand-new"].category === DEFAULT_CATEGORY);
check("new repo not featured by default", byName["brand-new"].featured === false);

check("forks are skipped", !byName["some-fork"]);
check("archived repos are skipped", !byName["an-archive"]);

check("never deletes: a curated repo absent from GitHub survives", !!byName["archived-old"] && byName["archived-old"].highlight === "still curated");

check("added counts the new repo", added.length === 1 && added[0] === "brand-new");

// New-repo guards: no-description scratch repo is skipped; an old repo is skipped when addNewSince set.
const guarded = mergeGithubRepos(
  [],
  [
    { name: "scratch", description: "", pushed_at: "2026-06-01T00:00:00Z", html_url: "https://github.com/wjlgatech/scratch" },
    { name: "old-but-described", description: "has a description but ancient", pushed_at: "2019-01-01T00:00:00Z", html_url: "https://github.com/wjlgatech/old-but-described" },
    { name: "fresh", description: "recent + described", pushed_at: "2026-06-01T00:00:00Z", html_url: "https://github.com/wjlgatech/fresh" },
  ],
  { addNewSince: "2025-01-01" },
);
const gNames = guarded.merged.map((p) => p.name);
check("new repo with NO description is skipped", !gNames.includes("scratch"));
check("new repo older than addNewSince is skipped", !gNames.includes("old-but-described"));
check("new recent+described repo is added", gNames.includes("fresh"));
check("skipped count reflects the two guarded-out repos", guarded.skipped === 2);
check("updated counts the two changed existing repos", updated.length === 2 && updated.includes("sos") && updated.includes("anyagent"));

check("output is sorted newest-pushed first", merged[0].pushed >= merged[merged.length - 1].pushed);
check("normalizeProjects drops invalid entries", normalizeProjects([{ name: "" }, null, { name: "keep", pushed: "2025-01-01" }]).length === 1);

console.log(ok ? "\n✅ projects-sync: all pass" : "\n❌ projects-sync: FAIL");
process.exit(ok ? 0 : 1);
