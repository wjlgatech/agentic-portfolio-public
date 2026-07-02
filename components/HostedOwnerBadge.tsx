"use client";

// ─────────────────────────────────────────────────────────────────────────────
// HostedOwnerBadge — the visible owner↔visitor control on a hosted portfolio (/p/<slug>).
// The maker holds a per-portfolio owner token (the ?owner=<token> link shown once by /make). This
// badge (a) auto-unlocks from that link, (b) lets an owner SIGN IN by pasting their owner link or
// token, and (c) tells the TRUTH — it verifies the token server-side (a 200 from the owner-gated
// pipeline read), so a wrong/stale token shows as a visitor. Owner sees how to manage; a visitor
// sees "View only" + a discreet sign-in. Bottom-left.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from "react";

const tokenKey = (slug: string) => `portfolio-owner:${slug}`;
// Accept either a full owner link (…/p/slug?owner=TOKEN) or a raw token.
const extractToken = (input: string): string => {
  const s = input.trim();
  const m = s.match(/[?&]owner=([^&\s]+)/);
  return (m ? decodeURIComponent(m[1]) : s).trim();
};

export function HostedOwnerBadge({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<"loading" | "owner" | "visitor">("loading");
  const [msg, setMsg] = useState("");

  const verify = useCallback(async (token: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const r = await fetch(`/api/lead?instance=${encodeURIComponent(slug)}`, { headers: { "x-portfolio-owner": token } });
      return r.ok;
    } catch { return false; }
  }, [slug]);

  useEffect(() => {
    let token = "";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("owner");
      if (fromUrl) localStorage.setItem(tokenKey(slug), fromUrl);
      token = localStorage.getItem(tokenKey(slug)) || "";
    } catch { /* ignore */ }
    if (!token) { setState("visitor"); return; }
    verify(token).then((ok) => setState(ok ? "owner" : "visitor"));
  }, [slug, verify]);

  async function signIn() {
    const input = window.prompt(`Owner sign-in for ${name}'s portfolio\n\nPaste your owner link or token (the private ?owner=… link you got when you made this):`);
    if (!input) return;
    const token = extractToken(input);
    setMsg("Checking…");
    if (await verify(token)) {
      try { localStorage.setItem(tokenKey(slug), token); } catch { /* ignore */ }
      setMsg(""); setState("owner");
    } else {
      setMsg("That token isn't valid for this portfolio.");
      window.setTimeout(() => setMsg(""), 3500);
    }
  }

  function signOut() {
    try { localStorage.removeItem(tokenKey(slug)); } catch { /* ignore */ }
    setState("visitor");
  }

  if (state === "loading") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-sm">
      {state === "owner" ? (
        <button onClick={signOut} className="card flex items-center gap-2 !py-2 !px-3" title={`You own ${name}'s portfolio. Ask the agent to "show my leads". Click to sign out.`}>
          <span>🔓</span>
          <span className="font-medium text-ink">Owner mode</span>
          <span className="text-muted">· ask the agent to “show my leads”</span>
        </button>
      ) : (
        <button onClick={signIn} className="card flex items-center gap-2 !py-2 !px-3" title="Owner? Sign in with the owner link you got when you made this portfolio.">
          <span>🔒</span>
          <span className="font-medium text-muted">{msg || "View only"}</span>
          <span className="text-accent">· Owner? Sign in</span>
        </button>
      )}
    </div>
  );
}
