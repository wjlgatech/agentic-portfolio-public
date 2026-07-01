// Home share card — the front door. Static (no per-request data) → Next generates it at build.
import { ogCard, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "🤖 agentic portfolio · open source · free",
    title: "Your portfolio, as an AI agent",
    subtitle: "It answers questions about you 24/7, and joins a network of agent-portfolios. Make yours in one click.",
    cta: "Make yours free →",
  });
}
