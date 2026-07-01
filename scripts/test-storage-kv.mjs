// End-to-end test of the DURABLE storage code path (lib/storage.ts) against a REAL
// Postgres store (Vercel Postgres / Neon). This is the verification the live "provision a
// store" step was blocked on: it proves that once a real DB is configured, owner edits +
// Network joins actually persist + survive a fresh read. The pure search/normalize/merge
// logic above storage.ts is covered by test-registry.mjs.
//
// Self-loads POSTGRES_URL / DATABASE_URL from .env.local when present. If neither is set
// (CI / a fresh clone with no store), it SKIPS cleanly (exit 0) — no DB, nothing to prove
// here, and the no-op fallback is exercised by the other tests.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local loader (Node doesn't auto-load it for a plain script).
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.log("⏭️  storage-kv: SKIP (no POSTGRES_URL / DATABASE_URL — durable store not configured)");
  process.exit(0);
}

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// Test-only keys with a unique prefix — NEVER the real registry:entries / portfolio:config,
// so running the test can't pollute production data. Cleaned up at the end.
const K_PROBE = "selftest:probe";
const K_JOIN = "selftest:registry";
const K_CFG = "selftest:config";

try {
  // storage.ts is alias-free → loadable in plain Node (type-stripped). It's the durable
  // primitive lib/registry.ts + lib/portfolio.ts sit on.
  const { kvConfigured, kvGetJSON, kvSetJSON } = await import("../lib/storage.ts");

  // 1. primitives round-trip durably against a REAL Postgres store.
  check("kvConfigured() true when a connection string is set", kvConfigured() === true);
  check("kvSetJSON persists", (await kvSetJSON(K_PROBE, { a: 1, b: "two" })) === true);
  const got = await kvGetJSON(K_PROBE);
  check("kvGetJSON reads back the same value (durable round-trip)", got && got.a === 1 && got.b === "two");
  check("kvGetJSON on a missing key → null", (await kvGetJSON("selftest:nope")) === null);

  // 2. the Network-join durability claim: a join written under a key survives a FRESH read
  //    (this is what "shared across instances" means — a second serverless instance reading
  //    the same key sees the join).
  const join = { handle: "kv-probe", name: "KV Probe Node", url: "https://kv-probe.example.com", skills: [], tags: ["kv"] };
  check("a join SET reports persisted", (await kvSetJSON(K_JOIN, [join])) === true);
  const reread = await kvGetJSON(K_JOIN);
  check("a fresh GET sees the join (survives, shared)", Array.isArray(reread) && reread.length === 1 && reread[0].url === join.url);

  // 3. an owner edit (portfolio config) round-trips under its own key — no collision.
  check("portfolio config SET persists", (await kvSetJSON(K_CFG, { theme: "vercel", sections: [] })) === true);
  const cfg = await kvGetJSON(K_CFG);
  check("config reads back independently of the join key", cfg && cfg.theme === "vercel" && (await kvGetJSON(K_JOIN)).length === 1);

  // 4. an upsert overwrites in place (ON CONFLICT) rather than erroring or duplicating.
  check("re-SET the same key overwrites (upsert)", (await kvSetJSON(K_PROBE, { a: 9, b: "nine" })) === true);
  const over = await kvGetJSON(K_PROBE);
  check("overwritten value is the new one", over && over.a === 9 && over.b === "nine");

  // cleanup — leave the store as we found it (best-effort; null values via a delete-equivalent).
  // We don't expose a delete in storage.ts, so overwrite the test keys with a tombstone marker;
  // they live under selftest:* and never collide with real data.
  await kvSetJSON(K_PROBE, { _tombstone: true });
  await kvSetJSON(K_JOIN, { _tombstone: true });
  await kvSetJSON(K_CFG, { _tombstone: true });
} catch (e) {
  console.log("❌ threw:", e.message);
  ok = false;
}

console.log(ok ? "✅ storage-kv: all pass" : "❌ storage-kv FAIL");
process.exit(ok ? 0 : 1);
