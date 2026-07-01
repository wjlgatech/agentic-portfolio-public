// Unit test for lib/rate-limit.ts — the per-IP limiter protecting the open routes.
import { rateLimit, clientKey } from "../lib/rate-limit.ts";

let ok = true;
const check = (name, cond) => { console.log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) ok = false; };

// 3-per-window: first 3 allowed, 4th blocked
const r = (k) => rateLimit(k, 3, 60_000);
const a = [r("ip-a"), r("ip-a"), r("ip-a"), r("ip-a")];
check("first 3 allowed", a[0].ok && a[1].ok && a[2].ok);
check("4th blocked with retryAfter", !a[3].ok && a[3].retryAfter >= 1);
check("a different key has its own budget", r("ip-b").ok);

// clientKey reads the forwarded IP
const key = clientKey({ headers: { get: (n) => (n === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null) } });
check("clientKey takes the first forwarded IP", key === "1.2.3.4");

console.log(ok ? "✅ rate-limit: all pass" : "❌ rate-limit FAIL");
process.exit(ok ? 0 : 1);
