# `@core` — the platform contract layer

This is the **platform** half of the split: the framework-agnostic, fs-free **contract** that every
vertical (the portfolio, a marketing agency, a law firm, a dentist…) is built on. The portfolio is a
*node* on this platform, not its owner — so the reusable substrate lives here, apart from any one
vertical's content/UI.

Import it via the **`@core/*`** path alias (tsconfig), e.g. `import { InstanceConfig } from "@core/instance-types"`.

## What's here (now)

The pure, import-free contract + data models — the heart of Instances:

| File | Role |
|---|---|
| `instance-types.ts` | **The Lego contract.** `InstanceConfig` + `validateInstance()` + `instanceToAgentCard()` + `instanceEvidence()`. The studs every content pack snaps onto. |
| `registry-types.ts` | The network registry model: entry shape + `searchRegistry`/`scoreEntry`/`normalizeRegistry`. |
| `verification-types.ts` | The self-proof model: verdict taxonomy + the deterministic `aggregate()`. |
| `compass-types.ts` | The Next-Projects model: the four growth vectors + `normalizeCompass`. |

All four are **pure** (no `node:fs`, no `next/*`) — so a client component, a server route, and a
plain-Node test can all import them.

## Migration roadmap (the rest of the split)

This first slice is the contract. Still in the app's `lib/` (framework-coupled or request-coupled),
destined for core in later increments:

- `storage.ts`, `llm.ts`, `llm-complete.ts` — durable storage + the free-LLM survival chain (framework-agnostic infra).
- `registry.ts` (fs/network layer), the A2A request/response helpers, `rate-limit.ts` (request-coupled), `owner.ts` (`next/server`-typed).
- **Then** workspace-ify (`packages/core/package.json` + npm/turbo workspaces + `transpilePackages`), move the Next app to `apps/portfolio`, and reconfigure the Vercel **Root Directory** to `apps/portfolio` (a dashboard change — that's the step that needs the deploy reconfigured, which is why it's last).

