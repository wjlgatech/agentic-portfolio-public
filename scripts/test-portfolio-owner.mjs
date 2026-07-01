// Unit tests for per-portfolio ownership (mint / hash / constant-time verify).
import { mintOwnerToken, hashOwnerToken, ownerHashMatches, ownerKey } from "../lib/portfolio-owner.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

const t1 = mintOwnerToken();
const t2 = mintOwnerToken();
check("minted token is URL-safe and long enough", /^[A-Za-z0-9_-]{20,}$/.test(t1));
check("two minted tokens differ (random)", t1 !== t2);

const h1 = hashOwnerToken(t1);
check("hash is 64-hex (sha256)", /^[0-9a-f]{64}$/.test(h1));
check("hashing is deterministic", hashOwnerToken(t1) === h1);
check("different tokens hash differently", hashOwnerToken(t2) !== h1);
check("we never store the raw token (hash != token)", h1 !== t1);

check("the correct token matches its stored hash", ownerHashMatches(t1, h1) === true);
check("a wrong token does NOT match", ownerHashMatches(t2, h1) === false);
check("empty token never matches", ownerHashMatches("", h1) === false);
check("empty/garbage hash never matches", ownerHashMatches(t1, "") === false && ownerHashMatches(t1, "deadbeef") === false);

check("ownerKey namespaces per slug", ownerKey("jane-x") === "owner:jane-x");

console.log(ok ? "✅ portfolio-owner: all pass" : "❌ portfolio-owner: FAIL");
process.exit(ok ? 0 : 1);
