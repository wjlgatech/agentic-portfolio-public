"use client";

// Root error boundary — catches errors in the root layout itself (the last line of
// defense against a blank white page). It must render its own <html>/<body> because
// it replaces the root layout, so it uses inline styles (the app CSS may not be loaded).

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F0EEE6",
          color: "#28231D",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: "32rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "0.8rem", color: "#CC785C", fontWeight: 600 }}>
            Something went wrong
          </p>
          <h2 style={{ fontSize: "1.6rem", margin: "0.5rem 0 0.75rem" }}>The app hit an unexpected error.</h2>
          <p style={{ color: "#6b6258", lineHeight: 1.6 }}>
            Nothing was changed. Please reload the page — it's usually transient.
          </p>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{ padding: "0.6rem 1.1rem", borderRadius: "0.6rem", border: "1px solid #CC785C", background: "transparent", color: "#CC785C", cursor: "pointer", fontWeight: 600 }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "0.6rem 1.1rem", borderRadius: "0.6rem", border: "1px solid #d8d2c6", color: "#28231D", textDecoration: "none" }}
            >
              Reload home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
