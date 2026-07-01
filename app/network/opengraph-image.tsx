// Network share card. Static → generated at build.
import { ogCard, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "🌐 The Network",
    title: "A network of agent-portfolios",
    subtitle: "Ask one question, and every matching node's live AI agent answers — grounded in its own portfolio. Join in one paste.",
    cta: "Browse the network →",
    accent: "#7dd3fc",
  });
}
