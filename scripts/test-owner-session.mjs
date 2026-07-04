// Unit tests for the ROOT owner gate's forgot-passphrase tokens (lib/owner.ts):
// stateless HMAC-signed recovery links (rec.<exp>.<sig>) and owner sessions
// (sess.<exp>.<sig>), keyed by PORTFOLIO_OWNER_TOKEN itself — so rotating the
// env var invalidates everything, and neither kind ever reveals the secret.
process.env.PORTFOLIO_OWNER_TOKEN = "test-secret";
const { mintRecoveryToken, mintSessionToken, recoveryTokenValid, ownerCredentialValid } =
  await import("../lib/owner.ts");

let ok = true;
const check = (n, c) => { console.log(`${c ? "✅" : "❌"} ${n}`); if (!c) ok = false; };

const now = 1_000_000_000_000;
const rec = mintRecoveryToken(now);
const sess = mintSessionToken(now);

check("raw passphrase is a valid credential", ownerCredentialValid("test-secret", now));
check("wrong passphrase is rejected", !ownerCredentialValid("nope", now));
check("a fresh session token is a valid credential", ownerCredentialValid(sess, now));
check("a fresh recovery token verifies as a recovery", recoveryTokenValid(rec, now));

// Domain separation: one kind must never pass as the other.
check("a recovery token is NOT a credential", !ownerCredentialValid(rec, now));
check("a session token is NOT a recovery", !recoveryTokenValid(sess, now));

// Expiry (recovery = 30 min, session = 30 days).
check("recovery token expires after 30 min", !recoveryTokenValid(rec, now + 30 * 60_000 + 1));
check("session token expires after 30 days", !ownerCredentialValid(sess, now + 30 * 24 * 60 * 60_000 + 1));
check("session token still valid just before expiry", ownerCredentialValid(sess, now + 30 * 24 * 60 * 60_000 - 1));

// Tampering / forgery.
check("tampered signature is rejected", !ownerCredentialValid(sess.slice(0, -1) + (sess.endsWith("0") ? "1" : "0"), now));
check("tampered expiry is rejected", !ownerCredentialValid(sess.replace(/^sess\.\d+/, `sess.${now + 999 * 24 * 60 * 60_000}`), now));

// Rotating the owner token kills every outstanding session + recovery link.
process.env.PORTFOLIO_OWNER_TOKEN = "rotated-secret";
check("rotation invalidates old sessions", !ownerCredentialValid(sess, now));
check("rotation invalidates old recovery links", !recoveryTokenValid(rec, now));

// Un-gated instance: everyone is owner, but nothing is signable.
delete process.env.PORTFOLIO_OWNER_TOKEN;
check("un-gated → any credential accepted", ownerCredentialValid("", now));
check("un-gated → recovery links never verify", !recoveryTokenValid(rec, now));

console.log(ok ? "✅ owner-session: all pass" : "❌ owner-session: FAIL");
process.exit(ok ? 0 : 1);
