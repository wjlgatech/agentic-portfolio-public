/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve the A2A Agent Card at the well-known paths. Next ignores folders that start
  // with ".", so we rewrite both the current spec path (agent-card.json) and the legacy
  // one (agent.json) to a route handler that builds the card with the live origin.
  async rewrites() {
    return [
      { source: "/.well-known/agent-card.json", destination: "/api/agent-card" },
      { source: "/.well-known/agent.json", destination: "/api/agent-card" },
    ];
  },
};

export default nextConfig;
