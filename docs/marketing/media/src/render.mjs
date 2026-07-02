// Render the marketing art-boards (HTML → PNG) with Playwright at 2×, in any brand style.
// The theme seam is the same as app/themes.css: one token set per brand (themes.mjs), injected
// as CSS variables over the boards' baked-in Anthropic defaults — new brand = zero board edits.
//
//   node docs/marketing/media/src/render.mjs                 # default: anthropic → media/*.png
//   node docs/marketing/media/src/render.mjs --theme apple   # → media/themes/apple/*.png
//   node docs/marketing/media/src/render.mjs --all           # every brand (default → media/, rest → media/themes/)
//
// Skips cleanly if Playwright isn't installed (same convention as scripts/test-make-ui.mjs).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { THEMES, DEFAULT_THEME, themeCss } from "./themes.mjs";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("⏭  playwright not installed — run `npx playwright install chromium` first"); process.exit(0); }

const SRC = dirname(fileURLToPath(import.meta.url));
const MEDIA = join(SRC, "..");
const BOARDS = [
  { file: "thumbnail.html", out: "article-thumbnail.png", width: 1200, height: 628 },
  { file: "stats.html", out: "infographic-research.png", width: 1080, height: 1350 },
  { file: "compare.html", out: "infographic-dead-vs-living.png", width: 1080, height: 1350 },
  { file: "loop.html", out: "infographic-viral-loop.png", width: 1080, height: 1350 },
];

const args = process.argv.slice(2);
const themeArg = args.includes("--theme") ? args[args.indexOf("--theme") + 1] : DEFAULT_THEME;
const themes = args.includes("--all") ? Object.keys(THEMES) : [themeArg];
for (const t of themes) if (!THEMES[t]) { console.error(`Unknown theme "${t}". Available: ${Object.keys(THEMES).join(", ")}`); process.exit(1); }

const browser = await chromium.launch();
for (const theme of themes) {
  const outDir = theme === DEFAULT_THEME ? MEDIA : join(MEDIA, "themes", theme);
  mkdirSync(outDir, { recursive: true });
  for (const b of BOARDS) {
    const page = await browser.newPage({ viewport: { width: b.width, height: b.height }, deviceScaleFactor: 2 });
    await page.goto(`file://${join(SRC, b.file)}`);
    await page.addStyleTag({ content: themeCss(theme) }); // later in cascade → overrides the baked-in defaults
    await page.screenshot({ path: join(outDir, b.out) });
    await page.close();
    console.log(`✅ [${theme}] ${b.out} (${b.width}×${b.height} @2x)`);
  }
}
await browser.close();
