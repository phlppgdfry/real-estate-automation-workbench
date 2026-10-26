# Senior AI operating model

## The portfolio story

This repository demonstrates how to introduce Dify agents and workflows into an existing
business process without turning an LLM into an unbounded automation engine.

```text
signed intake
  -> deterministic validation
  -> Dify extraction workflow
  -> application guardrails + catalog checks
  -> human review
  -> durable outbox
  -> CRM adapter
```

The companion operations agent is deliberately read-only. It explains exceptions and
proposes a next step; it cannot book, email, edit CRM records, or bypass review.

## Implemented Dify apps

### 1. Lead Intake Workflow

- Start: `message` text input.
- LLM: structured output with `intent`, `reference`, `evidence`.
- Code: reject invalid schemas, invented citations and references absent from the input. The application separately enforces catalog status, mixed intent and suspicious-input rules.
- End: return the three contract fields as JSON in outputs.result.

### 2. Operations Agent

- Give it only validated intent, work status, catalog status and blocking reasons. Do not send the name, email, raw enquiry or audit trail.
- Configure no tools for the portfolio version.
- Require the response shape in `dify/agent-contract.json`.
- Expose it only to an authenticated internal reviewer.

### 3. Document Review Workflow

- Accept pasted text or one TXT/Markdown document (no PDF/OCR).
- Extract text and summarise observable facts.
- Minimise email and phone-like strings before the provider call; this is heuristic, not anonymisation.
- Route legal, financial, or customer-facing conclusions to a human.

## What is implemented versus designed

| Capability                                 | Status                                             |
| ------------------------------------------ | -------------------------------------------------- |
| Dify Workflow API adapter                  | Implemented, contract-tested and live-smoke-tested |
| Dify Agent API adapter                     | Implemented, contract-tested and live-smoke-tested |
| Rules fallback                             | Implemented and deterministic                      |
| Agent tools                                | No tool nodes in the importable Chatflow           |
| Human approval and outbox                  | Implemented locally                                |
| Live Dify applications                     | Three Studio apps tested with fictional fixtures   |
| Production identity, retention, monitoring | Design documented; deployment-specific             |

This distinction is intentional: a senior portfolio should show production judgement,
not pretend that a local CRM mock is a live enterprise integration. See [Dify evidence](dify-integration.md) for actual provider runs.
