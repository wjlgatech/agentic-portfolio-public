// Unit tests for the feedback→feature loop's pure core (@core/feedback-types):
// normalization, dedupe, windowing, digest grounding (counts recomputed in code,
// ungrounded clusters dropped), and ship-notice contributor resolution.
import {
  normalizeFeedbackItem,
  upsertFeedback,
  itemsInWindow,
  buildCommandFor,
  normalizeDigest,
  contributorsFor,
  MAX_CLUSTERS,
} from "../packages/core/src/feedback-types.ts";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };

const NOW_ISO = "2026-07-01T00:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

// ── normalize ────────────────────────────────────────────────────────────────
const item = normalizeFeedbackItem({ kind: "suggestion", text: "Please add a PDF export of my portfolio", contact: "jo@x.io", page: "/p/jane", slug: "Jane!" }, NOW_ISO);
check("valid item normalizes", item && item.kind === "suggestion" && item.contact === "jo@x.io" && item.at === NOW_ISO);
check("slug is sanitized", item.slug === "jane");
check("thin text is rejected", normalizeFeedbackItem({ text: "meh" }, NOW_ISO) === null);
check("complaint-ish kinds coerce", normalizeFeedbackItem({ kind: "complain", text: "the theme switcher is broken" }, NOW_ISO).kind === "complaint");
check("unknown kind defaults to suggestion", normalizeFeedbackItem({ kind: "???", text: "add dark mode please" }, NOW_ISO).kind === "suggestion");
check("bad contact is dropped, item kept", normalizeFeedbackItem({ text: "add dark mode please", contact: "not-an-email" }, NOW_ISO).contact === undefined);

// ── dedupe ───────────────────────────────────────────────────────────────────
const dup = normalizeFeedbackItem({ kind: "suggestion", text: "Please add a PDF export of my portfolio" }, NOW_ISO);
check("same words → same id (dedupe key)", dup.id === item.id);
const other = normalizeFeedbackItem({ kind: "complaint", text: "Please add a PDF export of my portfolio" }, NOW_ISO);
check("kind participates in the id", other.id !== item.id);
const list = upsertFeedback(upsertFeedback([], dup), item);
check("upsert dedupes by id and keeps the fresh one (contact wins)", list.length === 1 && list[0].contact === "jo@x.io");

// ── windowing ────────────────────────────────────────────────────────────────
const old = { ...other, id: "old1", at: new Date(NOW_MS - 30 * 86_400_000).toISOString() };
check("itemsInWindow drops out-of-window + unparsable", itemsInWindow([item, old, { ...old, id: "bad", at: "garbage" }], NOW_MS, 7).length === 1);

// ── build command ────────────────────────────────────────────────────────────
const cmd = buildCommandFor("Add a\n  PDF   export " + "x".repeat(400));
check("buildCommandFor one-lines, caps, and quotes", cmd.startsWith('anyagent goal "Add a PDF export') && cmd.endsWith(" --repo .") && cmd.length < 340);

// ── digest grounding ─────────────────────────────────────────────────────────
const a = normalizeFeedbackItem({ kind: "suggestion", text: "PDF export would be great", contact: "a@x.io" }, NOW_ISO);
const b = normalizeFeedbackItem({ kind: "complaint", text: "export to PDF is missing and it hurts" }, NOW_ISO);
const c = normalizeFeedbackItem({ kind: "suggestion", text: "let me change fonts", contact: "A@X.IO" }, NOW_ISO);
const batch = [a, b, c];
const digest = normalizeDigest(
  {
    clusters: [
      { theme: "PDF export", itemIds: [a.id, b.id, b.id, "invented-id"], proposal: "Add PDF export.", count: 999, suggestions: 999 },
      { theme: "Fonts", itemIds: [c.id] },
      { theme: "Ghost cluster", itemIds: ["nope"] },
    ],
    note: "ok",
  },
  batch, NOW_ISO, 7, "groq:llama",
);
check("ungrounded ids + ghost clusters dropped", digest.clusters.length === 2 && digest.clusters.every((cl) => cl.itemIds.every((id) => batch.some((f) => f.id === id))));
const pdf = digest.clusters[0];
check("counts recomputed in code (model's 999 ignored)", pdf.count === 2 && pdf.suggestions === 1 && pdf.complaints === 1 && pdf.kind === "mixed");
check("sorted by count desc", digest.clusters[0].count >= digest.clusters[1].count);
check("examples are the contributors' real words", pdf.examples.includes("PDF export would be great"));
check("proposal falls back to theme when missing", digest.clusters[1].proposal === "Fonts");
check("every cluster carries a build command", digest.clusters.every((cl) => cl.buildCmd.startsWith("anyagent goal ")));
check("total + provenance computed", digest.total === 3 && digest.model === "groq:llama" && digest.note === "ok");

const many = normalizeDigest(
  { clusters: batch.flatMap((f, i) => Array.from({ length: 5 }, (_, j) => ({ theme: `t${i}-${j}`, itemIds: [f.id] }))) },
  batch, NOW_ISO, 7,
);
check(`clusters capped at ${MAX_CLUSTERS}`, many.clusters.length <= MAX_CLUSTERS);

// ── contributors ─────────────────────────────────────────────────────────────
const who = contributorsFor(digest, batch, ["pdf EXPORT", "fonts"]);
check("contributors deduped by email across themes (case-insensitive match)", who.length === 1 && who[0].themes.length === 2);
check("no-contact items never notify", contributorsFor(digest, [b], ["PDF export"]).length === 0);
check("unshipped themes notify nobody", contributorsFor(digest, batch, ["something else"]).length === 0);

console.log(ok ? "✅ feedback: all pass" : "❌ feedback: FAIL");
process.exit(ok ? 0 : 1);
