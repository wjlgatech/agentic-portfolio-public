// Unit tests for the TRUE standing engine — pure, deterministic (measured, not vibes).
import { scoreStanding, vouchWeight, TRUE_KEYS } from "../packages/core/src/society-types.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const active = { handle: "a", hasAgentCard: true, skillCount: 3, hasContent: true, isLive: true, contributions: 3, vouches: [{ from: "x", weight: 0.9 }, { from: "y", weight: 0.8 }], lastActiveDaysAgo: 5 };
const sA = scoreStanding(active);
check("a strong, recent member scores high", sA.overall >= 85);
check("...and reaches the top tier", sA.tier === "fellow");
check("leverage tops out near 10x for high standing", sA.leverage > 8 && sA.leverage <= 10);
check("all four tenets are scored 0..100", TRUE_KEYS.every((k) => sA.byTenet[k] >= 0 && sA.byTenet[k] <= 100));

// Passivity DECAYS standing (the vote-out gravity).
const passive = scoreStanding({ ...active, lastActiveDaysAgo: 150 });
check("passivity decays the score", passive.overall < sA.overall && passive.decay < 1);
check("passivity surfaces a 'decaying' gap", passive.gaps.some((g) => /decay/i.test(g)));

// Vouches are reputation-weighted + capped (no vouch-ring inflation).
const noVouch = scoreStanding({ ...active, vouches: [] });
const bigVouch = scoreStanding({ ...active, vouches: Array.from({ length: 20 }, (_, i) => ({ from: `v${i}`, weight: 1 })) });
check("vouches lift standing", scoreStanding({ ...active, vouches: [{ from: "z", weight: 1 }] }).vouchBoost > noVouch.vouchBoost);
check("vouch boost is capped at +20 (earned by artifacts, not rings)", bigVouch.vouchBoost <= 20);
check("vouchWeight = standing/100", vouchWeight(80) === 0.8 && vouchWeight(120) === 1);

// An empty applicant is honestly low, with concrete gaps to rise.
const empty = scoreStanding({ handle: "e", hasAgentCard: false, skillCount: 0, hasContent: false, isLive: false, contributions: 0, vouches: [], lastActiveDaysAgo: 0 });
check("an empty profile is an applicant, not a member", empty.tier === "applicant" && empty.overall < 40);
check("gaps tell them exactly what to build", empty.gaps.length >= 4);
check("an applicant leverage is low + well below a fellow", empty.leverage >= 1 && empty.leverage < sA.leverage);

console.log(ok ? "✅ society: all pass" : "❌ society FAIL");
process.exit(ok ? 0 : 1);
