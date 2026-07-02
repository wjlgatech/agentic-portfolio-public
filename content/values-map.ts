// ─────────────────────────────────────────────────────────────────────────────
// values-map.ts — the 1 → 2 → 6 structure behind the "Values & Love" mindmap. PURE data.
// Root ("Values & Love") → 2 clusters (How I work / Who it's for) → 6 leaves (5 values + Love).
// Each leaf expands a parallel-to-TRUE detail: how it's LIVED, how it shows up IN THE WORK,
// and how an AGENT should embody it. Value titles MUST match content/profile.ts `values`
// (the bodies come from there, override-editable); "Love" maps to profile.ts `love`.
// ─────────────────────────────────────────────────────────────────────────────

export type ValueDetail = { lived: string; inWork: string; forAgent: string };
export type ValueCluster = { id: string; glyph: string; label: string; gist: string; titles: string[] };

export const LOVE_TITLE = "Love";

export const VALUE_CLUSTERS: ValueCluster[] = [
  { id: "work", glyph: "◆", label: "How I work", gist: "the craft", titles: ["Build in the open", "Loops over launches", "Verify, don't vibe"] },
  { id: "why", glyph: "❤", label: "Who it's for", gist: "the why under the work", titles: ["Ownership & zero-trust", "Multiply others", "Love"] },
];

export const VALUE_DETAILS: Record<string, ValueDetail> = {
  "Build in the open": {
    lived: "Default to public repos + write-ups — ship the engine, not just the demo.",
    inWork: "This portfolio, the toolchain, the OS fleet — all shipped where others can extend them.",
    forAgent: "Agents publish skills/cards others can discover + call (A2A, registries).",
  },
  "Loops over launches": {
    lived: "Treat every output as a cycle: generate → judge → refactor → re-judge.",
    inWork: "Resume Verification re-verifies, the scout re-runs, the agent edits its own work.",
    forAgent: "A dynamic workflow that revises until a gate passes — never a one-shot.",
  },
  "Verify, don't vibe": {
    lived: "Earn every claim with a check — an honest ❌ beats a confident ✅.",
    inWork: "The Resume Verification section audits each claim against real GitHub evidence.",
    forAgent: "An adversarial skill/hook that probes an output before it's accepted.",
  },
  "Ownership & zero-trust": {
    lived: "Keep the most personal data local; power should be private by default.",
    inWork: "LinkedIn import runs in YOUR browser; the owner token gates every edit.",
    forAgent: "An in-session tool (extension/hook), not a credential-borrowing server.",
  },
  "Multiply others": {
    lived: "Raise students, founders, and my two sons into capable builders.",
    inWork: "The 12X Academy vertical encodes teaching as a build-loop curriculum.",
    forAgent: "A learning workflow that explains, quizzes, and adapts to the learner.",
  },
  [LOVE_TITLE]: {
    lived: "Family and faith first — Daniel and David, Kingdom over kingdom.",
    inWork: "The base case that keeps the compounding worth it; the why under every loop.",
    forAgent: "A guardrail: surface the 'for-whom' before a high-stakes autonomous action.",
  },
};

// All leaf titles, flattened — used by the test to guarantee the 2 clusters cover every
// value (+ Love) once, and that each has a complete detail.
export const ALL_VALUE_TITLES = VALUE_CLUSTERS.flatMap((c) => c.titles);
