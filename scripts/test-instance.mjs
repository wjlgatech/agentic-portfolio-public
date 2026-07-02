// Unit tests for instance-types.ts — the site-config contract.
// Proves: (1) a config snaps onto the contract, (2) any config → a spec-shaped A2A card,
// (3) bad configs are rejected, (4) content packs stay honest + private-safe.
import { validateInstance, instanceToAgentCard, instanceEvidence, instanceStaticAnswer, VALID_THEMES, VERTICALS } from "../packages/core/src/instance-types.ts";
import { portfolioInstance } from "../content/instances/portfolio.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// A synthetic config (generic — no real business) to exercise the contract independently of the portfolio.
const example = validateInstance({
  slug: "example-studio", vertical: "agency", theme: "vercel",
  entity: { name: "Example Studio", tagline: "A demo config", blurb: "Illustrative only.", links: {} },
  story: { mission: "Show that one codebase renders from data.", principles: [{ title: "Data, not code", body: "A config is just data." }] },
  agent: { grounding: "Answer only from this config; never invent.", skills: [
    { id: "ask_service", name: "About the service", description: "What we offer.", examples: ["What do you do?"] },
    { id: "assess_fit", name: "Am I a fit?", description: "Honestly assess fit.", examples: ["Is this for me?"] },
    { id: "contact", name: "Contact", description: "How to reach us.", examples: ["How do I reach you?"] },
  ] },
  sections: [{ id: "practices", title: "About" }, { id: "projects", title: "Services" }],
  content: {
    offerings: [{ name: "Consulting", category: "Service", summary: "Advisory." }, { name: "Build", category: "Service", summary: "Delivery." }, { name: "Support", category: "Service", summary: "Care." }],
    outcomes: [{ claim: "Helped a client 10x output", verdict: "unverified" }],
    writings: [],
  },
}).config;

// 1. Configs validate (the live portfolio AND the synthetic example both fit the contract).
for (const [name, pack] of [["portfolio (instance #0)", portfolioInstance], ["example config", example]]) {
  const r = validateInstance(pack);
  check(`${name} snaps onto the contract`, r.ok && r.config !== null);
  if (!r.ok) console.log("   mis-fits:", r.errors.join("; "));
}

// 2. The federation stud: any valid config → a spec-shaped A2A Agent Card, no per-config code.
const card = instanceToAgentCard(example, "https://studio.example.com");
check("config → A2A card has name + a2a url", typeof card.name === "string" && card.url === "https://studio.example.com/api/a2a");
check("config → A2A card carries the skills", Array.isArray(card.skills) && card.skills.length === 3 && card.skills[0].id === "ask_service");
check("config → A2A card is sync (streaming:false), public (no auth)", card.capabilities.streaming === false && Array.isArray(card.authentication.schemes) && card.authentication.schemes.length === 0);
check("config → A2A card tags the vertical", card["x-vertical"] === "agency");

// 3. The fit-check rejects mis-fits with precise errors.
const bad = validateInstance({ slug: "Bad Slug", vertical: "spaceship", theme: "neon", entity: {}, story: {}, agent: { skills: [] }, sections: [] });
check("rejects invalid config", bad.ok === false && bad.config === null);
check("flags non-kebab slug", bad.errors.some((e) => e.includes("kebab")));
check("flags unknown vertical", bad.errors.some((e) => e.includes("vertical")));
check("flags unknown theme", bad.errors.some((e) => e.includes("theme")));
check("flags missing entity.name", bad.errors.some((e) => e.includes("entity.name")));
check("flags zero skills (the federation stud is required)", bad.errors.some((e) => e.includes("skills")));
check("flags zero sections", bad.errors.some((e) => e.includes("section")));

// 4. Enum guards stay in sync with the token seam + vertical list.
check("VALID_THEMES includes the seam brands", VALID_THEMES.includes("anthropic") && VALID_THEMES.includes("notion") && VALID_THEMES.length === 9);
check("VERTICALS seeds the chosen-five + personal", ["personal", "education", "agency", "trading", "consulting", "rnd"].every((v) => VERTICALS.includes(v)));

// 5. Defaults fill in: a config that omits owner/storage still gets the owner gate + a KV prefix.
const minimal = validateInstance({
  slug: "food-truck", vertical: "hospitality", theme: "stripe",
  entity: { name: "Rolling Wok", tagline: "Wok-fired, GPS-tracked" },
  story: { mission: "Best lunch on the block, every block." },
  agent: { grounding: "Answer from today's real menu + location only.", skills: [{ id: "todays_menu", name: "Today's menu", description: "What's cooking and where the truck is now." }] },
  sections: [{ id: "custom-menu", title: "Menu" }],
});
check("a minimal config also snaps on", minimal.ok);
check("owner gate defaults to PORTFOLIO_OWNER_TOKEN", minimal.config.owner.gateEnv === "PORTFOLIO_OWNER_TOKEN");
check("KV prefix defaults to the slug (no cross-config collisions)", minimal.config.storage.kvPrefix === "food-truck");

// 6. The portfolio's own card is preserved.
const pfCard = instanceToAgentCard(portfolioInstance, "https://paul.example.com");
check("portfolio → recruiter skills + examples preserved", pfCard.skills.length === 3 && pfCard.skills[0].id === "ask_candidate" && Array.isArray(pfCard.skills[0].examples) && pfCard.skills[0].examples.length === 3);

// 7. The content pack: /api/a2a answers from the config's OWN corpus, honestly + privacy-safe.
check("example declares a content pack", Boolean(example.content) && example.content.offerings.length >= 3 && example.content.outcomes.length >= 1);
check("outcomes carry an HONEST verdict (never fabricated)", example.content.outcomes.every((o) => o.verdict === "unverified"));
const ev = instanceEvidence(example);
check("instanceEvidence grounds in the config (not the portfolio)", ev.includes("Example Studio") && !ev.includes("agentic-portfolio"));
check("instanceEvidence is budget-bounded (free-tier TPM safe)", instanceEvidence(example, 500).length <= 500);
const priv = validateInstance({ ...example, content: { offerings: [{ name: "Internal Playbook", category: "x", summary: "secret", url: "https://example.com/secret", private: true }], outcomes: [], writings: [] } }).config;
check("a private offering is highlight-only (url nulled in the evidence)", JSON.parse(instanceEvidence(priv)).offerings[0].url === null);
check("instanceStaticAnswer (no-LLM fallback) is grounded in the config's offerings", instanceStaticAnswer(example).includes("Example Studio"));

console.log(ok ? "✅ instance: all pass" : "❌ instance FAIL");
process.exit(ok ? 0 : 1);
