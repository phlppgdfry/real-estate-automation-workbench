# Werkplan v3 — lopende implementatie

Werkstatus, geen releaseclaim. De gebruiker heeft alle tien verbeterpunten, de aanvullende Dify-functies en consistente tags gevraagd. Branch: `feature/connected-operations`. Laatste controle: 28 oktober 2026.

## Uitgevoerd

- Verbonden lokale werkplek met duurzame intake, dossiers, documenten, inhoudelijke review, casegebonden AI-runs, lokale procedures en opvolging. Reviewer/operator blijven gescheiden.
- SQLite-migraties 4 en 5: runs, documenten, reviews, connectorjobs, workflow-events en duurzame bedoelde reviewactie.
- PDF/DOCX/EML/TXT/MD-extractie; expliciete OCR van maximaal vijf pagina’s met Engels model. Validatiefouten, ontbrekende tools en parserlimieten krijgen afzonderlijke veilige fouten.
- Documentcorrecties met onafhankelijke citaatcontrole. Verlopen beoordelingen maken heranalyse mogelijk. Een `needs_ocr`-document kan opnieuw met OCR worden aangeboden.
- HTTP-testconnector met afzonderlijke SQLite-dienst: hash/idempotentie, rate limit, onbekende uitkomst en ontvangst. Test sluit de lokale database echt af en opent die opnieuw na een remote commit-disconnect.
- Intake-Dify-timeout 20s versus workerlease 30s. Lokale periodieke worker met begrensde requests, Brussels kalenderdag en `--once`.
- Tokenreserveringen en optioneel geconfigureerd kostenplafond; geen verzonnen tarieven. Metadata-only trace-export.
- Native Documentcontrole gepubliceerd: bestand/tekst, Document Extractor, extract-only, LLM-fouttak, broncontrole en optionele Human Input met approve/reject/timeout. De echte tekstroute slaagde; de echte Human Input-run pauzeerde met een formulier. Hervatten werd geblokkeerd door uitgeput modelquotum.
- Native Human Input-client en lokale reviewer-koppeling gebouwd: SSE, consistente user, server-only form token, één inzending, vergelijking van bedoelde tak en inhoudshash, reconcile van onbekende uitkomst. Tests met gecontroleerde lokale provider slagen; live API-hervatting nog niet bewezen.
- Zeven uitlegkaarten in live Agentvergelijking gepubliceerd; exacte live export en importbron gelijkgetrokken. Nieuwe volledige screenshot opgeslagen.
- Nieuwe Economical-kennisbank `293e6f00-77fc-4ca5-8ace-72d9567b816d`: vijf fictieve documenten, alle vijf `completed` en enabled. Metadata language/state/version gesynchroniseerd. Eén expliciet goedgekeurde sleutel beperkt tot deze kennisbank, uitsluitend in genegeerde `.env.local` (0600).
- Kennisbankinstallatiescript heeft standaard dry run en synchroniseert alleen de vijf bekende bronbestanden. Native retrieval-client past filters toe en weigert onafhankelijk verkeerde taal, verouderde documenten en verzonnen citaten.
- Installatiecontrole slaagt voor Node 24+, Python, Poppler en Tesseract. 68 unit-/integratietests slagen; 12 browseracceptatietests slagen. Build, storingsdrill en OpenAPI-validatie slagen.
- OpenAPI uitgebreid met workspace/document/review/reconcile/knowledge/traces/connector/case-routes.

## Concrete externe toestand

- Dify Sandbox: **200/200 gratis modelcredits opgebruikt**, 0 credits. Service API antwoordt ook voor extract-only met `invalid_param: Model quota has been exceeded`. Geen upgrade, betaling of eigen provider zonder gebruiker.
- De gebruiker is gevraagd zelf provider/credits te regelen of voorlopig lokaal verder te werken; nog geen antwoord op die keuze.
- Kennisbankreindexering en beheerde zoekwoorden zijn voltooid. De echte Knowledge API-verificatie slaagt voor NL, FR en een oude-versiecontrole; bewijs: `public/dify/knowledge-verification.json`. De naam is via de UI bijgewerkt. Dit bewijst de directe Knowledge API-route, nog niet een Knowledge Retrieval-node in een app.
- De originele Text Summarizer is na export en expliciete toestemming verwijderd; vier Studio-apps, één vrij slot. Backup blijft genegeerd lokaal. Werk eerst bestaande apps bij voordat het vijfde triggerslot wordt gebruikt.
- De gebruiker doet evaluatielabelreview later. Geen menselijke labelvalidatie of onafhankelijke benchmark claimen.

## Nog af te werken

1. Knowledge Retrieval-node in bestaande dossierassistent toevoegen met taal/status/versiecontrole. Directe native Knowledge API-route werkt en is ook beschikbaar in de lokale werkplek.
2. Vier Studio-apps hebben consistente tags, na herladen geverifieerd. Vier kennisbanktagdefinities bestaan, maar koppelen via de Cloud-UI blijft niet bewaard; scoped read bevestigt nul koppelingen. Classificatie en beperking: `public/dify/classification.json`. Losse native Agent heeft in deze beta-interface geen tagoptie; naam, rol, beschrijving en vastgoedpictogram zijn gecontroleerd.
3. Documentcanvasbeschrijvingen zijn opnieuw geïmporteerd/gepubliceerd; Dify-checklist zonder fouten. Volledige native PNG-export vervangt de oude documentfoto. Laatste live DSL-export vergelijken.
4. Native bestandsrun en Human Input-approve/reject/timeout live verifiëren zodra quota beschikbaar is. Lokale tests dekken het protocol, niet de Cloud-uitvoering.
5. Driewegs benchmark directe query / vaste Dify-workflow / native Agent met identieke criteria. Geen ingevulde scores zonder echte runs.
6. Afzonderlijke native Schedule/Integration Trigger-app. User Input en Trigger zijn wederzijds exclusief. Eventuele nieuwe externe accounttoegang concreet laten goedkeuren; geen fictieve integratieclaim.
7. Meer reviewer-/timeout-/browseracceptatie; native knowledge en veilige trace-download zijn toegevoegd; componenten waar zinvol verder opdelen.
8. Meertalige evaluaties en eenvoudig menselijk reviewbestand afronden; uitgestelde review blijft zichtbaar.
9. Schone installatie zonder lokale env/data slaagt: npm ci --offline, setup, documenttools, build en storingsdrill. Nieuwe lokale API-screenshots en opname zijn toegevoegd. Verse Dify-import op een lege workspace blijft niet getest.
10. Volledige checks, secret-value scan, checkpoint/PR, CI/merge/release en Pages verifiëren. Checkpoint volgt; nog geen volledige v3-release geclaimd.
