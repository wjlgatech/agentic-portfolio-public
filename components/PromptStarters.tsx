"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PromptStarters — curated, 1-click example prompts that illustrate what the on-page
// agent can do. Click a chip → it fills the CopilotKit chat input (it does NOT auto-
// send) so you can customize it (e.g. paste your résumé) and then hit send. Renders
// a dismissible row just above the chat input; finds the input the same way VoiceInput
// does (selector + MutationObserver), so it works with the lazily-mounted sidebar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const INPUT_SELECTOR = "textarea[placeholder='Type a message...'], .copilotKitInput textarea";

// Curated to show the breadth of capabilities. Owner-only ones still work as starters —
// the agent will explain "unlock owner mode" if a visitor sends them.
const STARTERS: { label: string; prompt: string }[] = [
  { label: "🔎 Flagship projects", prompt: "What are Paul's flagship agentic-OS projects?" },
  { label: "🔥 Hottest repos", prompt: "Which of his repos are most active this month?" },
  { label: "✅ Verify a claim", prompt: "Is it true he ships agent-verification tooling? Show the evidence." },
  { label: "🧾 Verify a résumé", prompt: "Verify this résumé: <paste your résumé text here>" },
  { label: "🧭 Scout next moves", prompt: "Scout my next projects to deepen/widen and collaborators to reach." },
  { label: "➕ Add a section", prompt: "Add a section highlighting my agentic tools (skills, plugins, workflows) from my sos repo." },
  { label: "⬆ Import LinkedIn", prompt: "How do I import all my LinkedIn posts?" },
  { label: "🎨 Switch theme", prompt: "Switch to the Notion theme." },
  { label: "💡 What can you do?", prompt: "What can you do?" },
];

function fillInput(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true })); // React tracks via this
  el.focus();
  // place the cursor where the user customizes (the <paste …> token, if any)
  const ph = value.indexOf("<");
  if (ph >= 0) el.setSelectionRange(ph, value.indexOf(">") >= 0 ? value.indexOf(">") + 1 : ph);
}

export type Starter = { label: string; prompt: string };

export function PromptStarters({ items = STARTERS }: { items?: Starter[] }) {
  const [target, setTarget] = useState<HTMLTextAreaElement | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const onceRef = useRef(false);

  useEffect(() => {
    const find = () => document.querySelector(INPUT_SELECTOR) as HTMLTextAreaElement | null;
    setTarget(find());
    const obs = new MutationObserver(() => {
      setTarget((prev) => (prev && document.contains(prev) ? prev : find()));
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  if (!target || dismissed) return null;
  const parent = target.parentElement;
  if (!parent) return null;
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";

  return createPortal(
    <div
      style={{
        position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
        display: "flex", gap: "6px", overflowX: "auto", padding: "6px 8px",
        background: "var(--surface, #fff)", borderRadius: "10px",
        border: "1px solid var(--edge, #e5e7eb)", boxShadow: "0 6px 20px rgba(0,0,0,.08)",
        scrollbarWidth: "thin", zIndex: 5,
      }}
      onMouseEnter={() => (onceRef.current = true)}
    >
      <span style={{ alignSelf: "center", fontSize: "11px", color: "var(--muted, #6b7280)", whiteSpace: "nowrap" }}>✨ Try:</span>
      {items.map((s) => (
        <button
          key={s.label}
          onClick={() => fillInput(target, s.prompt)}
          title={s.prompt}
          style={{
            whiteSpace: "nowrap", fontSize: "12px", padding: "4px 10px", borderRadius: "9999px",
            border: "1px solid var(--edge, #e5e7eb)", background: "transparent",
            color: "var(--ink, #111)", cursor: "pointer",
          }}
        >
          {s.label}
        </button>
      ))}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Hide example prompts"
        style={{ marginLeft: "auto", alignSelf: "center", border: "none", background: "transparent", color: "var(--muted, #6b7280)", cursor: "pointer", fontSize: "14px" }}
      >
        ×
      </button>
    </div>,
    parent,
  );
}
