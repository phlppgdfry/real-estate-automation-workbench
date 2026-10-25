# Welke kennis heb je voor dit werk nodig?

Een certificaat kan leren structureren. Zelf kunnen analyseren, bouwen, controleren, uitleggen en beheren is het doel. Deze gids verbindt kennis aan de case.

| Prioriteit | Kennis                            | Zelfstandig kunnen                                                  | Oefenplek                             |
| ---------- | --------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| 1          | Procesanalyse en bedrijfsinzicht  | Bron, eigenaar, overdracht, uitzondering en nulmeting bepalen       | [Case](../CASE_STUDY.md), calculator  |
| 1          | HTTP, REST, JSON en webhooks      | Request maken, statuscodes en herhaalde levering begrijpen          | [API](architecture.md), `demo:api`    |
| 1          | TypeScript of Python en validatie | Kleine app/script bouwen, invoer valideren, fouten testen           | [Domein](../src/domain.ts)            |
| 1          | SQL en transacties                | Unieke sleutel, insert/update, rollback en bron/projectie uitleggen | [Store](../server/store.ts)           |
| 1          | LLM-applicaties                   | Schema, bronbewijs, weigering, privacy, kosten en timeout beheren   | [AI](../server/ai.ts)                 |
| 1          | Betrouwbare workflows             | Idempotentie, outbox, retry, backoff en herstel toepassen           | [Tests](../tests/integration.test.ts) |
| 1          | Toegang en persoonsgegevens       | Secrets server-side, minimale data, rollen en retentie              | [Beheer](operations.md)               |
| 2          | SaaS/CRM-integraties              | OAuth-scopes, rate limits, paginering en veldmapping lezen          | Echte CRM-adapter nog open            |
| 2          | Eén low-code platform             | n8n, Make of Power Automate: credentials, foutpaden, versiebeheer   | Afstemmen op echte omgeving           |
| 2          | Overdracht en communicatie        | Status en verantwoordelijkheid aan collega's uitleggen              | [Handleiding](user-guide.md)          |

## HTTP en authenticatie

Een webhook is een HTTP-verzoek van een bronsysteem. Verloren bevestiging kan tot dezelfde levering leiden. Daarom is één verzoek niet hetzelfde als één unieke aanvraag. Een bearer-token bewijst bezit van een geheim, geen persoonlijke identiteit. HMAC ondertekent timestamp en exacte inhoud. Timestamp begrenst replay; event-ID voorkomt herverwerking. HMAC versleutelt niets, daarvoor is transportbeveiliging nodig.

**Oefening:** verander één byte na ondertekening in `scripts/demo-api.ts`. Verwacht 401 en geen extra record. **Vraag:** wat als dezelfde inhoud met een nieuw event-ID aankomt? Leg ook uit hoe OAuth verschilt van HMAC.

## Validatie en domeinregels

Zod toetst vorm en grenzen. Dat bewijst niet dat een pand bestaat. Domeinregels controleren catalogus en status. Een letterlijk citaat maakt een modelclaim inspecteerbaar maar bewijst geen juiste interpretatie.

**Oefening:** wijzig prijs na analyse en vóór goedkeuring. Voeg zelf een pandstatus “onder optie” toe die handmatige controle vereist, inclusief een test die eerst faalt. **Vraag:** waarom is broncontrole bij ontvangst alleen onvoldoende?

## Transacties en outbox

Een transactie maakt wijzigingen samen zichtbaar of rolt ze samen terug. Goedkeuring zonder outbox kan opvolging verliezen; outbox zonder goedkeuring kan onbedoelde opvolging starten. De test injecteert een echte SQLite-insertfout en controleert rollback.

Een outbox is geen exactly-once netwerkgarantie. Een CRM kan al geschreven hebben terwijl het antwoord verloren gaat. Externe idempotentie of afstemming is nodig.

**Oefening:** voer `demo:api` twee keer uit. Stop de server na goedkeuring maar vóór dispatch en start opnieuw. **Vraag:** wat verandert zodra de mock een echte HTTP-API wordt?

## LLMs en evaluatie

Een LLM levert modeluitvoer; Structured Outputs begrenst JSON, geen waarheid. Tool calling laat een model een functie voorstellen; autorisatie blijft bij de applicatie. Hier zijn daarom geen tools. De extractor heeft drie velden en de antwoordtemplate gebruikt catalogusdata. Weigering of incomplete uitvoer is een expliciet foutpad.

**Oefening:** draai de baseline en voeg vijf ongeziene parafrases, ontkenningen en meertalige vragen toe vóór je de regels bekijkt. Houd een aparte testset over bij promptafstelling. **Vraag:** waarom zegt deze regelbaseline niets over live LLM-nauwkeurigheid?

RAG haalt relevante tekst uit een gecontroleerde bron vóór generatie. Hier is een exacte pandlookup eenvoudiger. MCP is een protocol voor tools/context; het is geen vereiste om deze kleine workflow betrouwbaar te bouwen.

## Retry en beheer

Tijdelijke fouten kunnen retry krijgen; verkeerde payloads vragen correctie. Backoff beperkt herhaalverkeer. Productie vraagt ook jitter, limieten, leases en interventie. Een zichtbare fout zonder eigenaar is geen beheerst proces.

**Oefening:** simuleer drie fouten, zoek het correlatie-ID en beschrijf hoe de klant ondertussen wordt geholpen. **Vraag:** waarom betekent een CRM-timeout een onbekende uitkomst?

## Businesscase en communicatie

Meet inclusief controle, fouten en beheer. Minder benodigde minuten leveren capaciteit op; alleen als kosten echt vervallen of extra werk waarde oplevert wordt het financiële opbrengst. **Oefening:** halveer volume en verdubbel beheerlast. Leg uit of je nog start. Geef een collega in twee minuten uitleg. **Vraag:** wat bewijst “Afgehandeld” wel en niet?

## Zelfstandig eigenaarschap

Leg de keten zonder spiekbrief uit, wijzig een regel met test, diagnoseer een fout en verdedig een alternatief zoals Power Automate of PostgreSQL. Een AI-uitgewerkte case helpt leren maar vervangt dat niet. Modeltraining, zware wiskunde en Kubernetes hebben hier minder prioriteit dan een klein nuttig proces van begin tot beheer kunnen uitvoeren.
