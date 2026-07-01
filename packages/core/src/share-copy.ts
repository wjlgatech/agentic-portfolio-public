// ─────────────────────────────────────────────────────────────────────────────
// share-copy.ts — per-platform share copy, generated in code (pure, fs-free, no LLM → instant +
// free + never fails). Each platform has its own shape: X is punchy + char-capped (a URL counts
// as 23 via t.co), LinkedIn is value-led + long-form, YouTube/Instagram are description/caption
// style. The owner shares THEIR OWN portfolio (first person), one copy-paste per platform.
// The thumbnail is generated separately (next/og); this is just the words.
// ─────────────────────────────────────────────────────────────────────────────

export type ShareCopy = {
  x: string;         // ≤280 chars (URL billed at 23)
  linkedin: string;  // long-form, professional
  youtube: string;   // video/community description
  instagram: string; // caption (link-in-bio style)
  hashtags: string[];
};

const TW_URL = 23; // X counts any URL as 23 chars regardless of real length
const REPO = "https://github.com/wjlgatech/agentic-portfolio-public";

// Effective tweet length: the URL is billed at 23, not its real length.
export function tweetLength(text: string, url: string): number {
  return url && text.includes(url) ? text.length - url.length + TW_URL : text.length;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tidy = (s: string) => s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();

export function shareCopy(name: string, tagline: string, url: string): ShareCopy {
  const who = (name || "").trim();
  const tag = (tagline || "").trim().replace(/[.!]+$/, "");
  const hashtags = ["#AI", "#AgenticAI", "#Portfolio", "#OpenToWork"];
  const hx = "#AI #AgenticAI";

  // ── X / Twitter — punchy, capped. Include the tagline only if it fits. ──
  const base = "I built my agentic portfolio — an AI agent that answers for me, 24/7.";
  const cta = "Ask it anything 👇";
  const tagClause = tag ? ` ${cap(tag)}.` : "";
  const withTag = tidy(`${base}${tagClause} ${cta} ${url} ${hx}`);
  const noTag = tidy(`${base} ${cta} ${url} ${hx}`);
  const bare = tidy(`${base} ${url}`);
  const x = tweetLength(withTag, url) <= 280 ? withTag : tweetLength(noTag, url) <= 280 ? noTag : bare;

  // ── LinkedIn — value-led, long-form, a soft CTA. ──
  const linkedin = tidy(`I just launched my agentic portfolio — a living page with its own AI agent that answers questions about my work, 24/7.
${tag ? `\n${cap(tag)}.\n` : ""}
No more static PDF résumé: recruiters and collaborators can just ask it, and it answers grounded in my real material. Built free and open-source.

👉 ${url}

#AI #AgenticAI #Portfolio #OpenSource`);

  // ── YouTube — a video / community-post description. ──
  const youtube = tidy(`${who ? `${who} — ` : ""}Agentic Portfolio

An AI agent that answers questions about my work, grounded in my real material.${tag ? ` ${cap(tag)}.` : ""}

▶ Try it: ${url}
🛠 Built with agentic-portfolio (open-source, free): ${REPO}

#AI #AgenticAI #Portfolio`);

  // ── Instagram — short caption, link-in-bio convention. ──
  const instagram = tidy(`I built my agentic portfolio 🤖 an AI agent that answers for me, 24/7.${tag ? ` ${cap(tag)}.` : ""}

Link 👉 ${url}
.
.
#AI #AgenticAI #Portfolio #TechCareers #OpenToWork`);

  return { x, linkedin, youtube, instagram, hashtags };
}
