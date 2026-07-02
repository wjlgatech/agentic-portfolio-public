// Unit tests for email-based owner recovery (pure: expiry + email masking).
import { recoveryExp, isRecoveryExpired, maskEmail, RECOVERY_TTL_MIN } from "../packages/core/src/recovery-types.ts";

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };

const now = 1_000_000_000_000;
const exp = recoveryExp(now);
check("expiry is TTL minutes out", exp === now + RECOVERY_TTL_MIN * 60_000);

check("a fresh record is NOT expired", isRecoveryExpired({ hash: "abc", exp }, now) === false);
check("a record is expired once past exp", isRecoveryExpired({ hash: "abc", exp }, exp + 1) === true);
check("null/empty record counts as expired (fail-closed)", isRecoveryExpired(null, now) === true && isRecoveryExpired({ hash: "", exp }, now) === true);

check("maskEmail hides the local part but shows domain", maskEmail("jamie@gmail.com") === "ja•••@gmail.com");
check("maskEmail handles short locals", maskEmail("a@x.io").startsWith("a") && maskEmail("a@x.io").endsWith("@x.io"));
check("maskEmail degrades on garbage", maskEmail("not-an-email") === "the email on file" && maskEmail("") === "the email on file");

console.log(ok ? "✅ recovery: all pass" : "❌ recovery: FAIL");
process.exit(ok ? 0 : 1);
