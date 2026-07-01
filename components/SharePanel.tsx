"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SharePanel — the honorable viral surface. The USER shares THEIR OWN portfolio to THEIR feed,
// one click, on their terms. No OAuth, no contact-list read, no address-book upload — we never
// touch anyone's connections. Each recipient chooses to make their own; the shared portfolio's
// footer carries the attribution (?ref=<slug>) so the referrer gets standing when an invitee
// ships. This is why a portfolio in this network is trusted — that's the brand.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";

const MSG = "I built my agentic portfolio — an AI agent that answers for me, 24/7. Make yours free (no code):";

export function SharePanel({ url, className = "" }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(MSG);

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
  const x = `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  const email = `mailto:?subject=${encodeURIComponent("My agentic portfolio")}&body=${t}%0A%0A${u}`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <a href={linkedin} target="_blank" rel="noreferrer" className="chip border-accent/50 text-accent">Share on LinkedIn</a>
        <a href={x} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">Share on X</a>
        <a href={email} className="chip border-edge text-muted hover:border-accent">Email it</a>
        <button onClick={copy} className="chip border-edge text-muted hover:border-accent">{copied ? "✓ Copied" : "Copy link"}</button>
      </div>
      <p className="mt-2 text-xs text-muted">
        We never read your contacts. You share; they choose — and when someone you invited ships their own,
        your <a href="/society" className="text-accent hover:underline">TRUE standing</a> rises. That&apos;s the network effect, earned.
      </p>
    </div>
  );
}
