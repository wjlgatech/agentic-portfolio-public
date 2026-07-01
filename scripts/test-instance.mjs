// Unit tests for lib/instance-types.ts — the Agentize Lego contract.
// Proves: (1) the real packs snap onto the core, (2) any instance → a spec-shaped A2A
// card with zero vertical code, (3) bad packs are rejected with precise mis-fits.
import { validateInstance, instanceToAgentCard, instanceEvidence, instanceStaticAnswer, VALID_THEMES, VERTICALS } from "../packages/core/src/instance-types.ts";
import { portfolioInstance } from "../content/instances/portfolio.ts";
import { learningCenter } from "../content/instances/learning-center.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// 1. The real packs validate (the live portfolio AND the new vertical both fit the contract).
for (const [name, pack] of [["portfolio (instance #0)", portfolioInstance], ["learning-center", learningCenter]]) {
  const r = validateInstance(pack);
  check(`${name} snaps onto the contract`, r.ok && r.config !== null);
  if (!r.ok) console.log("   mis-fits:", r.errors.join("; "));
}

// 2. The federation stud: any valid instance → a spec-shaped A2A Agent Card, no vertical code.
const card = instanceToAgentCard(learningCenter, "https://academy.example.com");
check("instance → A2A card has name + a2a url", typeof card.name === "string" && card.url === "https://academy.example.com/api/a2a");
check("instance → A2A card carries the pack's skills", Array.isArray(card.skills) && card.skills.length === 3 && card.skills[0].id === "ask_program");
check("instance → A2A card is sync (streaming:false), public (no auth)", card.capabilities.streaming === false && Array.isArray(card.authentication.schemes) && card.authentication.schemes.length === 0);
check("instance → A2A card tags the vertical", card["x-vertical"] === "education");

// 3. The fit-check rejects mis-fits with precise errors (a bad brick must NOT snap on silently).
const bad = validateInstance({ slug: "Bad Slug", vertical: "spaceship", theme: "neon", entity: {}, story: {}, agent: { skills: [] }, sections: [] });
check("rejects invalid pack", bad.ok === false && bad.config === null);
check("flags non-kebab slug", bad.errors.some((e) => e.includes("kebab")));
check("flags unknown vertical", bad.errors.some((e) => e.includes("vertical")));
check("flags unknown theme", bad.errors.some((e) => e.includes("theme")));
check("flags missing entity.name", bad.errors.some((e) => e.includes("entity.name")));
check("flags zero skills (the federation stud is required)", bad.errors.some((e) => e.includes("skills")));
check("flags zero sections", bad.errors.some((e) => e.includes("section")));

// 4. Enum guards stay in sync with the token seam + vertical list.
check("VALID_THEMES includes the seam brands", VALID_THEMES.includes("anthropic") && VALID_THEMES.includes("notion") && VALID_THEMES.length === 9);
check("VERTICALS seeds the chosen-five + personal", ["personal", "education", "agency", "trading", "consulting", "rnd"].every((v) => VERTICALS.includes(v)));

// 5. Defaults fill in: an instance that omits owner/storage still gets the owner gate + a KV prefix.
const minimal = validateInstance({
  slug: "food-truck", vertical: "hospitality", theme: "stripe",
  entity: { name: "Rolling Wok", tagline: "Wok-fired, GPS-tracked" },
  story: { mission: "Best lunch on the block, every block." },
  agent: { grounding: "Answer from today's real menu + location only.", skills: [{ id: "todays_menu", name: "Today's menu", description: "What's cooking and where the truck is now." }] },
  sections: [{ id: "custom-menu", title: "Menu" }],
});
check("a 3rd vertical (food truck) also snaps on", minimal.ok);
check("owner gate defaults to PORTFOLIO_OWNER_TOKEN", minimal.config.owner.gateEnv === "PORTFOLIO_OWNER_TOKEN");
check("KV prefix defaults to the slug (no cross-instance collisions)", minimal.config.storage.kvPrefix === "food-truck");

// 6. The card the agent-card route serves per active instance (the selector logic itself —
//    getActiveInstance reading INSTANCE — is verified live against the running route, since
//    content/instances/index.ts uses @/ value-imports that plain Node can't resolve).
const lcCard = instanceToAgentCard(learningCenter, "https://academy.example.com");
check("learning-center → its own A2A card (ask_program advertised, not ask_candidate)", lcCard.skills.some((s) => s.id === "ask_program") && !lcCard.skills.some((s) => s.id === "ask_candidate"));
check("learning-center card tags the education vertical", lcCard["x-vertical"] === "education");
const pfCard = instanceToAgentCard(portfolioInstance, "https://paul.example.com");
check("portfolio → the recruiter skills + examples preserved (live card unchanged in substance)", pfCard.skills.length === 3 && pfCard.skills[0].id === "ask_candidate" && Array.isArray(pfCard.skills[0].examples) && pfCard.skills[0].examples.length === 3);

// 7. The per-instance CONTENT pack: /api/a2a answers from the instance's OWN corpus.
const lc = validateInstance(learningCenter).config;
check("learning-center declares a content pack (offerings/outcomes/writings)", Boolean(lc.content) && lc.content.offerings.length >= 3 && lc.content.outcomes.length >= 1);
check("outcomes carry an HONEST verdict (illustrative pack stays 'unverified', never fabricated)", lc.content.outcomes.every((o) => o.verdict === "unverified"));

const ev = instanceEvidence(lc);
const evObj = JSON.parse(ev);
check("instanceEvidence grounds in the academy (its tracks, not Paul's repos)", ev.includes("Agentic Engineering") && !ev.includes("agentic-portfolio"));
check("instanceEvidence carries the entity + mission + outcomes-with-verdicts", evObj.entity.name === "12X Agentic Academy" && typeof evObj.mission === "string" && evObj.outcomes[0].verdict === "unverified");
check("instanceEvidence is budget-bounded (free-tier TPM safe)", instanceEvidence(lc, 500).length <= 500);

// a private offering shares no URL, even if one is set (no IP/link leakage).
const priv = validateInstance({ ...learningCenter, content: { offerings: [{ name: "Internal Playbook", category: "x", summary: "secret", url: "https://example.com/secret", private: true }], outcomes: [], writings: [] } }).config;
check("a private offering is highlight-only (url nulled in the evidence)", JSON.parse(instanceEvidence(priv)).offerings[0].url === null);

const stat = instanceStaticAnswer(lc);
check("instanceStaticAnswer (no-LLM fallback) is grounded in the academy's offerings", stat.includes("12X Agentic Academy") && stat.includes("Agentic Engineering"));

console.log(ok ? "✅ instance: all pass" : "❌ instance FAIL");
process.exit(ok ? 0 : 1);
