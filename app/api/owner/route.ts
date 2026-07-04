// ─────────────────────────────────────────────────────────────────────────────
// /api/owner — the authorization boundary for editing the portfolio.
//
// The portfolio is a PUBLIC site: anyone may read it and ask the agent questions.
// Only the OWNER may apply layout/content changes. Ownership is proven by a secret
// that lives ONLY server-side in PORTFOLIO_OWNER_TOKEN (set it in the deploy's env;
// e.g. Vercel project env). The token is never shipped to the browser.
//
//   GET  → { ownerRequired }   (is a token configured? if not, this is an
//                               un-gated local/dev instance and everyone is owner)
//   POST { token } → { owner }  (raw passphrase OR a signed recovery session —
//                               see /api/owner/recover)
//
// The shared check lives in lib/owner.ts (route files may only export HTTP verbs).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { ownerTokenConfigured, ownerCredentialValid } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ownerRequired: ownerTokenConfigured() });
}

export async function POST(req: NextRequest) {
  if (!ownerTokenConfigured()) return NextResponse.json({ owner: true, ownerRequired: false });
  let token = "";
  try {
    token = String((await req.json())?.token ?? "");
  } catch {
    /* empty body → not owner */
  }
  return NextResponse.json({ owner: ownerCredentialValid(token), ownerRequired: true });
}
