# Duin & Dorp uitleggen in een gesprek

Zelfgestuurde portfolio-case met fictieve gegevens en AI-assistentie. Gebruik onderstaande routes als voorbereiding; claim alleen kennis en bijdragen die je zelf kunt uitleggen en demonstreren. De [afsluitaudit](release-readiness.md#definitieve-afsluitaudit) beschrijft de technische baseline en grenzen.

## Pitch van dertig seconden

> Duin & Dorp onderzoekt hoe een vastgoedaanvraag gecontroleerd kan worden opgevolgd: één keer ontvangen, het pand en antwoordvoorstel controleren, menselijk goedkeuren en de overdracht bevestigen. De case combineert procesanalyse met een React/TypeScript-demo, een duurzame Node/SQLite-API en Dify-workflows. De implementatie is met AI-assistentie uitgewerkt en heeft reproduceerbare tests en bewijs. Het is een fictief prototype, geen klantimplementatie of gemeten besparingsproject.

## Businessroute van drie minuten

1. **0:00–0:30 — Het probleem.** Leg de [AS-IS](../CASE_STUDY.md) uit: lezen, overtypen, pandinformatie opzoeken en handmatig overdragen. Dit zijn te toetsen werkhypothesen, geen interviews met echte medewerkers.
2. **0:30–1:15 — De voorgestelde werkwijze.** Open [Aanvragen](https://phlppgdfry.github.io/real-estate-automation-workbench/). Wijs de oorspronkelijke vraag, pandstatus en het concept aan. Keur goed: het dossier staat klaar, maar is nog niet overgedragen. Open het verkochte pand en toon waarom goedkeuring blokkeert.
3. **1:15–2:15 — Wat gebeurt bij een storing?** Gebruik **CRM-fout simuleren** en **CRM-wachtrij verwerken**. Toon de fout en de geschiedenis; leg retry en beheerherstel uit. Dit verandert uitsluitend de browsersimulatie, niet een echt CRM. De rondleiding begeleidt deze onderwerpen.
4. **2:15–3:00 — Waarde en grenzen.** Open **Proces & impact**. Bespreek minder herhaalwerk, herleidbare besluiten en herstel als ontwerpdoelen. De calculator gebruikt aannames, geen gemeten ROI. Echte inzet vraagt een gezaghebbende pandbron, leverancierstoegang, identiteitsbeheer en een pilot.

De [video van 76 seconden](https://phlppgdfry.github.io/real-estate-automation-workbench/?view=connected) toont de aparte lokale API-route tot document en NL/FR-broncontrole. Hij toont geen live modelrun, dossiergoedkeuring of volledige overdracht; gebruik daarvoor de interactieve demo en het technische bewijs.

## Technische route van tien minuten

| Tijd     | Toon en leg uit                                                                                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–2 min  | [Architectuur](architecture.md): publieke browseropslag tegenover de aparte lokale API. Gedeelde domeinregels, afzonderlijke opslag en uitvoering.                                                                                                   |
| 2–4 min  | [Inbox](../server/inbox.ts), [worker](../server/analysis-worker.ts) en [Store](../server/store.ts): bevestigen vóór modelwerk, idempotentie, leases/fencing en atomair goedkeuren plus outbox.                                                       |
| 4–6 min  | [AI-grens](ai-operating-model.md), [broncontracten](../src/dify-contracts.ts) en [documentreview](../server/document-review.ts): AI stelt voor; code valideert en een medewerker beslist. Een inhoudsreview keurt het dossier niet automatisch goed. |
| 6–8 min  | [Security](../SECURITY.md), [connector](../server/crm-connector.ts) en [runbook](operations.md): labrollen, actuele versie, onbekende provideruitkomst, reconcile en gecontroleerd herstel.                                                          |
| 8–10 min | [Bewijs](../EVIDENCE.md), tests en [release](https://github.com/phlppgdfry/real-estate-automation-workbench/releases/tag/v3.0.3): onderscheid regelregressies, lokale HTTP-tests, historische Dify-runs en niet-uitgevoerde Cloud-verificatie.       |

Gebruik de bestaande commando's uit [README](../README.md). `npm run check`, `npm run test:e2e`, `npm run drill` en `npm run verify:install` vragen geen betaald model. Start in een gesprek geen Cloud-run om een claim alsnog te bewijzen.

## Twaalf kritische vragen

1. **Waarom deze architectuur?** De publieke demo moet zonder server of account te beoordelen zijn; de aparte API maakt duurzame ontvangst, transacties en herstel toetsbaar. SQLite past bij het lokale lab, niet automatisch bij een organisatiebrede productieopstelling. Zie [ontwerpkeuzes](decisions.md).
2. **Wat doet AI en wat beslist de code?** AI kan intentie of documentfeiten voorstellen. Schema, letterlijke herkomst, catalogusstatus en rechten worden daarna gecontroleerd; de antwoordtemplate gebruikt catalogusfeiten. Een exact citaat bewijst geen correcte interpretatie.
3. **Waarom menselijke goedkeuring?** Een vastgoedantwoord kan een onjuiste belofte bevatten. De medewerker beoordeelt vóór overdracht; documentreview en dossiergoedkeuring zijn verschillende handelingen.
4. **Wat als de modelprovider uitvalt?** Een geldige aanvraag is al duurzaam ontvangen. Analyse kan met begrensde retry worden hervat; een verlopen workerlease mag geen resultaat meer committen. De [storingsdrill](../scripts/failure-drill.ts) maakt dit lokaal zichtbaar.
5. **Hoe voorkom je dubbele verwerking?** Event-ID en inhoudsfingerprint maken herlevering herkenbaar; afwijkende inhoud met dezelfde ID wordt geweigerd. De HTTP-testconnector gebruikt daarnaast een remote idempotentiesleutel en inhoudshash. Dat is geen universele exactly-once-garantie voor modelaanroepen.
6. **Wat als een externe write slaagt maar het antwoord verloren gaat?** De connector behandelt de uitkomst als onbekend en zoekt eerst het remote ontvangstbewijs op. De herstarttest simuleert juist die commit-disconnect. Dit is een afzonderlijke lokale testdienst, geen leveranciers-CRM.
7. **Hoe ga je om met prompt injection?** De extractor heeft geen schrijvende tools en onbetrouwbare tekst geeft geen extra bevoegdheid. Deterministische bron-/beleidscontrole en menselijke beoordeling beperken gevolgen; patroonherkenning detecteert niet elke aanval.
8. **Welke beveiliging ontbreekt voor productie?** De labtokens zijn geen SSO of object-/tenantautorisatie. Ook retentie, versleuteling, parserisolatie, rate limits, restore en leveranciersafspraken vragen een echt implementatieontwerp. De repo claimt geen securitycertificering.
9. **Hoe is AI-gegenereerde code gevalideerd?** De repo bevat regressies voor domeingrenzen, rollen, herstart, concurrency, vervalste bronnen, reviewversies en onbekende netwerkuitkomsten, plus browseracceptatie en CI. Tests bewijzen hun onderzochte gedrag; ze vervangen geen eigen uitleg of onafhankelijke modelbenchmark.
10. **Wat is echt in Dify uitgevoerd?** Bewijs is vastgelegd voor gespecialiseerde runs, de native Agent, Knowledge API en een modelvrije geplande trigger. Nieuwe Cloud-bestandsruns, Human Input-hervatting en de nieuwe Cloud-benchmark blijven apart als niet uitgevoerd gemarkeerd. De trigger staat na de test uit volgens het vastgelegde bewijs.
11. **Hoe zou je businesswaarde meten?** Begin met een nulmeting en schaduwpilot: actieve behandeltijd inclusief controle, responstijd, correcties, duplicaten en overdrachtsfouten. Potentiële capaciteit uit de calculator is geen cashbesparing of bewezen effect.
12. **Wat was jouw bijdrage en waar hielp AI?** Benoem concreet welke procesanalyse, eisen, ontwerpkeuzes, implementatie- en reviewstappen je zelf kunt verdedigen. Wijs bij uitleg naar code en uitgevoerde tests; laat ook zien waar AI hielp. Claim geen onafhankelijke handmatige implementatie of werkgeverervaring die de repo niet kan aantonen.

Stop na de afgesproken route. Voor een verdiepende technische beoordeling bestaat al [de reviewgids](reviewer-guide.md); er is geen extra feature nodig om dit verhaal overtuigend te maken.
