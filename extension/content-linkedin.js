/* ───────────────────────────────────────────────────────────────────────────
 * content-linkedin.js — runs on linkedin.com. Injects TWO buttons on your activity
 * page; on click it harvests your posts (in YOUR logged-in session — zero-trust:
 * no credentials, no server) and hands them to your portfolio tab.
 *
 *   ⚡ Latest      — fast: scrolls a few screens (recent posts are at the top), ~3s.
 *   ⬆ All history — full: scrolls to the end of your feed.
 * Both feed the same harvester + importPosts, which de-dupes by URL+title — so
 * "⚡ Latest" is a 1-click "load just what's new since last time."
 *
 * Agent-native (12X #3): the agent doing the digital work, in the authenticated
 * browser. Self-healing (#2): reuses the shared collector and self-diagnoses on a zero-result.
 * ─────────────────────────────────────────────────────────────────────────── */
(function () {
  const WRAP_ID = "agentic-portfolio-harvest-wrap";
  // Only offer the buttons where there are posts to harvest (activity/profile).
  const onHarvestable = () =>
    /linkedin\.com\/(in\/[^/?#]+|feed\/?$|.*recent-activity)/i.test(location.href);

  function mkBtn(label, bg, primary) {
    const b = document.createElement("button");
    b.textContent = label;
    Object.assign(b.style, {
      padding: primary ? "12px 16px" : "8px 12px",
      borderRadius: "10px", border: "none", cursor: "pointer", width: "100%",
      background: bg, color: "#fff",
      font: (primary ? "600 14px" : "500 12px") + "/1.2 system-ui, sans-serif",
      boxShadow: "0 6px 20px rgba(0,0,0,.25)",
    });
    return b;
  }

  function injectUI() {
    if (document.getElementById(WRAP_ID) || !onHarvestable()) return;
    const wrap = document.createElement("div");
    wrap.id = WRAP_ID;
    Object.assign(wrap.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: "2147483647",
      display: "flex", flexDirection: "column", gap: "8px", alignItems: "stretch", maxWidth: "260px",
    });
    const fast = mkBtn("⚡ Send latest posts", "#0a66c2", true);
    const full = mkBtn("⬆ Send ALL history (slower)", "#444", false);
    const both = [fast, full];
    // "latest": a few screens (recent posts are at the top). "all": to the end.
    fast.addEventListener("click", () => runHarvest({ rounds: 3, pause: 900, mode: "latest" }, fast, both));
    full.addEventListener("click", () => runHarvest({ rounds: 60, pause: 1200, mode: "all" }, full, both));
    wrap.append(fast, full);
    document.body.appendChild(wrap);
  }

  async function runHarvest(opts, btn, both) {
    const orig = btn.textContent;
    const origBg = btn.style.background;
    const set = (t, bg) => { btn.textContent = t; if (bg) btn.style.background = bg; };
    const enable = () => both.forEach((b) => (b.disabled = false));
    const restoreSoon = () => setTimeout(() => { set(orig, origBg); }, 5000);

    both.forEach((b) => (b.disabled = true));
    set(opts.mode === "latest" ? "⏳ Grabbing latest…" : "⏳ Scrolling all history…", "#444");

    const { createCollector, urlRe } = self.__harvestCore;
    const c = createCollector();
    const clean = c.clean;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // 1) Load posts. "latest" stops after a few screens; "all" goes to the end.
    let lastHeight = 0, stable = 0;
    for (let i = 0; i < opts.rounds && stable < 3; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(opts.pause);
      const h = document.body.scrollHeight;
      if (h === lastHeight) stable++; else { stable = 0; lastHeight = h; }
    }

    const html = document.documentElement.innerHTML;

    // Strategy 1 — stable public-route URLs anywhere in the markup.
    (html.match(urlRe()) || []).forEach((u) => { c.counts.links++; c.add(u, "", ""); });
    (html.match(/urn:li:activity:\d+/g) || []).forEach((urn) => {
      c.counts.links++; c.add("https://www.linkedin.com/feed/update/" + urn + "/", "", "");
    });

    // Strategy 2 — data-urn containers → URL + longest text (no class names).
    const longestText = (el) => {
      let best = "";
      el.querySelectorAll('span[dir="ltr"], p, span, div').forEach((n) => {
        if (n.querySelector("button, a, input, textarea")) return;
        const t = clean(n.innerText);
        if (t.length > best.length && t.length < 4000) best = t;
      });
      return best;
    };
    document.querySelectorAll('[data-urn^="urn:li:activity:"]').forEach((el) => {
      const urn = el.getAttribute("data-urn");
      const pulse = el.querySelector('a[href*="/pulse/"]');
      const text = longestText(el);
      const id = (urn.match(/\d+/) || [])[0];
      c.counts.urn++;
      if (pulse) c.add(pulse.href, clean(pulse.innerText) || text.slice(0, 140), text.slice(0, 300), id);
      else c.add("https://www.linkedin.com/feed/update/" + urn + "/", text.slice(0, 90) || "(LinkedIn post)", text.slice(0, 400), id);
    });

    // Strategy 3 — embedded JSON model (durable across CSS churn).
    document.querySelectorAll('code, script[type="application/json"]').forEach((node) => {
      const raw = node.textContent || "";
      if (raw.indexOf("urn:li:activity:") === -1) return;
      let data; try { data = JSON.parse(raw); } catch { return; }
      const walk = (o) => {
        if (!o || typeof o !== "object") return;
        const urn = o.entityUrn || o.urn || o["*urn"];
        const txt = (o.commentary && (o.commentary.text?.text || o.commentary.text)) ||
          (o.text && (o.text.text || o.text)) || "";
        if (typeof urn === "string" && /urn:li:activity:\d+/.test(urn) && typeof txt === "string" && txt) {
          const id = urn.match(/urn:li:activity:\d+/)[0];
          c.counts.json++;
          c.add("https://www.linkedin.com/feed/update/" + id + "/", clean(txt).slice(0, 90) || "(LinkedIn post)", clean(txt).slice(0, 400));
        }
        for (const k in o) if (typeof o[k] === "object") walk(o[k]);
      };
      walk(data);
    });

    // Hand off, or self-diagnose (12X #4: an honest ❌ beats a fake ✅).
    if (c.items.length === 0) {
      const diag = {
        note: "agentic-portfolio extension collected 0 — LinkedIn DOM likely changed. Paste to your portfolio agent.",
        url: location.href, counts: c.counts,
        urnEls: document.querySelectorAll('[data-urn^="urn:li:activity:"]').length,
        codeBlocks: document.querySelectorAll('code, script[type="application/json"]').length,
      };
      try { await navigator.clipboard.writeText("LINKEDIN-HARVEST-DIAGNOSTIC " + JSON.stringify(diag)); } catch {}
      set("⚠ Found 0 posts — diagnostic copied", "#b00");
      enable(); restoreSoon();
      return;
    }

    // Stash locally and ask the background to open YOUR portfolio. Nothing leaves
    // this machine except into your own site (zero-trust, 12X #5). importPosts
    // de-dupes, so re-running "⚡ Latest" only adds posts that are actually new.
    await chrome.storage.local.set({ pendingImport: { items: c.items, from: location.href } });
    chrome.runtime.sendMessage({ type: "open-portfolio" });
    set("✓ Sent " + c.items.length + " (" + opts.mode + ") — opening your portfolio…", "#0a7d33");
    enable(); restoreSoon();
  }

  // SPA-safe: inject now and on later navigations.
  injectUI();
  const obs = new MutationObserver(() => injectUI());
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
