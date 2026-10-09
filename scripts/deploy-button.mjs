#!/usr/bin/env node
// scripts/deploy-button.mjs — the ONE definition of the "Deploy with Vercel" button (the deploy half of
// "1-click setup and run"). The README embeds exactly this URL; scripts/test-one-click.mjs fails if they drift.
//
// What the button does (Vercel's documented clone flow, https://vercel.com/docs/deploy-button):
//   • clones this repo into the visitor's own GitHub account as `my-agentic-portfolio`;
//   • asks for exactly two values: a free GEMINI_API_KEY (turns the agent on) and a PORTFOLIO_OWNER_TOKEN
//     (an owner passphrase — required, because a deploy without one is editable by anyone);
//   • creates a free Neon Postgres store during the flow (the `stores` parameter, as used by Vercel's own
//     templates), which sets POSTGRES_URL/DATABASE_URL — so /make hosting and the network work on first deploy.
//   node scripts/deploy-button.mjs           → print the URL
//   node scripts/deploy-button.mjs --md      → print the README badge markdown
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const REPO = "https://github.com/wjlgatech/agentic-portfolio-public";
export const REQUIRED_ENV = ["GEMINI_API_KEY", "PORTFOLIO_OWNER_TOKEN"];

export function deployUrl() {
  const p = new URLSearchParams({
    "repository-url": REPO,
    "project-name": "my-agentic-portfolio",
    "repository-name": "my-agentic-portfolio",
    env: REQUIRED_ENV.join(","),
    envDescription: "GEMINI_API_KEY: a free key from aistudio.google.com/apikey turns your agent on. PORTFOLIO_OWNER_TOKEN: make up a long passphrase; it locks editing to you.",
    envLink: `${REPO}#-deploy-free`,
    stores: JSON.stringify([{ type: "integration", productSlug: "neon", integrationSlug: "neon" }]),
  });
  return `https://vercel.com/new/clone?${p.toString()}`;
}

export const badge = () => `[![Deploy with Vercel](https://vercel.com/button)](${deployUrl()})`;

const isMain = (() => { try { return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1] || ""); } catch { return false; } })();
if (isMain) console.log(process.argv.includes("--md") ? badge() : deployUrl());
