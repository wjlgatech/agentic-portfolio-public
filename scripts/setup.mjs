#!/usr/bin/env node
// scripts/setup.mjs — the local half of "1-click setup and run" (`npm run quickstart`).
//
//   npm run quickstart            install → this script → dev server on http://localhost:3000
//   node scripts/setup.mjs --yes  non-interactive: keys come from the environment, nothing is asked
//
// What it does, in order, and only what is safe to repeat:
//   1. creates .env.local from .env.example if it does not exist — it NEVER overwrites an existing one;
//   2. asks for ONE free model key (Gemini is the default: biggest free quota, no card) — Enter skips it,
//      and the site still runs fully; only the chat shows "configure a key";
//   3. mints a random PORTFOLIO_OWNER_TOKEN if none is set, and prints it once (it is your owner passphrase);
//   4. prints exactly what is on and what is off, so nothing is a surprise.
// Pure Node, no dependencies, so it runs before anything else is installed.
import fs from "node:fs";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const EXAMPLE = new URL(".env.example", ROOT);
const LOCAL = new URL(process.env.SETUP_ENV_FILE || ".env.local", ROOT);
const yes = process.argv.includes("--yes") || !process.stdin.isTTY;
const KEYS = ["GEMINI_API_KEY", "GROQ_API_KEY", "NVIDIA_API_KEY", "OPENAI_API_KEY"];

export function setVar(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.replace(/\n?$/, "\n")}${key}=${value}\n`;
}
export function getVar(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

async function main() {
  const created = !fs.existsSync(LOCAL);
  let env = created ? fs.readFileSync(EXAMPLE, "utf8") : fs.readFileSync(LOCAL, "utf8");
  console.log(created ? "• Created .env.local from .env.example" : "• Found your .env.local — keeping it, only filling what is empty");

  // 1) one model key
  const have = KEYS.find((k) => getVar(env, k) || process.env[k]);
  if (have) {
    if (!getVar(env, have) && process.env[have]) env = setVar(env, have, process.env[have]);
    console.log(`• Model key: ${have} ✓`);
  } else if (!yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const k = (await rl.question("• Paste a free Gemini key (https://aistudio.google.com/apikey), or press Enter to skip: ")).trim();
    rl.close();
    if (k) { env = setVar(env, "GEMINI_API_KEY", k); console.log("  saved as GEMINI_API_KEY ✓"); }
    else console.log("  skipped — the site runs; the chat will ask for a key");
  } else {
    console.log("• Model key: none (set GEMINI_API_KEY to turn the agent on) — the site still runs");
  }

  // 2) owner passphrase
  let token = getVar(env, "PORTFOLIO_OWNER_TOKEN") || process.env.PORTFOLIO_OWNER_TOKEN || "";
  if (!token) {
    token = crypto.randomBytes(18).toString("base64url");
    env = setVar(env, "PORTFOLIO_OWNER_TOKEN", token);
    console.log(`• Owner passphrase (keep it; it unlocks editing): ${token}`);
  } else {
    console.log("• Owner passphrase: already set ✓");
  }

  fs.writeFileSync(LOCAL, env);
  const store = getVar(env, "POSTGRES_URL") || getVar(env, "DATABASE_URL");
  console.log(`• Database: ${store ? "connected ✓ (hosting /make portfolios is on)" : "none — /make hands back a downloadable pack; add POSTGRES_URL to host portfolios"}`);
  console.log("• Ready. Starting the dev server (http://localhost:3000 unless you passed a port) …");
}

const isMain = (() => { try { return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1] || ""); } catch { return false; } })();
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
