# Verbonden dossierwerkplek

De lokale werkplek verbindt intake, documenten, review en overdracht. De vier Dify-werkbankapps en aparte native trigger hebben afzonderlijk bewijs. De [releasecontrole](release-readiness.md) onderscheidt lokale werking van nog extern te verifiëren modelruns.

## Lokaal starten

```bash
npm ci
npm run setup:local
npm run build
# .env.local: CRM_TEST_URL=http://127.0.0.1:4340
npm run server
# Tweede terminal
node --import tsx scripts/start-crm-test.ts
# Derde terminal: afzonderlijke worker, geen dispatch of verzending
node --import tsx --env-file=.env.local scripts/worker.ts
```

Open `http://127.0.0.1:4318/real-estate-automation-workbench/?view=connected` of kies **Verbonden werkplek**. Gebruik een reader-token voor bekijken, een reviewer-token voor intake/documentcontrole/goedkeuring, en een operator-token voor analysebatches en overdracht. Tokens blijven in het tabbladgeheugen. Deze labrollen zijn geen productie-SSO.

PDF-extractie gebruikt Poppler (`pdftotext`); scan-OCR gebruikt `pdftoppm` en Tesseract. DOCX en EML gebruiken Python 3 met de standaardbibliotheek. Ontbreekt een dependency, dan meldt de installatiecontrole dat; het systeem doet niet alsof een document is uitgelezen. Uploads zijn maximaal 2 MB; tekst maximaal 12.000 tekens. OCR is expliciet en beperkt tot vijf pagina’s met het Engelse OCR-model. Geen echte klantgegevens gebruiken.

## Huidig werkend fundament

- Eén API-werkplek voor duurzame intake, lokale dossiers, documenten, modelruns, broncontrole en dagelijkse opvolging.
- Runhistoriek bewaart status, model, versie, duur en gerapporteerde tokens. Ontbrekend tokenverbruik blijft conservatief gereserveerd. Zonder actuele prijs-/usageverdeling wordt geen eurobedrag verzonnen.
- Inhoudelijke documentcontrole wijzigt de uiteindelijke dossiergoedkeuring niet. Reviewer en operator hebben gescheiden rechten.
- De HTTP-testconnector gebruikt een afzonderlijke lokale netwerkdienst met SQLite. Hij controleert idempotentiesleutel en inhoudshash, stemt onbekende uitkomsten af en respecteert rate limits. Dit is een fictieve testdienst, geen operationeel vastgoed-CRM.
- De intake-extractor heeft 20 seconden providertimeout tegenover de bestaande 30 seconden workerlease: 10 seconden ruimte voor afhandeling en opslag.

## Procedures en runmetadata

Kies Nederlands of Frans en gebruik **Zoek in actuele procedures** voor de lokale canonieke bron. **Zoek via Dify Knowledge** gebruikt de beperkte Knowledge API-sleutel, metadatafilters en onafhankelijke broncontrole. Die route verbruikt geen LLM-tokens. Ontbrekende configuratie of een onzekere providerrespons wordt als fout getoond, zonder ongemerkt naar de lokale route te wisselen.

**Runmetadata downloaden** exporteert uitsluitend operationele metadata. Prompts, documentinhoud, reviewlinks en credentials zijn uitgesloten. Het configureerbare kostenbudget gebruikt gerapporteerde tokens en reserveringen. De prijs per token is een zelf ingestelde bovengrens; onbekend verbruik blijft een reservering, geen bewezen maximum. Een model kan meer tokens gebruiken dan vooraf gereserveerd. Dit is geen harde providerlimiet of factuur. Het dagvenster volgt Europe/Brussels, inclusief zomer- en wintertijd.

De [opname](../public/dify/connected-local-demo.webm) toont duurzame intake, analyse, upload en lokale procedures met de echte lokale API. [Screenshot](../public/dify/screenshots/connected-workspace.png). Dit is geen live Dify-modelbewijs.

## Gecontroleerde overdracht

`npm run verify:install` maakt een geïsoleerde kopie zonder bestaande credentials, database of node_modules. Offline npm-installatie, setup, build, storingsdrill en de echte HTTP-demoketen worden uitgevoerd. Het rapport staat in `var/install-verification.json` en als CI-artifact.

De native Document Extractor en Human Input-client zijn gebouwd. De volledige nieuwe Cloud-bestandsrun en hervatting blijven door het opgebruikte gratis modelquotum geblokkeerd. Lokale protocoltests dekken approve/reject/timeout en onbekende uitkomst; het scherm test ook inhoudelijke correcties en verlopen reviews.

De aparte [native timer](native-trigger.md) heeft werkelijk op een gepland moment uitgevoerd met 0 modeltokens en staat na de test uit. De [vergelijkingsrunner](benchmark.md) werkt standaard zonder netwerk of model. De drie [externe verificatievoorwaarden](release-readiness.md) — modelbudget, menselijke labels en volledig verse Dify-workspace — worden niet stilzwijgend als geslaagd behandeld.
