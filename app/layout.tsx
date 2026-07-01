import type { Metadata } from "next";
import "./globals.css";
import { StyleSwitcher } from "@/components/StyleSwitcher";
import { MadeWith } from "@/components/MadeWith";
import { getActiveInstance } from "@/content/instances";

// The deploy's own origin — so og:image / twitter:image (the share thumbnails) resolve to ABSOLUTE
// URLs external unfurlers can fetch. Prefer an explicit site URL, then Vercel's, then a safe default.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

export const metadata: Metadata = {
  title: "agentic-portfolio — your AI portfolio + a self-propelling network",
  description:
    "An open-source portfolio that is itself an agent, and joins a network of agent-portfolios. Make yours free in one click.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "agentic-portfolio — your AI portfolio + a self-propelling network",
    description: "Make a free agentic portfolio in one click. It has its own AI agent and joins the network.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The active instance's theme is the DEFAULT brand (portfolio → anthropic, unmaskleads → vercel…);
  // the switcher/localStorage can override it live. Set on <html> so nothing downstream overrides it.
  const defaultTheme = getActiveInstance().theme;
  // No-flash theme restore: a user's chosen style (localStorage) wins over the instance default.
  const themeScript = `(function(){try{var t=localStorage.getItem("webapp-style");var ok=["anthropic","openai","google","apple","vercel","stripe","swiss","brutalist","notion"];if(t&&ok.indexOf(t)>-1){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

  return (
    <html lang="en" data-theme={defaultTheme}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <StyleSwitcher />
        {children}
        {/* Global brand-contact footer on EVERY page — max surface for the creator credit + the
            viral CTAs (make your own · join the network · star the repo). */}
        <footer className="mx-auto max-w-6xl px-5 pb-10">
          <MadeWith />
        </footer>
      </body>
    </html>
  );
}
