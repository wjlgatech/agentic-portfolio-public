"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SharePanel — the Share Studio. The honorable viral surface: the USER shares THEIR OWN portfolio,
// one click, on their terms. No OAuth, no contact-list read, no address-book upload — ever.
//
// Gives them the two things that make sharing effortless:
//  1) an auto-generated THUMBNAIL (the /opengraph-image card) — preview + download for YouTube/IG,
//     and it unfurls automatically on X/LinkedIn/Facebook/Slack/Discord when they share the link.
//  2) PER-PLATFORM COPY (computed in code — instant, free) with a copy button each, plus 1-click
//     post intents where the platform supports them (X, LinkedIn, Facebook, Bluesky). YouTube/IG
//     don't take link posts, so we're honest: download the image + copy the caption.
// The shared portfolio's footer carries ?ref=<slug>, so a referral that ships lifts your standing.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { shareCopy } from "@core/share-copy";

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ } }}
      className="chip border-edge text-muted hover:border-accent"
    >{done ? "✓ Copied" : label}</button>
  );
}

export function SharePanel({ url, name = "", tagline = "", className = "" }: { url: string; name?: string; tagline?: string; className?: string }) {
  const copy = shareCopy(name, tagline, url);
  const u = encodeURIComponent(url);
  const thumb = `${url.replace(/\/$/, "")}/opengraph-image`;

  // 1-click post intents (only the platforms that actually support a web share composer).
  const intents = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(copy.x)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(copy.x)}`,
    email: `mailto:?subject=${encodeURIComponent("My agentic portfolio")}&body=${encodeURIComponent(copy.youtube)}`,
  };

  return (
    <div className={className}>
      {/* Thumbnail — the "amazing card" that unfurls everywhere. */}
      <div className="grid gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="Your share thumbnail" className="w-full rounded-theme border border-edge" style={{ aspectRatio: "1200 / 630" }} />
        <div className="flex flex-wrap items-center gap-2">
          <a href={thumb} download="agentic-portfolio-thumbnail.png" target="_blank" rel="noreferrer" className="chip border-accent2/50 text-accent2">⬇ Download thumbnail</a>
          <CopyBtn text={url} label="Copy link" />
          <span className="text-xs text-muted">This card auto-appears when you paste your link on X, LinkedIn, Slack…</span>
        </div>
      </div>

      {/* 1-click post — link platforms. */}
      <p className="mt-4 text-sm font-semibold text-ink">Post in one click</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a href={intents.x} target="_blank" rel="noreferrer" className="chip border-accent/50 text-accent">Post on X</a>
        <a href={intents.linkedin} target="_blank" rel="noreferrer" className="chip border-accent/50 text-accent">Share on LinkedIn</a>
        <a href={intents.facebook} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">Facebook</a>
        <a href={intents.bluesky} target="_blank" rel="noreferrer" className="chip border-edge text-muted hover:border-accent">Bluesky</a>
        <a href={intents.email} className="chip border-edge text-muted hover:border-accent">Email</a>
      </div>

      {/* Copy-paste captions — per platform. */}
      <p className="mt-4 text-sm font-semibold text-ink">Or copy a ready-made caption</p>
      <div className="mt-2 grid gap-3">
        {([
          ["X / Twitter", copy.x, "(fits 280 — the Post button above prefills it)"],
          ["LinkedIn", copy.linkedin, "(LinkedIn strips prefilled text — paste this after Share)"],
          ["YouTube / description", copy.youtube, "(for a video or community post)"],
          ["Instagram / TikTok", copy.instagram, "(no link posts — download the thumbnail above + paste this)"],
        ] as const).map(([label, text, hint]) => (
          <div key={label} className="rounded-theme border border-edge bg-surface p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-accent">{label}</span>
              <CopyBtn text={text} />
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm text-muted" style={{ fontFamily: "inherit" }}>{text}</pre>
            <p className="mt-1 text-[11px] text-muted">{hint}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted">
        We never read your contacts. You share; they choose — and when someone you invited ships their own,
        your <a href="/society" className="text-accent hover:underline">TRUE standing</a> rises. That&apos;s the network effect, earned.
      </p>
    </div>
  );
}
