/* ───────────────────────────────────────────────────────────────────────────
 * background.js — opens YOUR portfolio tab when the LinkedIn button fires.
 * The only privileged action; it performs NO network requests. The harvested
 * posts ride in chrome.storage.local and are read by content-portfolio.js on the
 * portfolio page — a purely local handoff (zero-trust, 12X #5).
 *
 * Forking this for your own deploy? Change PORTFOLIO_URL below, and add your
 * origin to the portfolio content-script `matches` in manifest.json.
 * ─────────────────────────────────────────────────────────────────────────── */
const PORTFOLIO_URL = "https://agentic-portfolio-lovat.vercel.app/"; // ← your deploy

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "open-portfolio") {
    // #import-pending is a hint; content-portfolio.js checks storage regardless.
    chrome.tabs.create({ url: PORTFOLIO_URL.replace(/#.*$/, "") + "#import-pending" });
  }
});
