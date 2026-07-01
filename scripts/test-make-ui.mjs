// Real-browser UI test for the /make form — TYPES character-by-character to catch focus-loss bugs
// (a component defined inside another component remounts the input on every keystroke → you can
// only type one character at a time). curl/SSR can't catch this; only real typing can.
//
//   Run against a dev/prod server:  TEST_URL=http://localhost:3000 npm run test:e2e
//   …or against the live deploy:     TEST_URL=https://your-app.vercel.app npm run test:e2e
// Skips cleanly (exit 0) if Playwright isn't installed, so it never blocks the pure `npm test`.

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { console.log("⏭  playwright not installed — skipping UI test (run `npx playwright install chromium` to enable)"); process.exit(0); }

const BASE = process.env.TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage();
let ok = true;
try {
  await page.goto(`${BASE}/make`, { waitUntil: "networkidle", timeout: 30000 });
  const cases = [
    ["name",   page.getByLabel("Your name", { exact: false }).first(), "Jane Doe"],
    ["email",  page.getByLabel("Email", { exact: false }).first(), "jane@example.com"],
    ["résumé", page.locator("textarea").first(), "Staff ML engineer, 8 years shipping AI apps."],
    ["github", page.getByLabel("GitHub", { exact: false }).first(), "https://github.com/jane"],
  ];
  for (const [name, loc, text] of cases) {
    await loc.click();
    await loc.pressSequentially(text, { delay: 20 }); // real keystrokes — reproduces focus loss
    const got = await loc.inputValue();
    const pass = got === text;
    console.log(`${pass ? "✅" : "❌"} ${name}: typed "${text}" → "${got}"${pass ? "" : "  ← DROPPED CHARACTERS"}`);
    if (!pass) ok = false;
  }
} catch (e) {
  console.log("❌ make-ui:", e.message);
  ok = false;
} finally {
  await browser.close();
}
console.log(ok ? "✅ make-ui: typing works, no focus loss" : "❌ make-ui: FORM IS BROKEN");
process.exit(ok ? 0 : 1);
