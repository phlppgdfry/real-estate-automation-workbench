# Beheer, privacy en pilot

Voor functioneel eigenaar en beheerder. Dit is een voorbereidingsplan, geen uitgevoerde implementatie of juridische beoordeling.

## Eigenaarschap

Medewerker controleert het antwoord; teamverantwoordelijke beslist over opvolging. Pandbeheerder beheert de catalogus; procesverantwoordelijke beslist over bronkwaliteit. Automation specialist beheert regels/integratie; technisch verantwoordelijke beslist over releases. Privacyverantwoordelijke bereidt grondslag, verwerkers en retentie voor; onderneming beslist. Zaakvoerder beslist over pilot en businesscase.

## Runbook: CRM-overdracht mislukt

1. Detecteer pending/failed/dead, pogingen, wachttijd en correlatie-ID. Er is een lablog, geen externe alertdienst.
2. Bepaal of één of alle opdrachten getroffen zijn. Log geen namen, e-mails of berichttekst in algemene logs.
3. Behoud het event-ID. Een nieuwe ID kan een tweede lead veroorzaken.
4. Controleer oorzaak: foutinjectie; in productie autorisatie, rate limit, timeout, payload of storing.
5. Laat de teamverantwoordelijke persoonlijke opvolging overnemen. Technische storing mag geen verdwenen klantvraag betekenen.
6. Bij onbekende remote uitkomst: zoek eerst in CRM op externe sleutel. Gevonden record afstemmen, afwezige gecontroleerd opnieuw aanbieden. Geen blinde create.
7. Lab: retry na 2/4 seconden; na drie fouten inspectie. Na controle: operator gebruikt `/api/leads/{id}/retry` met actuele versie en herstelreden. Voor mislukte analyse: `/api/inbox/{id}/retry`. Een gewijzigde catalogus blokkeert CRM-herstel. Verwijder geen echte database om een incident te verbergen.
8. Stem goedgekeurde opdrachten, ontvangsten en CRM-records af. Leg impact, eigenaar, herstel en preventie vast.

## Monitoring in productie

Meet ontvangst/geweigerd/duplicaat, oudste pending, analysefouten en inbox-retries, catalogusouderdom, conflicten, dead, correctiepercentage, behandeltijd en persoonlijke responstijd. Gebruik geaggregeerde cijfers en correlatie-ID. Voorstel: dead > 0 naar beheerder; pending > 15 minuten tijdens kantooruren naar teamverantwoordelijke. Dit zijn niet-geïmplementeerde pilotdrempels.

## Gegevens en toegang

Gebruik openbare demo alleen met fictieve data. localStorage is leesbaar voor browsergebruiker en scripts op dezelfde origin. Reset overschrijft demostate; wis sitegegevens voor volledige lokale verwijdering.

Server: aparte reader/reviewer/operator-credentials en centrale functierechten, geen persoonlijke productie-identiteit. Productie vraagt SSO, rollen, TLS, rate limiting, gescheiden credentials en audit per gebruiker. `.env.local` en `var/` zijn genegeerd; lokale secrets 0600. SQLite/back-ups worden niet door de app versleuteld.

Vóór echte data: doel en grondslag, minimale velden, verwerkersafspraken, modelproviderinstellingen, regio, toegang, retentie en verwijdering in bron/CRM/back-up bepalen en testen. Marketingtoestemming apart houden. Vrije tekst kan gevoelige informatie bevatten. `store:false` is geen garantie dat alle providerretentie ontbreekt. Labretentie en wisverzoeken zijn niet automatisch geïmplementeerd; audit in JSON is wijzigbaar.

## Pilot

Eerst nulmeting op representatieve aanvragen, dan schaduwmodus zonder CRM-/klantactie. Daarna één kantoor en één eigenaar met dagelijkse controle van alle overdrachten. Meet actieve minuten inclusief uitzonderingen, persoonlijke responstijd (mediaan/P90, kantooruren), correcties en duplicaten.

Stop bij verkeerde pandinfo, schadelijke duplicaten, onbevoegde toegang of onduidelijke eigenaar; houd bronkanalen open en neem handmatig over. Go/no-go door functioneel eigenaar (kwaliteit), technisch eigenaar (toegang/herstel) en zaakvoerder (waarde). Nulmeting en pilot zijn niet uitgevoerd; er zijn geen gerealiseerde besparingen.

## Back-up en herstel

Stop de lab-API vóór een kopie van `var/`, zodat database en WAL consistent meegenomen worden. Herstel in aparte map; controleer leads, outbox en receipts met fictieve data. Productie vraagt online back-ups, hersteltest en RPO/RTO-afspraak. Catalogusouderdom: `var/catalog.json` moet door de bron vernieuwd worden; tijdstempel mag niet kunstmatig worden ververst zonder broncontrole.

Vorige: [keuzes](decisions.md). Volgende: [handleiding](user-guide.md).

## Duurzame inbox en workerherstel

De bron ontvangt 202 zodra de gevalideerde aanvraag duurzaam is opgeslagen. Een AI-storing blokkeert analyse, niet de ontvangst. Controleer `/api/operations` en het receipt via `/api/inbox/{id}`. Een operator start een begrensde batch via `/api/inbox/process`; dit is in het lab een handmatige trigger.

Workers claimen met lease en unieke token. Na 30 seconden kan een andere worker overnemen; de oude worker kan niets meer committen. Een retry vraagt de actuele receiptversie, niet alleen het aantal pogingen (dat kan na een herstelcyclus opnieuw drie zijn). Terminale analyses krijgen maximaal drie pogingen vóór operatorherstel. Herstel krijgt een actor, reden en tijd in operations_audit. Meet ook leaseverlies en oudste niet-voltooide ontvangst.

Reproduceer het storingsscenario met `npm run drill`. Het rapport `var/failure-drill.json` bevat alleen scenario-uitkomsten en wordt als CI-bewijs bewaard. Geen klantinhoud of credentials.
