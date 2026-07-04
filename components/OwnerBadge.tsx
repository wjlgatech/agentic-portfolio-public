"use client";

// Discreet owner control. Hidden entirely on un-gated dev instances (you're already
// the owner there). On a gated site: shows 🔒 for visitors (click to enter the
// passphrase — or leave it blank to recover by email via /api/owner/recover) and
// 🔓 Owner for the owner (click to lock). Extracted from Portfolio.tsx.

import { useState } from "react";

export function OwnerBadge({
  isOwner,
  ownerRequired,
  onUnlock,
  onLock,
  name,
}: {
  isOwner: boolean;
  ownerRequired: boolean;
  onUnlock: (token: string) => Promise<boolean>;
  onLock: () => void;
  name: string;
}) {
  const [msg, setMsg] = useState("");
  if (!ownerRequired) return null; // un-gated (local dev) — no badge needed

  async function handleUnlock() {
    const token = window.prompt(
      `Enter ${name}'s owner passphrase to edit this portfolio:\n\n` +
      `Forgot it? Leave this blank and press OK to recover by email.`,
    );
    if (token === null) return; // cancelled
    if (!token.trim()) return recover(); // blank → email recovery
    const ok = await onUnlock(token);
    setMsg(ok ? "" : "Wrong passphrase.");
    if (!ok) window.setTimeout(() => setMsg(""), 2500);
  }

  async function recover() {
    setMsg("Sending recovery email…");
    try {
      const r = await fetch("/api/owner/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      window.alert(d.sent
        ? `📧 Recovery link sent to ${d.maskedTo}. Check your email (the link expires in 30 minutes).`
        : (d.note || d.error || "Couldn't send a recovery email."));
    } catch {
      window.alert("Couldn't reach recovery right now — try again.");
    }
    setMsg("");
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 text-sm">
      {isOwner ? (
        <button onClick={onLock} className="card flex items-center gap-2 !py-2 !px-3" title="You can edit this portfolio. Click to lock.">
          <span>🔓</span>
          <span className="font-medium text-ink">Owner mode</span>
        </button>
      ) : (
        <button onClick={handleUnlock} className="card flex items-center gap-2 !py-2 !px-3" title="Owner? Unlock to edit.">
          <span>🔒</span>
          <span className="font-medium text-muted">{msg || "View only"}</span>
        </button>
      )}
    </div>
  );
}
