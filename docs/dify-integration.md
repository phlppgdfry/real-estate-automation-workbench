# Dify Workflow-integratie

Deze case gebruikt Dify als **begrensde analyseprovider** en read-only operations agent,
niet als autonome vastgoedagent.
Dify classificeert alleen de aanvraag. De TypeScript-domeinlaag controleert daarna opnieuw
het broncitaat, de pandreferentie, catalogusstatus en menselijke goedkeuring.

## Contract en capabilities

Het contract staat in [`dify/workflow-contract.json`](../dify/workflow-contract.json).
Bouw in Dify een Workflow met:

1. Start-input `message` (tekst).
2. LLM-node met structured JSON output volgens `intent`, `reference`, `evidence`.
3. End-node die die drie velden teruggeeft.

Gebruik geen tools, HTTP-actions, CRM-koppelingen of e-mailnodes in deze workflow.
De adapter ondersteunt uitsluitend blocking requests (streaming wordt expliciet geweigerd), workflow-run metadata
(run-id, task-id, tokens en doorlooptijd) en zowel een direct output-object als een
JSON-string in `outputs.result`. De browser krijgt nooit de Dify-sleutel.

## Lokale configuratie

Voeg na `npm run setup:local` optioneel toe aan `.env.local`:

```dotenv
DIFY_WORKFLOW_API_KEY=app-...
DIFY_API_BASE_URL=https://api.dify.ai
DIFY_WORKFLOW_USER=duin-dorp-local
```

De sleutel is een Dify **Workflow API key**, niet je CLI-token. De browser gebruikt deze
variabelen nooit. Zonder deze sleutel blijft de lokale API de regelsmodus gebruiken; met een
OpenAI-sleutel en zonder Dify-sleutel blijft de OpenAI-adapter beschikbaar.

## Dify CLI

```bash
difyctl version
difyctl login --server https://cloud.dify.ai
difyctl get app
```

Een gepubliceerde workflow kun je ook direct testen met:

```bash
difyctl run app <APP_ID> --inputs '{"message":"Ik wil DD-204 bezoeken."}' -o json
```

De server gebruikt dezelfde officiële Workflow API (`POST /v1/workflows/run`) in blocking
mode. Fouten, timeouts en ongeldige output worden niet als succesvolle aanvragen opgeslagen.

Lokale diagnose:

```bash
npm run dify:doctor
```

De doctor print geen sleutel. Zonder workflow key blijft de demo bewust deterministisch
werken; zo kun je de volledige businessflow testen zonder credits of externe afhankelijkheid.

## Senior operating model

| Laag          | Verantwoordelijkheid                            | Dify toegestaan   |
| ------------- | ----------------------------------------------- | ----------------- |
| Ingest        | HMAC, replay protection, deduplicatie           | Nee               |
| Analyse       | Intentie, pandreferentie, broncitaat            | Ja, strikt schema |
| Besluit       | Catalogusregels, stale-check, menselijke review | Nee               |
| Uitvoering    | Outbox, CRM-mock, retry/backoff                 | Nee               |
| Observability | Audit, run-id, latency en tokenmetadata         | Alleen metadata   |

De integratie doet bewust geen automatische retries op een workflow-POST: een workflow
kan externe side effects bevatten. Als productie een retry nodig heeft, moet de workflow
een idempotency-key ondersteunen en moet de outbox de retry beslissen.

Voor de portfolio-opzet zijn drie bouwblokken vastgelegd:

- [`workflow-contract.json`](../dify/workflow-contract.json): lead-extractie.
- [`agent-contract.json`](../dify/agent-contract.json): exception-assistant zonder tools.
- [`portfolio-blueprint.json`](../dify/portfolio-blueprint.json): workflow-, agent- en document-review flows.

De volledige senior verhaallijn staat in [`ai-operating-model.md`](ai-operating-model.md).

## Senior design review

| Beslissing                   | Waarom                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Dify achter een adapter      | Provider wisselen zonder domeinregels te vervuilen        |
| Output opnieuw valideren     | Een LLM- of workflowcontract is geen domeingarantie       |
| Geen tools in de analyseflow | Prompt injection kan geen CRM- of mailactie triggeren     |
| Rules fallback               | Demo en lokale tests blijven deterministisch en goedkoop  |
| Human-in-the-loop            | Alleen een medewerker kan een antwoordvoorstel goedkeuren |

Live Dify-workflow en de CLI-voorbeelden zijn in deze run niet geverifieerd; de adapter is met nagebootste HTTP-antwoorden getest.
