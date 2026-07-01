"use client";

// Content + custom-section copilot actions extracted from Portfolio.tsx (god-component
// split, part 3): editWording, editText, getRepoDigest, addSection, removeSection. These
// are gate-based (sync) with one fetch (getRepoDigest), so they move out cleanly behind a
// small context. lib/overrides is fs-free, so value-importing it here is safe.

import { useCopilotAction } from "@copilotkit/react-core";
import { applyOverrides, editableFields, OVERRIDE_KEY_RE, type EditableContent } from "@/lib/overrides";
import type { PortfolioConfig, SectionMeta, SectionItem } from "@/lib/portfolio";

type ContentCtx = {
  cfgRef: { current: PortfolioConfig };
  gate: (next: PortfolioConfig, proposal: string, success: string) => string;
  content: EditableContent;
};

export function useContentActions({ cfgRef, gate, content }: ContentCtx) {
  // The override-applied editable content as it stands RIGHT NOW (from cfgRef, so chained edits compose).
  const currentEditable = () =>
    applyOverrides(
      { profile: content.profile, mission: content.mission, love: content.love, values: content.values, futurePractices: content.futurePractices },
      cfgRef.current.overrides ?? {},
    );

  useCopilotAction({
    name: "editWording",
    description:
      "Change a snippet of WORDING anywhere in the editable text (owner only) — e.g. find " +
      "'Genentech' replace 'Accenture'. The page STRUCTURE/schema never changes; this is a " +
      "substring replace across the editable fields (name, tagline, blurb, location, mission, " +
      "love, each value, each 12X practice). Use this for most 'change X to Y' requests.",
    parameters: [
      { name: "find", type: "string", description: "The exact text to find", required: true },
      { name: "replace", type: "string", description: "Replacement (empty string deletes the snippet)", required: false },
    ],
    handler: async ({ find, replace }) => {
      const f = String(find || "");
      const r = String(replace ?? "");
      if (!f) return "Tell me the exact text to find.";
      const cur = cfgRef.current;
      const overrides = { ...cur.overrides };
      const where: string[] = [];
      for (const { path, value } of editableFields(currentEditable())) {
        if (value.includes(f)) { overrides[path] = value.split(f).join(r).slice(0, 2000); where.push(path); }
      }
      if (where.length === 0) return `I couldn't find “${f}” in the editable text (I can edit the name, tagline, blurb, location, mission, values, 12X practices, and love).`;
      return gate({ ...cur, overrides }, `replace “${f}” with “${r}”`, `Replaced “${f}” with “${r}” in: ${where.join(", ")}.`);
    },
  });

  useCopilotAction({
    name: "editText",
    description:
      "Replace the FULL text of one editable field (owner only) — schema stays fixed. `field` is one " +
      "of: profile.name, profile.tagline, profile.blurb, profile.location, mission, love, " +
      "values.<i>.title, values.<i>.body, practices.<i>.name, practices.<i>.body (i = 0-based index). " +
      "For a small phrase change, prefer editWording.",
    parameters: [
      { name: "field", type: "string", description: "The field path", required: true },
      { name: "value", type: "string", description: "The new full text for that field", required: true },
    ],
    handler: async ({ field, value }) => {
      const fld = String(field || "").trim();
      if (!OVERRIDE_KEY_RE.test(fld))
        return `“${fld}” isn't an editable field. Editable: profile.{name,tagline,blurb,location}, mission, love, values.<i>.{title,body}, practices.<i>.{name,body}.`;
      const cur = cfgRef.current;
      return gate({ ...cur, overrides: { ...cur.overrides, [fld]: String(value ?? "").slice(0, 2000) } }, `update ${fld}`, `Updated ${fld}.`);
    },
  });

  // Ground a new section in a REAL repo before composing it — never invent content.
  useCopilotAction({
    name: "getRepoDigest",
    description:
      "Fetch real content (README, file/dir tree, language, topics) from a PUBLIC GitHub repo. " +
      "Call this BEFORE addSection whenever the user references a repo (e.g. 'tools from my sos repo') " +
      "so the section is composed from what's ACTUALLY there, not invented. Pass 'owner/name', a full " +
      "github URL, or just the repo name (defaults to the portfolio owner's account).",
    parameters: [{ name: "repo", type: "string", description: "owner/name, a github URL, or a repo name", required: true }],
    handler: async ({ repo }) => {
      try {
        const res = await fetch("/api/repo-digest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: String(repo || "") }) });
        const data = await res.json();
        if (!res.ok) return `Couldn't read that repo: ${data.error || res.status}`;
        return JSON.stringify(data).slice(0, 8000);
      } catch (e) {
        return `Couldn't reach the repo digest service: ${(e as Error).message}`;
      }
    },
  });

  useCopilotAction({
    name: "addSection",
    description:
      "Create a NEW custom section on the page (owner only) — for content that doesn't fit the " +
      "built-in sections, e.g. 'a section highlighting my agentic tools (skills, plugins, workflows)'. " +
      "If the user references a repo, FIRST call getRepoDigest and compose items ONLY from what it " +
      "returns — never invent tool names, metrics, or links. `items` is a JSON array of " +
      "{title, body, tag?, url?} (tag = a short label like 'skill'/'plugin'/'workflow'). Re-calling " +
      "with the same title updates that section.",
    parameters: [
      { name: "title", type: "string", description: "Section heading", required: true },
      { name: "eyebrow", type: "string", description: "Optional small label above the heading", required: false },
      { name: "items", type: "string", description: "JSON array of {title, body, tag?, url?}", required: true },
      { name: "position", type: "number", description: "0-based insert index (optional; default: just before Values)", required: false },
    ],
    handler: async ({ title, eyebrow, items, position }) => {
      const heading = String(title || "").trim();
      if (!heading) return "Give the section a title.";
      let parsed: unknown;
      try { parsed = JSON.parse(String(items || "[]")); } catch { return "The `items` must be a JSON array of {title, body, tag?, url?}."; }
      const list: SectionItem[] = (Array.isArray(parsed) ? parsed : [])
        .map((x) => {
          const o = (x || {}) as Record<string, unknown>;
          const t = String(o.title ?? "").trim().slice(0, 140);
          const b = String(o.body ?? "").trim().slice(0, 600);
          if (!t && !b) return null;
          const url = String(o.url ?? "").trim();
          const tag = String(o.tag ?? "").trim().slice(0, 24);
          return { title: t || "(untitled)", body: b, ...(tag ? { tag } : {}), ...(/^https?:\/\//i.test(url) ? { url } : {}) } as SectionItem;
        })
        .filter((x): x is SectionItem => x !== null)
        .slice(0, 24);
      if (list.length === 0) return "I need at least one item (each with a title and/or body) to build the section.";

      const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "section";
      const id = `custom-${slug}`;
      const cur = cfgRef.current;
      const exists = cur.sections.some((s) => s.id === id);
      const newSection: SectionMeta = { id, title: heading, visible: true, custom: true, items: list, ...(eyebrow ? { eyebrow: String(eyebrow).trim() } : {}) };
      let sections: SectionMeta[];
      if (exists) {
        sections = cur.sections.map((s) => (s.id === id ? newSection : s));
      } else {
        sections = cur.sections.slice();
        const pos = typeof position === "number" && position >= 0 ? Math.min(position, sections.length) : Math.max(0, sections.findIndex((s) => s.id === "values"));
        sections.splice(pos < 0 ? sections.length : pos, 0, newSection);
      }
      return gate({ ...cur, sections }, `${exists ? "update" : "add"} a custom section “${heading}” with ${list.length} item(s)`, `${exists ? "Updated" : "Added"} the “${heading}” section with ${list.length} item(s).`);
    },
  });

  useCopilotAction({
    name: "removeSection",
    description:
      "Remove a CUSTOM (agent-created) section by its title (owner only). Built-in sections " +
      "(practices, projects, writing, receipts, compass, values) can't be removed — hide them instead.",
    parameters: [{ name: "title", type: "string", description: "The custom section's heading", required: true }],
    handler: async ({ title }) => {
      const q = String(title || "").toLowerCase().trim();
      const cur = cfgRef.current;
      const match = cur.sections.find((s) => s.custom && (s.title.toLowerCase() === q || s.title.toLowerCase().includes(q)));
      if (!match) {
        const hitsBuiltin = cur.sections.some((s) => !s.custom && (s.id === q || s.title.toLowerCase() === q || s.title.toLowerCase().includes(q)));
        if (hitsBuiltin) return "That's a built-in section — I can hide it (setSectionVisibility) but not remove it.";
        return `No custom section matching “${title}”.`;
      }
      return gate({ ...cur, sections: cur.sections.filter((s) => s.id !== match.id) }, `remove the “${match.title}” section`, `Removed the “${match.title}” section.`);
    },
  });
}
