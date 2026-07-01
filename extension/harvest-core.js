/* ───────────────────────────────────────────────────────────────────────────
 * harvest-core.js — the SELF-HEALING dedupe engine, shared by:
 *   • the browser extension's content script (extension/content-linkedin.js)
 *   • the Node test (scripts/test-harvest.mjs)
 * It is the SAME algorithm as public/linkedin-harvest.js (the no-install console
 * fallback), factored out so the tricky union-find dedupe is written ONCE and unit
 * tested, while each runner keeps only its thin DOM-walking glue.
 *
 * UMD shim: as a classic content script `module` is undefined → it publishes
 * `self.__harvestCore`; under Node it sets `module.exports`. No bundler needed.
 * ─────────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node
  else root.__harvestCore = api; // browser content script (shared isolated world)
})(typeof self !== "undefined" ? self : this, function () {
  // Stable public-route matcher (durable: LinkedIn can't change these without
  // breaking every shared link). Returned fresh so a stateful /g lastIndex never bites.
  const urlRe = () =>
    /https?:\/\/(?:www\.)?linkedin\.com\/(?:feed\/update\/urn:li:activity:\d+|posts\/[A-Za-z0-9._%-]+|pulse\/[A-Za-z0-9._%-]+)/gi;

  // A collector accumulates posts and collapses aliases of the SAME post (an
  // activity id AND a canonical URL) into one entry, keeping the richest URL+text.
  function createCollector() {
    const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
    const norm = (u) => String(u || "").split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
    const actId = (u) => {
      const m = String(u).match(/(?:urn:li:activity:|activity[:-])(\d+)/i);
      return m ? m[1] : null;
    };
    // pulse (has metadata) > posts > feed/update — prefer the richest URL form.
    const rank = (u) => (/\/pulse\//.test(u) ? 3 : /\/posts\//.test(u) ? 2 : /\/feed\/update\//.test(u) ? 1 : 0);

    const items = [];
    const idMap = new Map(); // activity id -> entry
    const urlMap = new Map(); // normalised url -> entry
    const counts = { json: 0, urn: 0, links: 0 };

    const absorb = (e, url, title, summary) => {
      if (rank(url) > rank(e.url)) e.url = url;
      const t = clean(title), s = clean(summary);
      if (t && t.length > (e.title || "").length && t !== "(LinkedIn post)") e.title = t;
      if (s && s.length > (e.summary || "").length) e.summary = s;
    };
    // Union-find fuse: a later signal proved two entries are the same post.
    const fuse = (a, b) => {
      if (a === b) return a;
      absorb(a, b.url, b.title, b.summary);
      const i = items.indexOf(b);
      if (i >= 0) items.splice(i, 1);
      for (const [k, v] of idMap) if (v === b) idMap.set(k, a);
      for (const [k, v] of urlMap) if (v === b) urlMap.set(k, a);
      return a;
    };
    const add = (url, title, summary, idHint) => {
      if (!url) return;
      const id = idHint || actId(url);
      const nu = norm(url);
      const a = id ? idMap.get(id) : null;
      const b = urlMap.get(nu);
      let entry = a && b ? fuse(a, b) : a || b;
      if (!entry) { entry = { url, title: clean(title), summary: clean(summary) }; items.push(entry); }
      else absorb(entry, url, title, summary);
      if (id) idMap.set(id, entry);
      urlMap.set(nu, entry);
      urlMap.set(norm(entry.url), entry);
    };

    return { add, items, counts, clean, norm, actId, rank };
  }

  return { createCollector, urlRe };
});
