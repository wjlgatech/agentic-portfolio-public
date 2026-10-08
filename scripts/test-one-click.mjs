// The "1-click setup and run" promise, as a test. It fails if the promise silently rots:
//   • the README's Deploy button is not exactly the one scripts/deploy-button.mjs generates;
//   • the button asks for a variable .env.example does not document, or stops requiring the owner passphrase;
//   • the button stops creating the database (the Neon store), so /make hosting would break on first deploy;
//   • `npm run quickstart` disappears, or scripts/setup.mjs overwrites an existing .env.local, or fails to
//     mint an owner passphrase, non-interactively, in a clean temp dir.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { badge, deployUrl, REQUIRED_ENV } from "./deploy-button.mjs";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };
const root = new URL("../", import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, root), "utf8");

const readme = read("README.md");
check("README embeds exactly the generated Deploy button", readme.includes(badge()));
const u = new URL(deployUrl());
check("button requires the owner passphrase", (u.searchParams.get("env") || "").split(",").includes("PORTFOLIO_OWNER_TOKEN"));
const example = read(".env.example");
check("every required button variable is documented in .env.example", REQUIRED_ENV.every((k) => new RegExp(`^${k}=`, "m").test(example)));
check("button creates the Neon database store", /"integrationSlug":"neon"/.test(u.searchParams.get("stores") || ""));
check("README documents `npm run quickstart`", readme.includes("npm run quickstart"));
const pkg = JSON.parse(read("package.json"));
check("package.json has a quickstart script that runs setup", /scripts\/setup\.mjs/.test(pkg.scripts.quickstart || ""));

// setup.mjs, non-interactively, in a temp copy
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oneclick-"));
fs.mkdirSync(path.join(dir, "scripts"));
fs.copyFileSync(new URL("scripts/setup.mjs", root), path.join(dir, "scripts/setup.mjs"));
fs.copyFileSync(new URL(".env.example", root), path.join(dir, ".env.example"));
const run = (env = {}) => execFileSync("node", [path.join(dir, "scripts/setup.mjs"), "--yes"], { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
run({ GEMINI_API_KEY: "test-key" });
const first = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
check("setup writes the model key from the environment", /^GEMINI_API_KEY=test-key$/m.test(first));
const token = (first.match(/^PORTFOLIO_OWNER_TOKEN=(.+)$/m) || [])[1] || "";
check("setup mints an owner passphrase", token.length >= 20);
run({ GEMINI_API_KEY: "other" });
const second = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
check("setup never overwrites an existing .env.local value", second.includes("GEMINI_API_KEY=test-key") && second.includes(`PORTFOLIO_OWNER_TOKEN=${token}`));
fs.rmSync(dir, { recursive: true, force: true });

process.exit(ok ? 0 : 1);
