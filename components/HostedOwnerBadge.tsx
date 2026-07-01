"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HostedOwnerBadge — the visible owner↔visitor indicator on a hosted portfolio (/p/<slug>).
// The maker holds a per-portfolio owner token (from /make, or ?owner=<token>); a visitor holds
// none. The badge tells the TRUTH: it verifies the token against the server (a 200 from the
// owner-gated pipeline read) rather than trusting local presence — a bad/stale token shows as a
// visitor. Owner sees how to manage; a visitor just sees "View only". Discreet, bottom-left.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

const tokenKey = (slug: string) => `portfolio-owner:${slug}`;

export function HostedOwnerBadge({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<"loading" | "owner" | "visitor">("loading");

  useEffect(() => {
    let token = "";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("owner");
      if (fromUrl) localStorage.setItem(tokenKey(slug), fromUrl);
      token = localStorage.getItem(tokenKey(slug)) || "";
    } catch { /* ignore */ }
    if (!token) { setState("visitor"); return; }
    // Verify with the server — the badge must not lie.
    fetch(`/api/lead?instance=${encodeURIComponent(slug)}`, { headers: { "x-portfolio-owner": token } })
      .then((r) => setState(r.ok ? "owner" : "visitor"))
      .catch(() => setState("visitor"));
  }, [slug]);

  if (state === "loading") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-sm">
      {state === "owner" ? (
        <div className="card flex items-center gap-2 !py-2 !px-3" title={`You own ${name}'s portfolio. Ask the agent to "show my leads" to see your pipeline.`}>
          <span>🔓</span>
          <span className="font-medium text-ink">Owner mode</span>
          <span className="text-muted">· ask the agent to “show my leads”</span>
        </div>
      ) : (
        <div className="card flex items-center gap-2 !py-2 !px-3" title="This is a public portfolio. Only its owner can manage it or read its captured leads.">
          <span>🔒</span>
          <span className="font-medium text-muted">View only</span>
        </div>
      )}
    </div>
  );
}
