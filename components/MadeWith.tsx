// ─────────────────────────────────────────────────────────────────────────────
// MadeWith.tsx — the creator-credit + viral footer on EVERY generated portfolio.
// Honors the creator (Paul Jialiang Wu), links his portfolio + the open-source product repo,
// and invites the next person (make your own · join the network). Open-source + free, but every
// page it appears on advertises the product, the creator, and the network — that's the flywheel
// that grows the brand's value. Presentational; safe to render anywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const CREATOR = "Paul Jialiang Wu";
export const CREATOR_URL = "https://agentic-portfolio-lovat.vercel.app/";
export const REPO_URL = "https://github.com/wjlgatech/agentic-portfolio-public";

export function MadeWith() {
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
        <a href="/make" className="chip border-accent/50 text-accent">✨ Make your own — free</a>
        <a href="/network" className="chip border-accent2/50 text-accent2">🌐 Join the network</a>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">⭐ Star the repo</a>
        <a href="/api/badge" target="_blank" rel="noreferrer" className="ml-auto"><img src="/api/badge" alt="agentic network" className="h-5" /></a>
      </div>
    </div>
  );
}
