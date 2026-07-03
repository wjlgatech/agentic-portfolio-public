// Unit tests for the Deep Dive generator's pure helpers: the tolerant LLM-JSON parser and the
// HTML→text stripper + SSRF host guard. (The LLM distillation + grounding are verified live;
// normalizeArtifact's grounding is covered by test-deepen.mjs.)
import { parseLooseJson } from "../packages/core/src/deepen-types.ts";
import { htmlToText, isBlockedHost } from "../lib/source-fetch.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// parseLooseJson — tolerant of fences + surrounding prose.
check("parses a ```json fenced object", parseLooseJson('```json\n{"digest":"x","skills":[]}\n```')?.digest === "x");
check("parses a bare object wrapped in prose", parseLooseJson('Sure! Here it is:\n{"digest":"y"}\nHope that helps.')?.digest === "y");
check("parses nested braces to the outermost object", (() => { const o = parseLooseJson('{"graph":{"nodes":[]},"digest":"z"}'); return o?.digest === "z" && typeof o?.graph === "object"; })());
check("a top-level array returns null (must be an object)", parseLooseJson("[1,2,3]") === null);
check("garbage returns null (no throw)", parseLooseJson("not json at all") === null);
check("empty string returns null", parseLooseJson("") === null);

// htmlToText — strips scripts/styles/tags, decodes entities, collapses whitespace.
const html = '<html><head><style>.x{color:red}</style><script>var a=1<2;</script></head><body><h1>Hello &amp; welcome</h1><p>Line   one</p></body></html>';
const text = htmlToText(html);
check("script contents removed", !text.includes("var a"));
check("style contents removed", !text.includes("color:red"));
check("tags stripped + entities decoded", text.includes("Hello & welcome") && text.includes("Line one"));
check("whitespace collapsed", !/\s{2,}/.test(text));

// isBlockedHost — SSRF guard.
check("localhost blocked", isBlockedHost("localhost"));
check("127.0.0.1 blocked", isBlockedHost("127.0.0.1"));
check("10.x blocked", isBlockedHost("10.1.2.3"));
check("192.168.x blocked", isBlockedHost("192.168.0.1"));
check("public host allowed", !isBlockedHost("github.com") && !isBlockedHost("arxiv.org"));

console.log(ok ? "\n✅ deep-dive: all pass" : "\n❌ deep-dive: FAIL");
process.exit(ok ? 0 : 1);
