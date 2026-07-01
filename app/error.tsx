"use client";

// Route-level error boundary. If anything in the page subtree throws at render time,
// React renders THIS instead of unmounting to a blank white page. The user gets a
// clear message + a recovery button rather than a dead screen. (Prevents the
// "webapp breaks on certain input → blank page" failure class.)

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[portfolio] page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-5">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">Something went wrong</p>
      <h2 className="text-2xl font-bold text-ink">This page hit an unexpected error.</h2>
      <p className="text-muted">
        Nothing was changed and your data is safe. This is usually transient — try again, or reload
        the page. If it keeps happening, the chat agent and the rest of the site still work.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="chip border-accent/50 text-accent">Try again</button>
        <a href="/" className="chip border-edge text-ink hover:border-accent">Reload home</a>
      </div>
    </div>
  );
}
