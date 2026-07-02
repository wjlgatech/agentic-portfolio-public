// Friendly 404 — never a dead end (a no-mistakes antipattern). Points lost visitors at the two
// things worth doing here: make their own portfolio, or explore the network.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="text-5xl">🧭</div>
      <h1 className="mt-4 text-3xl font-bold text-ink">This page wandered off</h1>
      <p className="mt-2 text-muted">That portfolio or page isn&apos;t here — but you can make your own in about a minute.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a href="/make" className="rounded-theme bg-accent px-5 py-2.5 font-semibold text-white hover:opacity-90">✨ Make your own — free</a>
        <a href="/network" className="chip border-edge text-muted hover:border-accent">🌐 Explore the network</a>
      </div>
    </main>
  );
}
