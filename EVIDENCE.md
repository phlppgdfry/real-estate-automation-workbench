# Van functie-eis naar bewijs

Open de code en voer de tests uit. Een uitgewerkt project bewijst nog geen zelfstandige beheersing: laat de auteur het uitleggen en aanpassen.

| Vaardigheid                      | Concreet bewijs                                                 | Demo / controle                 | Grens                                                                             |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| Procesanalyse en bedrijfsinzicht | [AS-IS, TO-BE, KPI's](CASE_STUDY.md)                            | Proces & impact, tour 1/7       | Werkhypothese; geen echte workshop                                                |
| API's en systeemintegraties      | [API](server/app.ts), [contract](docs/openapi.json)             | Technisch dossier, HTTP-tests   | Lokale mock, geen echte CRM-credentials                                           |
| LLMs praktisch toepassen         | [Extractor](server/ai.ts), [regels](src/domain.ts)              | Broncitaat, tour 2/3            | Dify live smoke-tests met fictieve fixtures; geen onafhankelijke kwaliteitsmeting |
| Workflow en foutafhandeling      | [Outbox](server/store.ts)                                       | Fout simuleren, tour 4/5        | Eén lokale worker; geen netwerkgarantie                                           |
| Database en gegevensvalidatie    | [Store](server/store.ts), [schema](src/domain.ts)               | Rollback-/restarttests          | Geen productiecluster of migratieplatform                                         |
| Scripts en eigen toepassingen    | [React](src/App.tsx), [API-demo](scripts/demo-api.ts)           | Nieuwe aanvraag, filter, reset  | Browser en API zijn aparte adapters                                               |
| Testen, verbeteren, documenteren | [Tests](tests/domain.test.ts), [evaluatie](scripts/evaluate.ts) | Uitzonderingen, tour 6          | Handgeschreven kleine fixturebaseline                                             |
| Medewerkers en beheer meenemen   | [Handleiding](docs/user-guide.md), [pilot](docs/operations.md)  | Calculator en gebeurtenissenlog | Geen uitgevoerde pilot of gemeten besparing                                       |

## Acceptatiecriteria

| ID    | Gedrag                                                                                | Testbewijs                                   |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------------------- |
| AC-01 | Identiek event wordt geen tweede lead; zelfde ID met gewijzigde inhoud geeft conflict | integratie: event idempotentie               |
| AC-02 | Prijs uit catalogus; geen bezoekdatum beloven                                         | domein: catalogusprijs                       |
| AC-03 | Verkocht, onbekend of verouderd pand blokkeert                                        | domein: referenties/verouderd/verkocht       |
| AC-04 | Verouderde of dubbele goedkeuring mislukt                                             | domein + HTTP: versie                        |
| AC-05 | Outboxfout rolt goedkeuring terug                                                     | integratie: SQLite-trigger injecteert fout   |
| AC-06 | Herstart verliest geen geaccepteerde overdracht                                       | integratie: duurzame opslag                  |
| AC-07 | Drie fouten vereisen interventie                                                      | domein: retry/backoff                        |
| AC-08 | Modelweigering, incomplete output en gefabriceerde bron worden afgewezen              | domein + AI-contracttests                    |
| AC-09 | UI bewaart status bij herladen, reset herstelt seed, mobiel werkt                     | browser: workflow/tour/375px                 |
| AC-10 | Geen e-mailtransport beschikbaar                                                      | geen mailadapter; server test `sentEmails=0` |

## Aanvullend bewijs in v1.1

| Onderwerp                       | Code                                                                      | Verificatie                                                               |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Ontvangst vóór provider-I/O     | [inbox](server/inbox.ts), [worker](server/analysis-worker.ts)             | restart, outage, stale worker, twee verbindingen                          |
| Functiescheiding                | [auth](server/auth.ts), [API](server/app.ts)                              | reader/reviewer/operator krijgen 403 buiten hun rol                       |
| Herstel en bron opnieuw toetsen | [domein](src/domain.ts), [Store](server/store.ts)                         | foutgeschiedenis blijft, verkocht pand blokkeert                          |
| Reproduceerbare afweging        | [senior review](docs/senior-review.md), [drill](scripts/failure-drill.ts) | `npm run drill`, CI-artifact                                              |
| Kritische evaluatie             | [rapport](data/evaluation-report.json)                                    | 16/16 regressiecases na taalherkenningsfix; geen onafhankelijke benchmark |

## Dify operationeel in v2.1

Drie apps, native schema-output, Python-broncontrole en onafhankelijke TypeScript-validatie. [Importeerbare DSL](dify/apps/lead-intake.yml), [werkbank](src/components/DifyWorkbench.tsx), [live fixtures en run-ID’s](public/dify/evidence.json), [volledige HTTP-keten](public/dify/local-verification.json) en [installatie met screenshots](docs/dify-integration.md). De echte CRM-koppeling en productiehosting blijven buiten scope.

## Overdraagbaarheid en controle in v2.2

[Centraal beheerde canvasgids](dify/canvas/guide.json) → [DSL-generator](scripts/dify/canvas.ts) → drie importeerbare apps én [interactieve site-uitleg](src/components/DifyFlowGuide.tsx). De tests controleren de aansluiting op uitvoerbare nodes, geldige notities zonder uitvoeringsverbindingen en het ontbreken van overlappende notitiepanelen. [Senior review met demonstratievragen](docs/dify-canvas-review.md). De onafhankelijke documentguard vult onbevestigde basisvelden aan, ook als het model die niet meldt.

## Native Agent en beeldkwaliteit (v2.3.0)

[Onderzoek en functiematrix](docs/dify-agent-review.md) → [daadwerkelijk geüploade skill](dify/agent/catalog-compare.skill.zip) → [gepubliceerde Agent-workflow](dify/agent/live-workflow-export.yml) → [echte lokale API-run](data/agent/local-api-proof.json). De Python- en TypeScript-guards wijzen gewijzigde prijzen, bronnen, criteria, verkochte voorstellen en ontbrekende matches af. Een eerste contractfout is bewaard als regressiecontext; de guard is niet versoepeld.

54 automatische unit/integratietests en 11 browsertests controleren de huidige versie. De beeldviewer toont het volledige opnieuw opgenomen dossiercanvas, ondersteunt zoom, toetsenbordsluiting en focusterugkeer; de favicon werkt onder het GitHub Pages-basispath. Desktop (1536×1050) en mobiel (375×812) zijn gecontroleerd zonder app-consolefouten of horizontale overflow. De [vierde flow](public/dify/screenshots/comparison.png) heeft apart runbewijs.
