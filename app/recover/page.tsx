"use client";

// /recover — the landing page for the owner-recovery magic link. Two flavors:
//   /recover?slug=…&token=…  → hosted /p/<slug> portfolio: confirms with /api/recover,
//     stores the freshly re-minted owner token locally.
//   /recover?token=…         → the ROOT portfolio (PORTFOLIO_OWNER_TOKEN gate): confirms
//     with /api/owner/recover; the returned ownerUrl carries a signed session that
//     Portfolio.tsx picks up from ?owner=… and persists.
// Either way the owner lands back in Owner mode. No account, no password — just the link.
import { useEffect, useState } from "react";

export default function Recover() {
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [msg, setMsg] = useState("Unlocking your portfolio…");
  const [url, setUrl] = useState("");
  const [hosted, setHosted] = useState(false); // slug link → hosted /p/<slug>; else root

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const slug = (q.get("slug") || "").toLowerCase();
    const token = q.get("token") || "";
    setHosted(Boolean(slug));
    if (!token) { setState("error"); setMsg("This recovery link is incomplete."); return; }
    (async () => {
      try {
        // With a slug it's a hosted portfolio; without, the root site's owner gate.
        const endpoint = slug ? "/api/recover" : "/api/owner/recover";
        const body = slug ? { slug, token } : { token };
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json();
        if (!r.ok || !d.ownerUrl) { setState("error"); setMsg(d.error || "This link is invalid or expired."); return; }
        // Persist the fresh owner token so the badge shows Owner mode, then go to the portfolio.
        // (Root flow: Portfolio.tsx itself persists the ?owner=… session on arrival.)
        try {
          const owner = new URL(d.ownerUrl).searchParams.get("owner") || "";
          if (slug && owner) localStorage.setItem(`portfolio-owner:${slug}`, owner);
        } catch { /* ignore */ }
        setUrl(d.ownerUrl); setState("done"); setMsg("You're back in — redirecting to your portfolio…");
        setTimeout(() => { window.location.href = d.ownerUrl; }, 1200);
      } catch (e) { setState("error"); setMsg((e as Error).message); }
    })();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="text-4xl">{state === "error" ? "🔒" : "🔓"}</div>
      <h1 className="mt-3 text-2xl font-bold text-ink">{state === "error" ? "Couldn't recover" : "Owner recovery"}</h1>
      <p className="mt-2 text-muted">{msg}</p>
      {state === "done" && url && <a href={url} className="mt-4 chip border-accent/50 text-accent">Go to my portfolio →</a>}
      {state === "error" && (hosted
        ? <a href="/make" className="mt-4 chip border-accent/50 text-accent">Re-make my portfolio →</a>
        : <a href="/" className="mt-4 chip border-accent/50 text-accent">Back to the portfolio → (request a new link from the 🔒 badge)</a>)}
    </main>
  );
}
