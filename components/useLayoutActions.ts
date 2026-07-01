"use client";

// Layout/theme copilot actions extracted from Portfolio.tsx (the god-component split,
// part 2). These are the simple, gate-based actions — no async/external calls — so they
// move out cleanly behind a small context. The import/verify/scout/section/content
// actions (which are coupled to async helpers) stay in Portfolio for now; the same
// pattern applies to them next.

import { useCopilotAction } from "@copilotkit/react-core";
// type-only import: erased at build, so this client module never pulls lib/portfolio's node:fs.
import type { PortfolioConfig, SectionMeta } from "@/lib/portfolio";

type LayoutCtx = {
  cfgRef: { current: PortfolioConfig };
  isOwnerRef: { current: boolean };
  setCfg: (c: PortfolioConfig) => void;
  gate: (next: PortfolioConfig, proposal: string, success: string) => string;
  lsKey: string; // localStorage key for the cached layout (resetLayout clears it)
  themeIds: readonly string[];
  knownSectionIds: readonly string[];
};

export function useLayoutActions({ cfgRef, isOwnerRef, setCfg, gate, lsKey, themeIds: THEME_IDS, knownSectionIds: KNOWN_SECTION_IDS }: LayoutCtx) {
  useCopilotAction({
    name: "reorderSections",
    description:
      "Set the top-to-bottom order of the page sections (owner only). Provide ALL " +
      "section ids in order. Valid ids: practices, projects, writing, receipts, compass, values.",
    parameters: [{ name: "order", type: "string[]", description: "Section ids in desired order", required: true }],
    handler: async ({ order }) => {
      const cur = cfgRef.current;
      const want = (Array.isArray(order) ? order : String(order).split(/[,\s]+/))
        .map((s) => String(s).trim())
        .filter((id) => KNOWN_SECTION_IDS.includes(id));
      const byId = new Map(cur.sections.map((s) => [s.id, s]));
      const seen = new Set<string>();
      const sections: SectionMeta[] = [];
      for (const id of want) {
        const s = byId.get(id);
        if (s && !seen.has(id)) { seen.add(id); sections.push(s); }
      }
      for (const s of cur.sections) if (!seen.has(s.id)) sections.push(s);
      return gate({ ...cur, sections }, `reorder sections to ${sections.map((s) => s.title).join(" → ")}`, `New order: ${sections.map((s) => s.title).join(" → ")}.`);
    },
  });

  useCopilotAction({
    name: "setSectionVisibility",
    description: "Show or hide a section (owner only). Ids: practices, projects, writing, receipts, compass, values.",
    parameters: [
      { name: "id", type: "string", description: "Section id", required: true },
      { name: "visible", type: "boolean", description: "true to show, false to hide", required: true },
    ],
    handler: async ({ id, visible }) => {
      const cur = cfgRef.current;
      if (!KNOWN_SECTION_IDS.includes(String(id))) return `Unknown section "${id}".`;
      const sections = cur.sections.map((s) => (s.id === id ? { ...s, visible: Boolean(visible) } : s));
      return gate({ ...cur, sections }, `${visible ? "show" : "hide"} the "${id}" section`, `${visible ? "Showing" : "Hiding"} the "${id}" section.`);
    },
  });

  useCopilotAction({
    name: "renameSection",
    description: "Change a section's heading and optional eyebrow label (owner only).",
    parameters: [
      { name: "id", type: "string", description: "Section id", required: true },
      { name: "title", type: "string", description: "New heading text", required: true },
      { name: "eyebrow", type: "string", description: "Optional small label above the heading", required: false },
    ],
    handler: async ({ id, title, eyebrow }) => {
      const cur = cfgRef.current;
      if (!KNOWN_SECTION_IDS.includes(String(id))) return `Unknown section "${id}".`;
      const sections = cur.sections.map((s) =>
        s.id === id ? { ...s, title: String(title).trim(), ...(eyebrow != null ? { eyebrow: String(eyebrow) } : {}) } : s,
      );
      return gate({ ...cur, sections }, `rename "${id}" to "${title}"`, `Renamed "${id}" to "${title}".`);
    },
  });

  useCopilotAction({
    name: "setTheme",
    description: "Switch the brand theme (owner only). One of: " + THEME_IDS.join(", ") + ".",
    parameters: [{ name: "theme", type: "string", description: "Theme id", required: true }],
    handler: async ({ theme }) => {
      const t = String(theme).toLowerCase().trim();
      if (!THEME_IDS.includes(t)) return `Unknown theme "${theme}". Choose one of: ${THEME_IDS.join(", ")}.`;
      return gate({ ...cfgRef.current, theme: t }, `switch to the ${t} theme`, `Switched to the ${t} theme.`);
    },
  });

  useCopilotAction({
    name: "resetLayout",
    description: "Discard local layout edits in this browser and reload the saved layout (owner only).",
    parameters: [],
    handler: async () => {
      if (!isOwnerRef.current) return "🔒 Only the owner can reset the layout.";
      try { localStorage.removeItem(lsKey); } catch { /* ignore */ }
      const fresh = (await fetch("/api/portfolio").then((r) => r.json())) as PortfolioConfig;
      setCfg(fresh);
      return "Reverted to the saved layout from portfolio.yaml.";
    },
  });
}
