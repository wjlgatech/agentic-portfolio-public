---
name: agentic-portfolio-a2a
description: Talk to Paul Jialiang Wu's portfolio agent over A2A — grounded, honest Q&A, claim verification, and role-fit, machine-to-machine.
homepage: https://agentic-portfolio-lovat.vercel.app
protocol: a2a
---

# Portfolio Agent (A2A) — agent-native skill

This portfolio is **agent-native**: another AI agent (a recruiter's screener, a sourcing
bot, a collaborator's agent) can discover it and talk to it directly, machine-to-machine,
over Google's **A2A (Agent2Agent)** protocol. Authored in the spirit of
[CLI-Anything](https://github.com/wjlgatech/CLI-Anything) — *making all software agent-native*.

Every answer is **grounded and honest**: it comes only from the portfolio's evidence + the
verified "Receipts" claims. Private projects share a high-level highlight only. Unprovable
claims (employment, degrees) come back **"unverified — needs an external source"**, never faked.

## 1. Discover (the Agent Card)

```bash
curl https://agentic-portfolio-lovat.vercel.app/.well-known/agent-card.json
# (legacy clients: /.well-known/agent.json — both work)
```

The card advertises the JSON-RPC endpoint (`url`), `capabilities` (sync; `streaming:false`),
and the `skills` below.

## 2. Call (JSON-RPC 2.0, synchronous)

POST to the card's `url` (`/api/a2a`). Use `message/send` (legacy `tasks/send` also works).
The response is a completed A2A **Task** whose `status.message` / `artifacts` carry the answer.

```bash
curl -s -X POST https://agentic-portfolio-lovat.vercel.app/api/a2a \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{ "kind": "text", "text": "Does he have production experience building agent-verification tooling?" }],
        "metadata": { "skill": "verify_claim" }
      }
    }
  }'
```

## 3. Skills

| skill (pass as `params.message.metadata.skill`) | Use |
|---|---|
| `ask_candidate` (default) | Any grounded question about his work, projects, skills, mission, values. |
| `verify_claim` | Check a claim → `VERDICT: corroborated\|partial\|unverified\|contradicted` + citations. |
| `role_fit` | Give a role/JD → matched strengths (with evidence) + honest gaps + `FIT:` rating. |

No auth — public read access by design. Be a good citizen: one question per call, keep text short.
