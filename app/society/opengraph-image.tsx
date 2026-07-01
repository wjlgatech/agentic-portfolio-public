// TRUE Society share card. Static → generated at build.
import { ogCard, OG_SIZE, OG_CONTENT_TYPE, OG_ALT } from "@/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    eyebrow: "🏛 The TRUE Society · invite-only",
    title: "Standing is earned, not granted",
    subtitle: "Builders who ship things that are TRUE — for humans and their agents. Your standing is your leverage.",
    cta: "Check your standing →",
    accent: "#c4b5fd",
  });
}
