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

## Dify build plan

### 1. Lead Intake Workflow

- Start: `message` text input.
- LLM: structured output with `intent`, `reference`, `evidence`.
- Code: reject invented citations, unknown listings, mixed intent, and prompt injection signals.
- End: return only the three contract fields.

### 2. Operations Agent

- Give it the validated lead, catalog snapshot, audit trail, and operating policy as context.
- Configure no tools for the portfolio version.
- Require the response shape in `dify/agent-contract.json`.
- Expose it only to an authenticated internal reviewer.

### 3. Document Review Workflow

- Accept one uploaded document.
- Extract text and summarise observable facts.
- Redact or minimise personal data before persistence.
- Route legal, financial, or customer-facing conclusions to a human.

## What is implemented versus designed

| Capability                                 | Status                                        |
| ------------------------------------------ | --------------------------------------------- |
| Dify Workflow API adapter                  | Implemented and contract-tested               |
| Dify Agent API adapter                     | Implemented and contract-tested               |
| Rules fallback                             | Implemented and deterministic                 |
| Agent tool allowlist                       | Contract and policy defined; empty by default |
| Human approval and outbox                  | Implemented locally                           |
| Live Dify credentials and published app    | Not stored or claimed                         |
| Production identity, retention, monitoring | Design documented; deployment-specific        |

This distinction is intentional: a senior portfolio should show production judgement,
not pretend that a local mock is a live enterprise integration.
