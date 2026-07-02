// ─────────────────────────────────────────────────────────────────────────────
// content/society.ts — the TRUE Society covenant, as DATA (a "creed as code", like the rubrics).
// Membership is earned + maintained by measurable contribution to each TRUE dimension — for the
// human AND for their agent (skill / plugin / dynamic workflow / hook). Passivity decays standing;
// complaints become 10X proposals; governance is graceful. Rendered by app/society/page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export type Tenet = {
  key: "T" | "R" | "U" | "E";
  title: string;
  gist: string;
  human: string; // what a member commits to
  agent: string; // what their agent commits to (skill/plugin/workflow/hook)
  proof: string; // the observable artifact that proves it (so standing is measured, not claimed)
};

// TRUE — the smart contract. Each tenet is measurable from real artifacts (your portfolio, your
// contributions, your agent), so belonging is proven, not asserted.
export const TRUE_TENETS: Tenet[] = [
  {
    key: "T",
    title: "Transferable & Transformative",
    gist: "What you build, others can pick up — and it changes how they work, not just adds to it.",
    human: "Ship work others adopt; document it so it transfers hand-to-hand. Aim for transformation, not decoration.",
    agent: "Package a capability as a portable skill/plugin another member's agent can install and run.",
    proof: "an adopted artifact (a skill/theme/instance others use) + a transfer doc.",
  },
  {
    key: "R",
    title: "Reusable & Refinable",
    gist: "You build for reuse, and nothing you ship is frozen — you keep refining, and let others refine it.",
    human: "Version your work; iterate in the open; accept and integrate refinement from peers.",
    agent: "Expose a refinable workflow/hook that improves from feedback — a closed loop, not a one-shot.",
    proof: "a versioned, reused artifact with a visible refinement history.",
  },
  {
    key: "U",
    title: "Understandable & U-loop (Theory U)",
    gist: "You make your work understandable (you teach it), and you lead from the emerging future — sense, presence, act.",
    human: "Teach what you build. On real problems run the U-loop: observe deeply → retreat & reflect → prototype fast.",
    agent: "Your agent explains its reasoning and runs an observe → sense → act loop, not a black box.",
    proof: "a teach-back (post/thread/talk) + a U-loop applied to a real problem.",
  },
  {
    key: "E",
    title: "Experienceable & Experimentable",
    gist: "You ship things people can experience and experiment with — not just read about.",
    human: "Give people a live thing to try; invite experiments; publish what you learned.",
    agent: "Your agent is callable + experimentable (an A2A endpoint others can query and test).",
    proof: "a live, queryable artifact + a published experiment result.",
  },
];

// ── TRUE Merit — the honorable, NON-transferable reputation credit (not a coin you can buy or
// trade). It IS your standing/leverage from the standing engine: earned from real, PEER-ATTESTED
// contribution, reputation-weighted, capped, and decaying with inactivity — so it can't be gamed,
// bought, or speculated. The more you contribute, the more the network's gravity works for you.
export const EARN: { act: string; credit: string }[] = [
  { act: "Ship your live agentic portfolio", credit: "Your baseline — you're a real, queryable node." },
  { act: "Refer someone who ships their own", credit: "Credit when they go live — never for just inviting." },
  { act: "Contribute to another member's portfolio", credit: "Credit + a vouch — when they accept it." },
  { act: "Give feedback that gets acted on", credit: "Attested by the person you actually helped." },
  { act: "Collaborate on someone's project", credit: "Credit + a vouch when they name you." },
  { act: "Teach what you build (a reusable teach-back)", credit: "Raises your Understandable (U) score." },
];

// What your standing unlocks. Starts free (recognition + matchmaking — what people actually want),
// and scales to sponsor-backed material rewards as the network grows.
export const BENEFITS: { tier: string; standing: string; perks: string[] }[] = [
  { tier: "Member", standing: "standing ≥ 40", perks: ["Verified-contributor badge", "Listed in the network directory", "Your agent is discoverable + queryable by others"] },
  { tier: "Steward", standing: "standing ≥ 65", perks: ["Featured on the network leaderboard", "Priority in “ask the network”", "Matchmaking — the network routes relevant intros & opportunities to you"] },
  { tier: "Fellow / TRUE Hero", standing: "standing ≥ 85", perks: ["Quarterly spotlight, amplified across the network", "A curated intro to a real opportunity", "Invite-only events + a governance seat"] },
];

// Scale-gated: unlocked as the network grows and sponsors join. Listed honestly as "coming",
// never promised before we can deliver — you earn the STANDING now; the material perks follow.
export const SPONSOR_PERKS: string[] = [
  "Free compute credits", "AI-conference tickets", "Job & startup-founder referrals", "Mentorship from senior builders",
];

// The TRUE Hero Award — quarterly, one per TRUE perspective. Winners are computed from the standing
// ledger (honest, not a popularity contest), get a permanent portfolio badge + a network spotlight.
export const AWARDS: { emoji: string; title: string; forWhat: string }[] = [
  { emoji: "🏆", title: "Most Transferable", forWhat: "the capability the most other members adopted." },
  { emoji: "🔁", title: "Best Reuse", forWhat: "the most reused + refined artifact." },
  { emoji: "🎓", title: "Best Teacher (U-loop)", forWhat: "the clearest teach-back on a real problem." },
  { emoji: "🤝", title: "Top Collaborator", forWhat: "showed up on the most other members' projects." },
  { emoji: "🌱", title: "Community Multiplier", forWhat: "lifted the most other members 10X." },
];

// The culture — the difference between an elite society and a club you can be passive in.
export const CREED: { title: string; body: string }[] = [
  { title: "Contribute or step aside", body: "This is a society of builders. Passivity quietly decays your standing; generativity raises it. Standing is earned — and re-earned." },
  { title: "Turn every complaint into a 10X", body: "You don't just complain here. Name the friction, then own the overcome — every complaint becomes a logged 10X proposal with your name on it." },
  { title: "Skin in the game", body: "Your standing is computed from your real artifacts (portfolio, contributions, your agent) and your peers' vouches — proven, not claimed. Verify, don't vibe." },
  { title: "Grace in governance", body: "Before anyone is voted out, they get a regeneration invitation — a U-loop back in. We remove without shaming, and leave the door open to return as a builder." },
  { title: "Multiply others", body: "Your rise depends on lifting others. The fastest way up is to make three other members 10X. A rising society lifts every node." },
];
