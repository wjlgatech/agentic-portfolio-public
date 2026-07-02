// Brand token sets for the marketing art-boards — the SAME theme seam as app/themes.css
// (one token set per brand; swapping tokens restyles every board with zero board edits).
// Canvas/surface/edge/ink/muted/accent/fonts/radius/shadow/heroBg are transcribed from the
// [data-theme] blocks in app/themes.css; three tokens the CSS doesn't carry are added here:
//   accentText — an accent dark/light enough for SMALL text on this canvas (WCAG ≥4.5:1);
//                large display marks may use `accent` itself (≥3:1 rule).
//   statusNo/statusYes — the ✗/✓ pair, always rendered WITH icon + words (never color alone).
// Single-accent by design (see CHANGELOG: multi-hue brand secondaries fail chroma/CVD as marks).

export const THEMES = {
  anthropic: {
    dark: false,
    canvas: "#F0EEE6", surface: "#FAF9F5", edge: "#E2DED3",
    ink: "#191919", muted: "#6B6657",
    accent: "#d97757", accentText: "#b05730", onaccent: "#FAF9F5",
    statusNo: "#8E3B1F", statusYes: "#4E6A3D",
    radius: "14px", edgeW: "1px",
    shadow: "0 1px 2px rgba(0,0,0,.05), 0 10px 30px rgba(40,30,20,.06)",
    fontSans: 'ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
    fontDisplay: '"Iowan Old Style", Palatino, Georgia, "Times New Roman", serif',
    displayWeight: "600", tracking: "-0.015em", displayTransform: "none",
    heroBg: "radial-gradient(1100px 520px at 78% -8%, rgba(204,120,92,.18), transparent), radial-gradient(820px 480px at -8% 12%, rgba(191,145,110,.14), transparent), #F0EEE6",
    eyebrowSpacing: "2.5px",
  },
  openai: {
    dark: false,
    canvas: "#FFFFFF", surface: "#F7F7F8", edge: "#E5E5E5",
    ink: "#0D0D0D", muted: "#6E6E80",
    accent: "#10A37F", accentText: "#0E8A6C", onaccent: "#FFFFFF",
    statusNo: "#99321F", statusYes: "#0E7A55",
    radius: "9px", edgeW: "1px",
    shadow: "0 1px 2px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.05)",
    fontSans: '"Söhne", ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif',
    fontDisplay: '"Söhne", ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif',
    displayWeight: "600", tracking: "-0.022em", displayTransform: "none",
    heroBg: "radial-gradient(900px 480px at 82% -10%, rgba(16,163,127,.10), transparent), #FFFFFF",
    eyebrowSpacing: "2px",
  },
  google: {
    dark: false,
    canvas: "#FFFFFF", surface: "#F8FAFD", edge: "#DADCE0",
    ink: "#202124", muted: "#5F6368",
    accent: "#1A73E8", accentText: "#1765CC", onaccent: "#FFFFFF",
    statusNo: "#B3261E", statusYes: "#188038",
    radius: "16px", edgeW: "1px",
    shadow: "0 1px 3px rgba(60,64,67,.30), 0 4px 10px rgba(60,64,67,.15)",
    fontSans: '"Google Sans", Roboto, ui-sans-serif, Arial, sans-serif',
    fontDisplay: '"Google Sans", Roboto, ui-sans-serif, Arial, sans-serif',
    displayWeight: "700", tracking: "0em", displayTransform: "none",
    heroBg: "radial-gradient(680px 360px at 10% 0%, rgba(66,133,244,.13), transparent), radial-gradient(680px 360px at 90% 6%, rgba(234,67,53,.09), transparent), radial-gradient(600px 320px at 50% 0%, rgba(52,168,83,.07), transparent), #FFFFFF",
    eyebrowSpacing: "1.5px",
  },
  apple: {
    dark: false,
    canvas: "#FBFBFD", surface: "#FFFFFF", edge: "#D2D2D7",
    ink: "#1D1D1F", muted: "#6E6E73",
    accent: "#0071E3", accentText: "#0066CC", onaccent: "#FFFFFF",
    statusNo: "#B02818", statusYes: "#1D7A34",
    radius: "18px", edgeW: "1px",
    shadow: "0 4px 16px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)",
    fontSans: '-apple-system, "SF Pro Text", ui-sans-serif, "Helvetica Neue", Arial, sans-serif',
    fontDisplay: '"SF Pro Display", -apple-system, ui-sans-serif, "Helvetica Neue", sans-serif',
    displayWeight: "700", tracking: "-0.025em", displayTransform: "none",
    heroBg: "radial-gradient(900px 500px at 50% -12%, rgba(0,113,227,.10), transparent), #FBFBFD",
    eyebrowSpacing: "2px",
  },
  vercel: {
    dark: true,
    canvas: "#0A0A0A", surface: "#111113", edge: "#26262A",
    ink: "#EDEDED", muted: "#8A8A91",
    accent: "#5E6AD2", accentText: "#9BA3EB", onaccent: "#FFFFFF",
    statusNo: "#FF6369", statusYes: "#4ADE80",
    radius: "9px", edgeW: "1px",
    shadow: "0 0 0 1px rgba(255,255,255,.04), 0 14px 36px rgba(0,0,0,.55)",
    fontSans: '"Inter", "Geist", ui-sans-serif, system-ui, sans-serif',
    fontDisplay: '"Inter", "Geist", ui-sans-serif, system-ui, sans-serif',
    displayWeight: "700", tracking: "-0.02em", displayTransform: "none",
    heroBg: "radial-gradient(900px 480px at 82% -10%, rgba(94,106,210,.22), transparent), radial-gradient(720px 420px at -5% 10%, rgba(0,220,130,.08), transparent), #0A0A0A",
    eyebrowSpacing: "2px",
  },
  stripe: {
    dark: false,
    canvas: "#F6F9FC", surface: "#FFFFFF", edge: "#E3E8EE",
    ink: "#0A2540", muted: "#425466",
    accent: "#635BFF", accentText: "#5851DB", onaccent: "#FFFFFF",
    statusNo: "#A8321E", statusYes: "#1E7A4D",
    radius: "12px", edgeW: "1px",
    shadow: "0 12px 28px rgba(10,37,64,.10), 0 2px 6px rgba(10,37,64,.06)",
    fontSans: '"Sohne", "Inter", ui-sans-serif, "Helvetica Neue", Arial, sans-serif',
    fontDisplay: '"Sohne", "Inter", ui-sans-serif, "Helvetica Neue", Arial, sans-serif',
    displayWeight: "700", tracking: "-0.02em", displayTransform: "none",
    heroBg: "linear-gradient(180deg, rgba(99,91,255,.10), transparent 28%), radial-gradient(900px 460px at 86% -10%, rgba(0,212,255,.16), transparent), #F6F9FC",
    eyebrowSpacing: "2px",
  },
  swiss: {
    dark: false,
    canvas: "#FFFFFF", surface: "#FFFFFF", edge: "#111111",
    ink: "#111111", muted: "#444444",
    accent: "#E2231A", accentText: "#C41E16", onaccent: "#FFFFFF",
    statusNo: "#C41E16", statusYes: "#111111",
    radius: "0px", edgeW: "1px",
    shadow: "none",
    fontSans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontDisplay: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    displayWeight: "800", tracking: "-0.03em", displayTransform: "none",
    heroBg: "#FFFFFF",
    eyebrowSpacing: "3px",
  },
  brutalist: {
    dark: false,
    canvas: "#F5F5F0", surface: "#FFFFFF", edge: "#000000",
    ink: "#000000", muted: "#262626",
    accent: "#0000FF", accentText: "#0000CC", onaccent: "#FFFFFF",
    statusNo: "#CC2E00", statusYes: "#000000",
    radius: "0px", edgeW: "2px",
    shadow: "5px 5px 0 0 rgba(0,0,0,1)",
    fontSans: 'ui-monospace, "Courier New", monospace',
    fontDisplay: 'ui-monospace, "Courier New", monospace',
    displayWeight: "700", tracking: "0em", displayTransform: "uppercase",
    heroBg: "#F5F5F0",
    eyebrowSpacing: "2px",
  },
  notion: {
    dark: false,
    canvas: "#FFFFFF", surface: "#FFFFFF", edge: "#EAEAEA",
    ink: "#37352F", muted: "#787774",
    accent: "#2383E2", accentText: "#1C6DBF", onaccent: "#FFFFFF",
    statusNo: "#B3441E", statusYes: "#3E7A45",
    radius: "6px", edgeW: "1px",
    shadow: "0 1px 2px rgba(15,15,15,.06), 0 6px 16px rgba(15,15,15,.04)",
    fontSans: 'ui-sans-serif, "Inter", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    fontDisplay: '"Lyon", "Iowan Old Style", Georgia, "Times New Roman", serif',
    displayWeight: "700", tracking: "-0.01em", displayTransform: "none",
    heroBg: "#FFFFFF",
    eyebrowSpacing: "2px",
  },
};

export const DEFAULT_THEME = "anthropic";

/** Token set → a CSS custom-properties block the boards consume. */
export function themeCss(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`Unknown theme "${name}". Available: ${Object.keys(THEMES).join(", ")}`);
  return `:root {
  --canvas: ${t.canvas}; --surface: ${t.surface}; --edge: ${t.edge};
  --ink: ${t.ink}; --muted: ${t.muted};
  --accent: ${t.accent}; --accent-text: ${t.accentText}; --onaccent: ${t.onaccent};
  --status-no: ${t.statusNo}; --status-yes: ${t.statusYes};
  --radius: ${t.radius}; --edge-w: ${t.edgeW}; --shadow: ${t.shadow};
  --font-sans: ${t.fontSans}; --font-display: ${t.fontDisplay};
  --display-weight: ${t.displayWeight}; --tracking: ${t.tracking}; --display-transform: ${t.displayTransform};
  --hero-bg: ${t.heroBg};
}`;
}
