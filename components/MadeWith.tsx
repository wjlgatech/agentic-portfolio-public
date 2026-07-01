// ─────────────────────────────────────────────────────────────────────────────
// MadeWith.tsx — the creator-credit + viral footer on EVERY generated portfolio.
// Honors the creator (Paul Jialiang Wu), links his portfolio + the open-source product repo,
// and invites the next person (make your own · join the network). Open-source + free, but every
// page it appears on advertises the product, the creator, and the network — that's the flywheel
// that grows the brand's value.
//
// Viral attribution, automatic + privacy-safe: on a hosted portfolio (/p/<slug>) the "Make your
// own" link carries ?ref=<slug>, so when a visitor makes THEIR own, the owner gets standing. No
// contacts read — the referral is just this public page linking onward. Presentational.
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { usePathname } from "next/navigation";

export const CREATOR = "Paul Jialiang Wu";
export const CREATOR_URL = "https://agentic-portfolio-lovat.vercel.app/";
export const REPO_URL = "https://github.com/wjlgatech/agentic-portfolio-public";

export function MadeWith() {
  const pathname = usePathname() || "";
  const m = pathname.match(/^\/p\/([a-z0-9-]{1,48})/i); // on a hosted portfolio, attribute onward
  const makeHref = m ? `/make?ref=${m[1]}` : "/make";
  return (
    <div className="mt-8 border-t border-edge pt-6 text-sm text-muted">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          ✨ Made with{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-accent hover:underline">agentic-portfolio</a>
          {" "}— an open-source agentic portfolio, free to use.
        </span>
        <span className="text-muted">
          Created by{" "}
          <a href={CREATOR_URL} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-accent">{CREATOR}</a>.
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={makeHref} className="chip border-accent/50 text-accent">✨ Make your own — free</a>
        <a href="/society" className="chip border-accent2/50 text-accent2">🏛 The TRUE Society</a>
        <a href="/network" className="chip border-edge text-muted hover:border-accent">🌐 The network</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">⭐ Star the repo</a>
        <a href="/api/badge" target="_blank" rel="noreferrer" className="ml-auto"><img src="/api/badge" alt="agentic network" className="h-5" /></a>
      </div>
    </div>
  );
}
