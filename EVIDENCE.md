# Van functie-eis naar bewijs

Open de code en voer de tests uit. Een uitgewerkt project bewijst nog geen zelfstandige beheersing: laat de auteur het uitleggen en aanpassen.

| Vaardigheid                      | Concreet bewijs                                                 | Demo / controle                 | Grens                                           |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| Procesanalyse en bedrijfsinzicht | [AS-IS, TO-BE, KPI's](CASE_STUDY.md)                            | Proces & impact, tour 1/7       | Werkhypothese; geen echte workshop              |
| API's en systeemintegraties      | [API](server/app.ts), [contract](docs/openapi.json)             | Technisch dossier, HTTP-tests   | Lokale mock, geen echte CRM-credentials         |
| LLMs praktisch toepassen         | [Extractor](server/ai.ts), [regels](src/domain.ts)              | Broncitaat, tour 2/3            | Contracttests; live modelkwaliteit niet gemeten |
| Workflow en foutafhandeling      | [Outbox](server/store.ts)                                       | Fout simuleren, tour 4/5        | Eén lokale worker; geen netwerkgarantie         |
| Database en gegevensvalidatie    | [Store](server/store.ts), [schema](src/domain.ts)               | Rollback-/restarttests          | Geen productiecluster of migratieplatform       |
| Scripts en eigen toepassingen    | [React](src/App.tsx), [API-demo](scripts/demo-api.ts)           | Nieuwe aanvraag, filter, reset  | Browser en API zijn aparte adapters             |
| Testen, verbeteren, documenteren | [Tests](tests/domain.test.ts), [evaluatie](scripts/evaluate.ts) | Uitzonderingen, tour 6          | Handgeschreven kleine fixturebaseline           |
| Medewerkers en beheer meenemen   | [Handleiding](docs/user-guide.md), [pilot](docs/operations.md)  | Calculator en gebeurtenissenlog | Geen uitgevoerde pilot of gemeten besparing     |

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
