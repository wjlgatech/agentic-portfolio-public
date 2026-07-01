/* ───────────────────────────────────────────────────────────────────────────
 * content-portfolio.js — runs on YOUR portfolio. Takes the harvested posts out of
 * chrome.storage.local and hands them to the page via its own localStorage key,
 * then pings the app. Portfolio.tsx picks it up and (if you're in owner mode)
 * imports + dedupes them through the SAME importPosts pipeline as a manual paste.
 *
 * Local handoff only — no fetch, no external server (zero-trust, 12X #5).
 * ─────────────────────────────────────────────────────────────────────────── */
(function () {
  if (!chrome?.storage?.local) return;
  chrome.storage.local.get("pendingImport", (res) => {
    const p = res && res.pendingImport;
    if (!p || !Array.isArray(p.items) || p.items.length === 0) return;
    try {
      // The page shares this origin's localStorage with us; Portfolio.tsx reads it.
      localStorage.setItem("portfolio-pending-import", JSON.stringify(p.items));
    } catch { /* storage blocked — nothing we can do */ }
    chrome.storage.local.remove("pendingImport");
    // Ping in case the app already mounted (fresh tab is covered by mount-read).
    try { window.dispatchEvent(new CustomEvent("portfolio:pending-import")); } catch { /* ignore */ }
  });
})();
