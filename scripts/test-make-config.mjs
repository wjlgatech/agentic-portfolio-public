// Regression: the no-LLM /make fallback must produce a VALID instance (mission was left empty → null → 500).
import { validateInstance } from "../packages/core/src/instance-types.ts";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };

const base = (mission) => ({
  slug: "test-x", vertical: "personal",
  entity: { name: "Test User", tagline: "Test User's portfolio", blurb: "Résumé text.", location: "", links: {} },
  story: { mission, principles: [{ title: "In progress", body: "grounded in a résumé." }] },
  theme: "vercel",
  agent: { persona: "A friendly agent.", grounding: "Answer only from real material.", skills: [
    { id: "about_me", name: "About", description: "x", tags: ["q&a"], examples: ["Tell me."] },
  ] },
  sections: [{ id: "practices", title: "About" }],
  proof: { enabled: true, label: "Highlights", claimNoun: "highlight", sources: ["manual"] },
  scout: { enabled: false, deepen: "", widen: "", reach: "" },
  network: { discoverable: true, peers: [] },
  owner: { gateEnv: "PORTFOLIO_OWNER_TOKEN" },
  storage: { kvPrefix: "test-x" },
  content: { offerings: [], outcomes: [], writings: [] },
});

check("empty mission is REJECTED (documents the requirement)", validateInstance(base("")).ok === false);
const good = validateInstance(base("Test User's work, in one place — ask my agent."));
check("a defaulted (non-empty) mission with otherwise-minimal content is ACCEPTED", good.ok === true && good.config != null);
check("...and the accepted config has an entity (no null deref on the KV path)", good.config?.entity?.name === "Test User");

console.log(ok ? "✅ make-config: all pass" : "❌ make-config: FAIL");
process.exit(ok ? 0 : 1);
