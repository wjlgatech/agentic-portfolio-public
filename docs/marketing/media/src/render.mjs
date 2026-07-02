// Render the marketing art-boards (HTML → PNG) with Playwright at 2× for crispness.
//   node docs/marketing/media/src/render.mjs
// Skips cleanly if Playwright isn't installed (same convention as scripts/test-make-ui.mjs).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("⏭  playwright not installed — run `npx playwright install chromium` first"); process.exit(0); }

const SRC = dirname(fileURLToPath(import.meta.url));
const OUT = join(SRC, "..");
const BOARDS = [
  { file: "thumbnail.html", out: "article-thumbnail.png", width: 1200, height: 628 },
  { file: "stats.html", out: "infographic-research.png", width: 1080, height: 1350 },
  { file: "compare.html", out: "infographic-dead-vs-living.png", width: 1080, height: 1350 },
  { file: "loop.html", out: "infographic-viral-loop.png", width: 1080, height: 1350 },
];

const browser = await chromium.launch();
for (const b of BOARDS) {
  const page = await browser.newPage({ viewport: { width: b.width, height: b.height }, deviceScaleFactor: 2 });
  await page.goto(`file://${join(SRC, b.file)}`);
  await page.screenshot({ path: join(OUT, b.out) });
  await page.close();
  console.log(`✅ ${b.out} (${b.width}×${b.height} @2x)`);
}
await browser.close();
