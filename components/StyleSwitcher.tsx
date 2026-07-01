"use client";

import { useEffect, useState } from "react";

// The webapp-style theme seam: each entry is a swappable "body" selected by data-theme.
const THEMES: { id: string; label: string }[] = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "vercel", label: "Vercel" },
  { id: "stripe", label: "Stripe" },
  { id: "swiss", label: "Swiss" },
  { id: "brutalist", label: "Brutalist" },
  { id: "notion", label: "Notion" },
];

export function StyleSwitcher() {
  const [theme, setTheme] = useState("anthropic");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme || "anthropic";
    setTheme(t);
  }, []);

  function pick(id: string) {
    document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem("webapp-style", id);
    } catch {
      /* ignore */
    }
    setTheme(id);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="fixed right-4 top-4 z-50 text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="card flex items-center gap-2 !py-2 !px-3"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch brand style"
      >
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span className="font-medium text-ink">{current.label} style</span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="card absolute right-0 mt-2 w-44 !p-1.5"
        >
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                role="option"
                aria-selected={t.id === theme}
                onClick={() => pick(t.id)}
                className={`flex w-full items-center justify-between rounded-theme px-3 py-1.5 text-left transition-colors hover:bg-accent/10 ${
                  t.id === theme ? "text-ink" : "text-muted"
                }`}
              >
                {t.label}
                {t.id === theme && <span className="text-accent">●</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
