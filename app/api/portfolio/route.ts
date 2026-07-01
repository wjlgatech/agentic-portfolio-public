// ─────────────────────────────────────────────────────────────────────────────
// /api/portfolio — read + persist the agent-editable layout (content/portfolio.yaml).
//
//   GET  → current normalized config (theme, sections, articles).
//   POST → validate + write the config back to the YAML file.
//          Responds { persisted: boolean, config }. persisted=false means the
//          filesystem is read-only (e.g. serverless prod): the change is valid
//          and the client keeps it in localStorage, but it won't survive a
//          rebuild until the YAML is committed locally.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { readPortfolioAsync, writePortfolioDurable, normalize } from "@/lib/portfolio";
import { isOwnerRequest } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readPortfolioAsync());
}

export async function POST(req: NextRequest) {
  // Authorization boundary: only the owner may write. A visitor can read (GET)
  // and have the agent PROPOSE edits, but never persist them. This is the
  // server-side enforcement — the client also refuses, but this is the real gate.
  if (!isOwnerRequest(req)) {
    return NextResponse.json(
      { persisted: false, error: "Only the owner can edit this portfolio." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const config = normalize(body);
  const { persisted, durable } = await writePortfolioDurable(config);
  return NextResponse.json({ persisted, durable, config });
}
