# Native Agent: onderzoek, bewijs en overdracht

De bedrijfswaarde is concreet: een medewerker krijgt alle beschikbare fictieve panden die voldoen aan gemeente, maximumprijs en minimumaantal slaapkamers, inclusief bronvelden en uitsluitingen. De Agent kiest geen klanten, bepaalt geen woonrecht en belooft geen bezoek. Dit is een portfolio-pilot met een vaste verzonnen catalogus, geen vastgoedproductieomgeving.

## Wat daadwerkelijk werkt

- Build Mode heeft de geüploade `catalog-compare`-skill uitgevoerd, de uitkomsten gecontroleerd en `build_note.md` plus een pilot-review gemaakt. De wijzigingen zijn beoordeeld en toegepast.
- De native Agent is gepubliceerd en wordt door een **Agent v2-node** aangeroepen. Geen nieuw LLM-node dat alleen “Agent” heet.
- De skill gebruikt een gebundeld Python-script en zes fictieve bronrecords. Een directe Preview gaf DD-212 en DD-204 correct terug; drie sandboxcommando’s waren zichtbaar en slaagden.
- Workflow: vier verplichte invoervelden → Agent → onafhankelijke Python-guard → resultaat. De lokale API toetst dezelfde bronregels nogmaals in TypeScript.
- De eerste workflowrun is afgewezen op `COMPARISON_FALSE_EXCLUSION`: het model gaf zinnen in plaats van vaste redencodes. De taak is verduidelijkt; de guard is niet afgezwakt. De volgende run slaagde: vier stappen, 20,335 seconden, 18.197 gerapporteerde tokens. Dit is één meting, geen kosten- of latencybenchmark.

Bewijs: [native Preview](../data/agent/native-preview.json), [workflowtest](../data/agent/workflow-preview.json), [lokale API-run](../data/agent/local-api-proof.json), [echte canvasopname](../public/dify/screenshots/comparison.png), [runopname](../public/dify/screenshots/comparison-run.png).

## Gebruikte functies en bewuste keuzes

| Dify-functie                                            | Status                    | Reden                                                                                                                                            |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow, Chatflow, prompts, schema, Code               | Gebruikt                  | Kleine taken met controleerbare invoer en uitvoer.                                                                                               |
| Native Agent, Build Mode, skill, build note, Agent Node | Gebruikt                  | Herbruikbare tooltaak en centrale Agent-configuratie.                                                                                            |
| Logs, Test Run, publicatie, DSL, canvasnotities         | Gebruikt                  | Diagnose, bewijs en overdracht.                                                                                                                  |
| Human Input-node                                        | Niet ingericht            | Goedkeuring staat in de eigen applicatie met reviewerrol, versiecontrole en outbox.                                                              |
| Knowledge Retrieval / RAG                               | Niet ingericht            | Exacte query op zes records past beter. Pas toevoegen voor een beheerde documentencollectie, met bronrechten, verversing en retrieval-evaluatie. |
| MCP, triggers, externe schrijf-tools                    | Uit                       | Er zijn geen echte CRM-contracten, beheerders of operationele rechten geconfigureerd.                                                            |
| Loop, iteration, classifier, spraak                     | Niet nodig voor deze taak | Meer nodes leveren hier geen aangetoonde waarde op.                                                                                              |

Niet alle beschikbare functies gebruiken is een bewuste ontwerpkeuze. Voor een echte invoering ontbreken nog organisatieauthenticatie, tenantisolatie, actuele catalogussynchronisatie, incidentbeheer en productieacceptatie.

## Importeren zonder verborgen afhankelijkheden

1. Bewaar de bestaande drie werkende apps. Zorg voor voldoende app-capaciteit; koop niet automatisch een upgrade en verwijder geen bestaande templates om deze demo te installeren.
2. Importeer [native-agent.yml](../dify/agent/native-agent.yml) als native Agent. Selecteer een ondersteund model; de geteste Cloud-configuratie gebruikte `gpt-5.6-luna`.
3. Upload het **daadwerkelijk gebruikte** [skillpakket](../dify/agent/catalog-compare.skill.zip). De [bronbestanden](../dify/agent/skills/catalog-compare/SKILL.md) blijven inspecteerbaar. Het SHA-256 van de originele geüploade zip is `ed318aaa968ef51f2db943c8fedc70898c17b99dee89a337a38cd6d4fc97c428`. Het `hash`-veld in Dify’s `omitted_assets` is een andere assetreferentie; gebruik dat niet als checksum van deze zip.
4. Controleer de prompt, de skill en de fictieve catalogus. De DSL-export bevat `is_missing`-verwijzingen: skill- en bestandsbytes worden niet mee geëxporteerd. Maak desgewenst een eigen pilot-review; het oorspronkelijke bestand is geen uitvoerafhankelijkheid. `config_note` bevat de geëxporteerde build-context.
5. Publiceer de Agent. Schakel de native publieke webapp en directe service-API uit; de Agent heeft hier geen eigen API-sleutel.
6. Importeer [agent-comparison.yml](../dify/apps/agent-comparison.yml). Een import kan de ingebedde Agent als kopie behandelen. Gebruik **Wijzigen** in de Agent-node om de juiste gepubliceerde Agent met geüploade skill te selecteren en controleer dit vóór uitvoering. Bij app-limiet: stop de import; werk een bestaande eigen draft af in de UI, of gebruik een workspace met beschikbare capaciteit. De originele live flow is zo afgewerkt, zonder upgrade of verwijdering van andere apps.
7. Controleer Start → Agent → Code → Output. Test Oudenburg / 390000 / 3: opties DD-212 en DD-204; DD-223 uitsluiting `bedrooms`. Test ook een lege matchset en ongeldige uitvoer. Publiceer de Workflow, schakel de publieke Web App uit en behoud alleen de benodigde Backend Service API.
8. Maak één Workflow-appsleutel en bewaar hem lokaal als `DIFY_COMPARISON_API_KEY` in de genegeerde `.env.local`. `setup:local` zet bestandsrechten 0600. Start de gebouwde site via `npm run server` en gebruik de reviewer-token in de vierde tab.

De [live export](../dify/agent/live-workflow-export.yml) en de canonieke importvariant bewaren dezelfde werkelijke node-ID’s, zeven live uitlegkaarten en dezelfde canvasgeometrie. De vijf ontbrekende kaarten zijn op 27 oktober 2026 toegevoegd en gepubliceerd. Tests controleren broncode, beschrijvingen en kaartoverlap. De [bijgewerkte screenshot](../public/dify/screenshots/comparison.png) toont het volledige canvas. De uitvoeringstaak en criteria zijn behouden.

## Onafhankelijke controle en resterende risico’s

`validate_comparison.py` en `validateComparison` vertrouwen niet op “workflow succeeded”. Ze toetsen exacte prijzen, status, slaapkamers, brontitels, bron-ID’s, ongewijzigde criteria, unieke verwijzingen en **alle** beschikbare matches. Het model mag geen maximumprijs oprekken of een verkocht pand voorstellen. De vrije samenvatting vraagt nog steeds menselijke interpretatie.

De Linux-sandbox kan commando’s uitvoeren. “Geen business-tools ingesteld” is dus geen harde beperking tot alleen-lezen toegang. De skill heeft zelf geen netwerk- of schrijflogica; de geobserveerde runtime haalde de skill via Dify op. Deze pilot bevat geen echte bedrijfscredentials, persoonsgegevens of externe actiekoppelingen. Er is geen universele prompt-injectiebestendigheid bewezen.

Native Agents en Agent Node zijn beta. Het gekozen model kan veel tokens gebruiken; limieten en accountcredits moeten vóór extra live tests worden gecontroleerd. De deterministische tests gebruiken geen modelbudget. Een centrale Agent-update kan de workflowuitkomst wijzigen: herhaal contracttests en een gerichte live acceptatietest vóór publicatie.

## Primaire bronnen

Onderzocht op 27 oktober 2026, eerst met Context7, daarna officiële Dify-documentatie en publieke broncode:

- [Native Agent en Build Mode](https://docs.dify.ai/en/cloud/use-dify/build/new-agent/build): bouwen met een gesprek, wijzigingen toepassen en context bewaren.
- [Native Agent-overzicht](https://docs.dify.ai/en/cloud/use-dify/build/new-agent/overview): sandbox en skills.
- [Agent Node](https://docs.dify.ai/en/cloud/use-dify/nodes/agent): gepubliceerde Agent uitnodigen, standaard `text`-uitvoer; upstream-variabeletekst is beperkt tot 2.000 tekens. Deze flow beperkt de vraag tot 1.000 tekens en geeft criteria apart mee.
- [Workflow-tutorial](https://docs.dify.ai/en/learn/tutorials/workflow-101/lesson-08): hergebruik van de Agent en ontbrekende assets bij DSL-export.
- [Publieke Agent v2-types](https://github.com/langgenius/dify/blob/cd7ed2c16073e3e6a7e34fde5d5fb9d9ee31f9f3/web/app/components/workflow/nodes/agent-v2/types.ts): `roster_agent` verwijst naar een bestaande `agent_id`. Dit onderzocht ik om een duplicaat te vermijden; de Cloud-import bleef op app-capaciteit blokkeren.

![Werkelijke native Agent-preview met skillgebruik](../public/dify/screenshots/native-agent.png)

![Gecontroleerde vergelijking in de werkbank](../public/dify/screenshots/comparison-workbench.png)
