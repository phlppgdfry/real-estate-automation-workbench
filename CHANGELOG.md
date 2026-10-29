# Wijzigingen

## 3.0.0 — Verbonden dossierwerkplek en controleerbare showcase

- Duurzame intake, dossierdocumenten, brongebonden inhoudsreview, expiry, native Human Input-client en afzonderlijke HTTP-testconnector. Nieuwe workspace-API en migraties 4/5.
- Gepubliceerde native proceduretak met NL/FR-filters en onafhankelijke broncontrole; echte Knowledge API-verificatie. Vijfde app met echte geplande modelvrije Schedule Trigger-run, daarna uitgeschakeld.
- Benchmark met identieke criteria, modelvrije vaste workflow en expliciete scheiding tussen lokale uitvoering en niet uitgevoerde Cloud-metingen.
- Meertalige negatiegrenzen hersteld; dagbudgetten volgen Europe/Brussels inclusief DST. Sessiewisseling wist geladen gegevens; documenten en procedures krijgen leesbare resultaten.
- Extra documentreview- en browseracceptatie, schone-installatierunner met echte HTTP-demo, bronpakket met commit/bestandschecksums, gepinde officiële CI-actions en repo-scan.
- README, bewijsmatrix, startgids, Engelse reviewroute en statusweergave gelijkgetrokken. Modelbudget, menselijke labels en verse Dify-workspace blijven expliciete externe verificatievoorwaarden; geen nieuwe kosten gemaakt.

De oorspronkelijke API-contracten blijven behouden. Major-versie markeert de uitbreiding naar een verbonden dossierwerkplek; bestaande databases migreren atomisch. Labcredentials en lokale configuratie blijven nodig.

## 2.0.0 — Betrouwbaarheid en reviewbewijs

- Duurzame inbox vóór analyse, 202/statusendpoint, begrensde batches, leases en fencing.
- Afzonderlijke lees-, beoordelings- en beheerrechten in de lokale API.
- Gecontroleerde herstart van mislukte analyses en CRM-opdrachten, met reden en audit.
- Versiemigraties, SQL-tellingen en begrensde paginering.
- Drie semantische routingfouten hersteld; diagnostische evaluatie met zichtbare beperkingen.
- Runtime-validatie van browserstate en zichtbaar herstelpad voor de demo.
- Reproduceerbare storingsdrill, onderzoek, reviewroute en expliciete productiegrenzen.

Major-versie wegens een incompatibele API-wijziging: intake geeft een ontvangstbewijs (202 bij pending) in plaats van direct een lead. Start analyse met operatorrechten via `/api/inbox/process`; `APP_TOKEN` wordt niet meer gebruikt. `setup:local` vult de nieuwe rolcredentials aan zonder bestaande waarden te overschrijven.

## 1.0.0

Eerste portfolio-case met fictieve vastgoedaanvragen, gedeelde domeinregels, menselijke goedkeuring, lokale CRM-mock, outbox, tests en Pages-demo.

## 2.1.0 — Dify operationeel

- Drie importeerbare, in Dify Cloud geteste apps: aanvraaganalyse, dossierassistent en tekstuele documentcontrole.
- Native structured output plus geteste Python- en TypeScript-broncontrole; menselijke review wordt door code afgedwongen.
- Geauthenticeerde read-only modelroutes en een lokale werkbank met broncitaten, tekstupload, dossierselectie en veilige sessietokens.
- Vijf echte provider-smoketests en een volledige lokale HTTP-ketentest met Dify, menselijke goedkeuring en CRM-mock; bewijs en echte screenshots in de repo.
- Actuele installatiehandleiding, OpenAPI-contracten, reproduceerbare DSL-synchronisatie en regressietests. Publieke Pages toont vastgelegde runs en bevat geen providersleutels.

## 2.2.0 — Uitlegbare Dify-canvassen

- Zeven echte canvasnotities per app, beschrijvingen per node en een vaste visuele leesrichting; centraal beheerd en importeerbaar.
- Interactieve flow-uitleg op de site met invoer, uitvoer, verantwoordelijkheden, gegevensgrenzen, foutpaden en testvoorbeelden.
- Onbevestigde documentbasisvelden worden onafhankelijk van de modeluitvoer aangevuld; Python en TypeScript gedragen zich gelijk.
- Nieuwe echte canvas- en runscreenshots, uitgebreid live API-bewijs met DSL-fingerprints, senior reviewgids en bijgewerkt importpakket.
- Begrensde CI-looptijd en een afzonderlijke timeout voor browserinstallatie.
- Browservalidatie gebruikt de gedocumenteerde Zod jitless-modus, zodat de lokale CSP behouden blijft zonder eval-waarschuwing; regressietest toegevoegd.

## 2.3.0 — Native Agent en volledige bewijsbeelden

- Native Dify Agent met Build Mode, beoordeelde build note en daadwerkelijk geüploade Python-catalogusskill.
- Vierde Workflow met Agent v2-node, expliciete zoekcriteria, onafhankelijke Python-guard en tweede TypeScript-broncontrole; echte geauthenticeerde API-run vastgelegd.
- Foutieve redencodes worden afgewezen; taak verduidelijkt zonder guard te versoepelen. Contract-, bron-, beschikbaarheids- en matchsetregressies toegevoegd.
- Nieuwe vierde werkbanktab, functiematrix, importinstructies met beta-, asset- en app-capaciteitsgrenzen. Oorspronkelijke smoke-suite bewaart het afzonderlijke Agent-bewijs.
- Afgesneden dossierfoto vervangen door een echte volledige capture. Vier canvasbeelden in een toegankelijke viewer met zoom, runwissel, focusgrens en Escape; versiegebonden asset-URL’s en favicon onder het Pages-basispath.
- Screenshots, bewijs, API-contracten en handleidingen bijgewerkt; 54 unit/integratietests en 11 browserflows geslaagd. Recente upstream-taalherkenningsfixes behouden; actuele diagnostische regressiescore 16/16.
