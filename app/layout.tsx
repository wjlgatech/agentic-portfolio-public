import type { Metadata } from "next";
import "./globals.css";
import { StyleSwitcher } from "@/components/StyleSwitcher";
import { getActiveInstance } from "@/content/instances";

export const metadata: Metadata = {
  title: "Paul Jialiang Wu — Agentic Portfolio",
  description:
    "AI/ML/DS Lead · Inventor · Investor · Creator. Self-improving agentic operating systems, built in the open. Ask the on-page agent anything.",
  metadataBase: new URL("https://github.com/wjlgatech"),
  openGraph: {
    title: "Paul Jialiang Wu — Agentic Portfolio",
    description:
      "Self-improving agentic operating systems, built in the open. An agentic portfolio powered by free LLMs.",
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
      </body>
    </html>
  );
}
