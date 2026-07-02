/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve the A2A Agent Card at the well-known paths. Next ignores folders that start
  // with ".", so we rewrite both the current spec path (agent-card.json) and the legacy
  // one (agent.json) to a route handler that builds the card with the live origin.
  async rewrites() {
    return [
      // Deploy-level discovery (the active instance).
      { source: "/.well-known/agent-card.json", destination: "/api/agent-card" },
      { source: "/.well-known/agent.json", destination: "/api/agent-card" },
      // Per-hosted-portfolio discovery: a /p/<slug> node exposes its OWN card + a2a + llms.txt so
      // the network federation can find + query it. The routes resolve the config from KV via ?slug.
      { source: "/p/:slug/.well-known/agent-card.json", destination: "/api/agent-card?slug=:slug" },
      { source: "/p/:slug/.well-known/agent.json", destination: "/api/agent-card?slug=:slug" },
      { source: "/p/:slug/api/a2a", destination: "/api/a2a?slug=:slug" },
      { source: "/p/:slug/llms.txt", destination: "/llms.txt?slug=:slug" },
    ];
  },
};

export default nextConfig;
