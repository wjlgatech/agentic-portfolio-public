// ─────────────────────────────────────────────────────────────────────────────
// set-live-links.mjs — after you deploy this repo, point the README "See it live" gallery at your
// LIVE deploy (so `/make` and `/network` are clickable) instead of the "live once you deploy" note.
//
//   node scripts/set-live-links.mjs https://your-app.vercel.app   # → live links
//   node scripts/set-live-links.mjs                               # → reset to pre-deploy state
//
// Deterministic + idempotent: it regenerates the gallery table between the LIVE-LINKS markers, so
// re-running with a new URL just overwrites. The flagship example (Paul's real portfolio) is
// constant — only the repo's own /make + /network links move to your deploy. Then commit + push.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";

export const START = "<!-- LIVE-LINKS:START (regenerate: node scripts/set-live-links.mjs <deploy-url>) -->";
export const END = "<!-- LIVE-LINKS:END -->";

// Paul's real portfolio — the flagship interactive example. Constant (it's his content, not a template).
const FLAGSHIP = "https://agentic-portfolio-lovat.vercel.app";

export function buildGalleryTable(deployUrl) {
  const d = deployUrl ? String(deployUrl).replace(/\/+$/, "") : null;
  const networkCell = d ? `[/network ↗](${d}/network)` : `[/network ↗](${FLAGSHIP}/network)`;
  const makeCell = d
    ? `[**\`/make\`** — try it live ↗](${d}/make)`
    : "**`/make`** — live once you [deploy this repo (~2 min)](#-deploy-free)";
  return [
    "| See it | Open | What to try |",
    "|---|---|---|",
    `| 🧑‍💻 **A live portfolio** | [${FLAGSHIP.replace(/^https?:\/\//, "")} ↗](${FLAGSHIP}/) | Chat with the agent; open **Receipts** (claims audited against public GitHub). |`,
    `| 🌐 **The network** | ${networkCell} | Browse agent-portfolios; ask one question and every node's agent answers. |`,
    `| ✨ **Make your own** | ${makeCell} | Give **name + email + your résumé _or_ just your LinkedIn URL** → your own live portfolio in the same style, customized to you. |`,
  ].join("\n");
}

export function replaceBetweenMarkers(text, inner) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e < s) throw new Error("LIVE-LINKS markers not found in README.md");
  return text.slice(0, s + START.length) + "\n" + inner + "\n" + text.slice(e);
}

export function setLiveLinks(readme, deployUrl) {
  return replaceBetweenMarkers(readme, buildGalleryTable(deployUrl || null));
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2] || "";
  if (url && !/^https?:\/\//i.test(url)) {
    console.error("Usage: node scripts/set-live-links.mjs https://your-app.vercel.app");
    process.exit(1);
  }
  const path = new URL("../README.md", import.meta.url).pathname;
  const after = setLiveLinks(readFileSync(path, "utf8"), url || null);
  writeFileSync(path, after);
  console.log(url ? `✅ Gallery now points at ${url} (/make + /network are live links).` : "✅ Gallery reset to pre-deploy state.");
  console.log("Next: git add README.md && git commit -m 'docs: point gallery at the live deploy' && git push");
}
