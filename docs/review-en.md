# Reviewer guide · Duin & Dorp

A fictional real-estate operations case: receive an enquiry once, check the property, obtain human approval and hand work over reliably. It combines business analysis with a working browser demo, a persistent local API and recorded Dify evidence. Built with AI assistance; no real client data or production experience is claimed.

**[Try the two-minute tour](https://phlppgdfry.github.io/real-estate-automation-workbench/?tour)** · **[Evidence matrix](../EVIDENCE.md)** · **[Release boundaries](release-readiness.md)**

Try approving an enquiry, simulate a CRM failure and inspect a sold property. The model cannot choose prices, promise a viewing or write to the CRM. Source guards, role checks, optimistic versions, a durable inbox and a transactional outbox enforce the process. The separate HTTP connector demonstrates idempotency and reconciliation after a remote commit followed by a disconnect.

The connected local workspace adds document extraction, source-checked corrections, expiry, metadata-only traces and current Dutch/French procedures. Four Dify workbench apps have historical live run evidence. A fifth native Schedule Trigger completed a real timed draft run with three steps and zero model tokens; it was published and then disabled.

The browser demo, local API, regression evaluation and failure drill require no paid provider. Follow the [README quickstart](../README.md). `npm run check`, `npm run test:e2e`, `npm run benchmark` and `npm run verify:install` make the technical evidence repeatable.

New Dify model runs are blocked by exhausted free quota. The benchmark reports local execution of the actual fixed-workflow Python nodes separately from Dify Cloud execution; unexecuted Cloud cells have no fabricated scores. Human evaluation labels and a completely fresh Dify workspace remain unverified. A quoted source proves provenance, not correct interpretation, legal completeness or a production safety guarantee.

Ask the author to change a source quote, explain why an old worker cannot commit, and show how a repeated native event becomes one receipt. The detailed docs and interface are in Dutch; code, contracts and test output are directly inspectable.
