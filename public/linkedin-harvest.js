/* ───────────────────────────────────────────────────────────────────────────
 * LinkedIn activity harvester — SELF-HEALING edition
 * (for the agentic-portfolio "import posts" flow)
 *
 * WHY THIS EXISTS: LinkedIn's activity feed is login-walled, so a server can't
 * scrape it. YOU are logged in — so this runs in YOUR browser, auto-scrolls your
 * feed, reads each post's {url,title,summary}, and copies a JSON list to your
 * clipboard. Paste it to your portfolio copilot: “import these posts: <paste>”.
 *
 * WHY IT (almost) NEVER BREAKS: LinkedIn changes its CSS class names constantly,
 * so we DON'T rely on them. We key off three STABLE signals and merge them:
 *   1. URL patterns  — /feed/update/urn:li:activity:…, /posts/…, /pulse/…
 *      (public routes; LinkedIn can't change these without breaking every link)
 *   2. data-urn      — the activity's stable data id (not a styling class)
 *   3. embedded JSON — the serialized model LinkedIn ships in the page
 * If one strategy finds nothing, the others still do. If ALL find nothing, it
 * self-diagnoses and copies a DIAGNOSTIC bundle to your clipboard so the fix is
 * one paste away — no guessing.
 *
 * RUN IT: open https://www.linkedin.com/in/<you>/recent-activity/all/ , open
 * DevTools → Console (Cmd/Ctrl+Shift+J), paste this whole file, Enter. (Console
 * paste bypasses LinkedIn's CSP; a javascript: bookmarklet may be blocked.)
 * ─────────────────────────────────────────────────────────────────────────── */
(async function harvestLinkedInActivity() {
  const SCROLL_PAUSE = 1200, MAX_ROUNDS = 60;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  // Normalise a URL for dedupe (drop query/hash/trailing slash, lowercase).
  const norm = (u) => String(u || "").split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();

  // ── 1) Load the whole feed ──────────────────────────────────────────────────
  let lastHeight = 0, stable = 0;
  for (let i = 0; i < MAX_ROUNDS && stable < 3; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_PAUSE);
    const h = document.body.scrollHeight;
    if (h === lastHeight) stable++; else { stable = 0; lastHeight = h; }
  }

  // Dedupe by the post's stable ACTIVITY ID when we can find one — the SAME post
  // appears under different URLs (/posts/…activity-123…, /feed/update/urn:li:activity:123/),
  // and only the id collapses them. Fall back to the normalised URL otherwise.
  const actId = (u) => {
    const m = String(u).match(/(?:urn:li:activity:|activity[:-])(\d+)/i);
    return m ? m[1] : null;
  };
  // Prefer the richest URL form for the same post: pulse (has metadata) > posts > feed/update.
  const rank = (u) => (/\/pulse\//.test(u) ? 3 : /\/posts\//.test(u) ? 2 : /\/feed\/update\//.test(u) ? 1 : 0);

  // Alias-based dedupe: the SAME post reaches us under multiple keys — an activity
  // id (from a container or a /posts/ slug) AND a canonical URL (a /pulse/ link).
  // We treat BOTH as aliases of one shared entry, so a pulse article found by its
  // URL (strategy 1) and by its container id (strategy 2) collapse into one.
  const items = [];
  const idMap = new Map(); // "123"      -> entry
  const urlMap = new Map(); // normUrl   -> entry
  const absorb = (e, url, title, summary) => {
    if (rank(url) > rank(e.url)) e.url = url; // keep the richest URL form
    const t = clean(title), s = clean(summary);
    if (t && t.length > (e.title || "").length && t !== "(LinkedIn post)") e.title = t;
    if (s && s.length > (e.summary || "").length) e.summary = s;
  };
  // Union-find fuse: a later signal proved two existing entries are the SAME post
  // (e.g. a bare feed/update found by URL + a pulse share linked by container id).
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
    let entry = a && b ? fuse(a, b) : a || b; // fuse if the two aliases hit different entries
    if (!entry) { entry = { url, title: clean(title), summary: clean(summary) }; items.push(entry); }
    else absorb(entry, url, title, summary);
    if (id) idMap.set(id, entry);
    urlMap.set(nu, entry);
    urlMap.set(norm(entry.url), entry); // alias the entry's current best URL too
  };

  const counts = { json: 0, urn: 0, links: 0 };

  // ── Strategy 1: STABLE URL patterns anywhere on the page ────────────────────
  // The most durable signal — public routes. Guarantees we capture URLs even if
  // the visual DOM is unrecognisable.
  const URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/(?:feed\/update\/urn:li:activity:\d+|posts\/[A-Za-z0-9._%-]+|pulse\/[A-Za-z0-9._%-]+)/gi;
  const html = document.documentElement.innerHTML;
  (html.match(URL_RE) || []).forEach((u) => { counts.links++; add(u, "", ""); });
  // Also build URLs from bare activity URNs found in the markup/JSON.
  (html.match(/urn:li:activity:\d+/g) || []).forEach((urn) => {
    counts.links++; add("https://www.linkedin.com/feed/update/" + urn + "/", "", "");
  });

  // ── Strategy 2: data-urn containers → URL + longest text (no class names) ────
  // For TEXT we take the longest text block inside the container (post body is
  // almost always the longest run), so we don't depend on a specific class.
  function longestText(el) {
    let best = "";
    el.querySelectorAll('span[dir="ltr"], p, span, div').forEach((n) => {
      if (n.querySelector("button, a, input, textarea")) return; // skip chrome
      const t = clean(n.innerText);
      if (t.length > best.length && t.length < 4000) best = t;
    });
    return best;
  }
  document.querySelectorAll('[data-urn^="urn:li:activity:"]').forEach((el) => {
    const urn = el.getAttribute("data-urn");
    const pulse = el.querySelector('a[href*="/pulse/"]');
    const text = longestText(el);
    const id = (urn.match(/\d+/) || [])[0]; // the container's activity id — dedupe anchor
    counts.urn++;
    if (pulse) add(pulse.href, clean(pulse.innerText) || text.slice(0, 140), text.slice(0, 300), id);
    else add("https://www.linkedin.com/feed/update/" + urn + "/", text.slice(0, 90) || "(LinkedIn post)", text.slice(0, 400), id);
  });

  // ── Strategy 3: embedded JSON model (durable across CSS changes) ─────────────
  // LinkedIn ships serialized data in <code> nodes. Pair each activity urn with
  // the nearest commentary text in the same JSON blob.
  document.querySelectorAll('code, script[type="application/json"]').forEach((node) => {
    const raw = node.textContent || "";
    if (raw.indexOf("urn:li:activity:") === -1) return;
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      const urn = o.entityUrn || o.urn || o["*urn"];
      const txt =
        (o.commentary && (o.commentary.text?.text || o.commentary.text)) ||
        (o.text && (o.text.text || o.text)) || "";
      if (typeof urn === "string" && /urn:li:activity:\d+/.test(urn) && typeof txt === "string" && txt) {
        const id = urn.match(/urn:li:activity:\d+/)[0];
        counts.json++;
        add("https://www.linkedin.com/feed/update/" + id + "/", clean(txt).slice(0, 90) || "(LinkedIn post)", clean(txt).slice(0, 400));
      }
      for (const k in o) if (typeof o[k] === "object") walk(o[k]);
    };
    walk(data);
  });

  // ── Hand off, or self-diagnose if everything failed ─────────────────────────
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };

  if (items.length > 0) {
    const json = JSON.stringify(items);
    const copied = await copy(json);
    console.log("[linkedin-harvest] strategies:", counts, "→ collected", items.length, items);
    if (!copied) console.log("[linkedin-harvest] clipboard blocked — copy this JSON:\n", json);
    alert(
      "LinkedIn harvester ✓ collected " + items.length + " posts " +
      "(json:" + counts.json + " urn:" + counts.urn + " links:" + counts.links + ").\n" +
      (copied ? "Copied to clipboard. " : "Clipboard blocked — copy the JSON from the console (F12). ") +
      'Paste into your portfolio agent: “import these posts: <paste>”.',
    );
    return;
  }

  // Zero collected → auto-diagnose so the fix is instant (no "what did you see?").
  const diag = {
    note: "linkedin-harvest collected 0 — LinkedIn DOM likely changed. Paste this to your portfolio agent so it can fix the selectors.",
    url: location.href,
    counts,
    urnEls: document.querySelectorAll('[data-urn^="urn:li:activity:"]').length,
    anchors: document.querySelectorAll("a[href]").length,
    activityHrefs: (html.match(URL_RE) || []).length,
    activityUrns: (html.match(/urn:li:activity:\d+/g) || []).length,
    codeBlocks: document.querySelectorAll('code, script[type="application/json"]').length,
    bodyTextLen: (document.body.innerText || "").length,
    sample: (html.match(/<[a-z]+[^>]*data-urn[^>]*>/i) || [""])[0].slice(0, 300),
  };
  const payload = "LINKEDIN-HARVEST-DIAGNOSTIC " + JSON.stringify(diag);
  const copied = await copy(payload);
  console.warn("[linkedin-harvest] collected 0 — diagnostic:", diag);
  alert(
    "LinkedIn harvester collected 0 posts — their markup likely changed.\n" +
    (copied ? "A DIAGNOSTIC was copied to your clipboard. " : "Copy the diagnostic from the console (F12). ") +
    "Paste it to your portfolio agent and it'll fix the harvester from that data — no guessing.",
  );
})();
