# Senior review — v1.0 naar v2.0

Deze review beoordeelt controleerbaar gedrag, afwegingen en grenzen. Een repo wordt niet senior door meer frameworks; een portfolio-case bewijst bovendien nog geen senior werkervaring van de auteur.

## Bevindingen en uitgevoerde verbeteringen

| Prioriteit | v1.0-bevinding                                           | v2.0-verandering                                                    | Uitvoerbaar bewijs                                |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| Hoog       | Providerstoring vóór opslag; bron moet opnieuw aanbieden | Eerst duurzame inbox + 202, daarna analyse                          | `reliability.test.ts`: restart en provider outage |
| Hoog       | Eén token mag goedkeuren én beheer uitvoeren             | Centrale default-deny functiescheiding met drie labrollen           | HTTP-403-tests voor reader/reviewer/operator      |
| Hoog       | Geen herstelpad na drie overdrachtsfouten                | Herstel met versie, verplichte reden, audit en actuele pandcontrole | CRM dead-letter recovery test + browserflow       |
| Hoog       | Workercrash/laat resultaat niet gemodelleerd             | Lease-token, vervaltijd, fencing en atomische completion            | Twee databaseverbindingen en oude worker-test     |
| Middel     | Ongestructureerde initiële database-aanmaak              | Atomische versie-migraties met behoud van v1-data                   | Legacy/future schema-test                         |
| Middel     | Duplicaatcontrole en telling laden alle leads            | Directe sleutelquery, SQL-count en begrensde keyset-paginering      | Paginering met tussentijdse insert                |
| Middel     | 24 eigen ontwikkelvoorbeelden als hoofdscore             | Afzonderlijke diagnostische set, missers, hashes en rapport in UI   | [Evaluatiemethode](evaluation.md)                 |
| Middel     | Browserstate wordt slechts oppervlakkig gecontroleerd    | Volledig runtime-schema; corrupte state herstelt naar seed          | Browser-regressietest                             |
| Portfolio  | Veel beschrijving, weinig herstelbewijs voor reviewer    | Eén uitvoerbaar storingsscenario en technische leesroute            | `npm run drill`, [reviewroute](reviewer-guide.md) |

## Onderzoek en ontwerpafweging

Microsofts [Asynchronous Request-Reply](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply) beschrijft snelle acceptatie, een statuslocatie en achtergrondverwerking. Dat ondersteunt de keuze om ontvangst en modelbeschikbaarheid los te koppelen. Deze repo gebruikt lokale SQLite en een handmatig getriggerde batch, geen Azure-deployment.

AWS' [transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) benadrukt de dual-writegrens, rollback en mogelijke duplicaten. De mock toont de lokale transactie; een echt CRM vereist aanvullende remote idempotentie en afstemming.

OWASP [Broken Function Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization/) adviseert expliciete rechten per functie en default-deny. Daarom kan de reviewer niet dispatchen en kan de operator niet goedkeuren. Dat is nog geen productie-identiteitsbeheer.

De actuele [Node.js 24 SQLite-documentatie](https://nodejs.org/docs/latest-v24.x/api/sqlite.html) is via Context7 geraadpleegd voor synchrone statements en parameterbinding. De belangrijkste consequentie: nooit een transactie of schrijflock vasthouden tijdens externe AI-I/O.

## Wat ik vóór echte ingebruikname nog zou eisen

1. **Echte CRM-adapter en stagingbewijs.** OAuth/scopes, remote unieke sleutel, rate limits, timeout met onbekende uitkomst, reconcile, contracttest tegen leverancier. Geen fictieve succesclaim.
2. **Identiteit en gegevensbescherming.** SSO, organisatie- en objectrechten, rotatie, TLS, requestlimieten, retentie/verwijdering en hersteltests. Labtokens zijn geen vervanging.
3. **Onafhankelijke AI-evaluatie.** Menselijk gelabelde meertalige testset, live modelkosten/latentie en foutanalyse. De huidige regelset is aantoonbaar beperkt.
4. **Operationele dienst.** Scheduler/workerproces, alerts, dienstverantwoordelijke, herstelprocedure en back-ups met RPO/RTO. De lokale worker en native Dify-timer zijn inmiddels gebouwd en afzonderlijk getest; productiealerts en beheer blijven vereist.
5. **Werkelijke pilot.** Nulmeting en twee weken schaduwmodus; meet actieve behandeltijd inclusief correcties. Geen businessresultaat claimen op basis van de calculator.

Dit zijn de volgende betekenisvolle stappen. Kubernetes, extra agentframeworks, een tweede dashboard of meer certificaten leveren voorlopig minder bewijswaarde op.

## Overdracht en documentdekking in v2.2

De [Dify-canvasreview](dify-canvas-review.md) voegt zichtbaar eigenaarschap, gegevensgrenzen en concrete beoordelingsvragen toe. De toelichting zit in de importeerbare flow en in de site, vanuit dezelfde bron. De documentguard vult niet bevestigde basisvelden onafhankelijk aan; de Python- en TypeScript-tests verifiëren hetzelfde gedrag. Notities zijn geen uitvoerbare guards en worden niet als beveiligingsbewijs gepresenteerd.

## Showcase-review v3

De nieuwe meertalige set vond ongewenste voorstellen bij ontkende schattings- en zoekvragen; de stopregel omvat nu alle ondersteunde taken en NL/FR/EN-negatie. Dagbudgetten volgen de Brussels kalenderdag inclusief DST. Sessiewisseling wist geladen dossierdata; bronresultaten staan leesbaar voor technische JSON. De native timer is echt op de klok uitgevoerd en daarna uitgezet. Een schone-installatie-CLI, expliciete lokale/Cloud-benchmark en [releasecontrole](release-readiness.md) maken de overdracht controleerbaar zonder betaalde provider.
