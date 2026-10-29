# Verbonden dossierwerkplek — implementatie in uitvoering

Deze uitbreiding staat op `feature/connected-operations` en wordt pas als volledige release gepubliceerd na de Dify-integraties, schone installatietest en browseracceptatie.

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

Open `http://127.0.0.1:4318/?view=connected` of kies **Verbonden werkplek**. Gebruik een reader-token voor bekijken, een reviewer-token voor intake/documentcontrole/goedkeuring, en een operator-token voor analysebatches en overdracht. Tokens blijven in het tabbladgeheugen. Deze labrollen zijn geen productie-SSO.

PDF-extractie gebruikt Poppler (`pdftotext`); scan-OCR gebruikt `pdftoppm` en Tesseract. DOCX en EML gebruiken Python 3 met de standaardbibliotheek. Ontbreekt een dependency, dan meldt de installatiecontrole dat; het systeem doet niet alsof een document is uitgelezen. Uploads zijn maximaal 2 MB; tekst maximaal 12.000 tekens. OCR is expliciet en beperkt tot vijf pagina’s met het Engelse OCR-model. Geen echte klantgegevens gebruiken.

## Huidig werkend fundament

- Eén API-werkplek voor duurzame intake, lokale dossiers, documenten, modelruns, broncontrole en dagelijkse opvolging.
- Runhistoriek bewaart status, model, versie, duur en gerapporteerde tokens. Ontbrekend tokenverbruik blijft conservatief gereserveerd. Zonder actuele prijs-/usageverdeling wordt geen eurobedrag verzonnen.
- Inhoudelijke documentcontrole wijzigt de uiteindelijke dossiergoedkeuring niet. Reviewer en operator hebben gescheiden rechten.
- De HTTP-testconnector gebruikt een afzonderlijke lokale netwerkdienst met SQLite. Hij controleert idempotentiesleutel en inhoudshash, stemt onbekende uitkomsten af en respecteert rate limits. Dit is een fictieve testdienst, geen operationeel vastgoed-CRM.
- De intake-extractor heeft 20 seconden providertimeout tegenover de bestaande 30 seconden workerlease: 10 seconden ruimte voor afhandeling en opslag.

## Procedures en runmetadata

Kies Nederlands of Frans en gebruik **Zoek in actuele procedures** voor de lokale canonieke bron. **Zoek via Dify Knowledge** gebruikt de beperkte Knowledge API-sleutel, metadatafilters en onafhankelijke broncontrole. Die route verbruikt geen LLM-tokens. Ontbrekende configuratie of een onzekere providerrespons wordt als fout getoond, zonder ongemerkt naar de lokale route te wisselen.

**Runmetadata downloaden** exporteert uitsluitend operationele metadata. Prompts, documentinhoud, reviewlinks en credentials zijn uitgesloten. Het configureerbare kostenplafond is een conservatieve bovengrens, geen factuur.

De [opname](../public/dify/connected-local-demo.webm) toont duurzame intake, analyse, upload en lokale procedures met de echte lokale API. [Screenshot](../public/dify/screenshots/connected-workspace.png). Dit is geen live Dify-modelbewijs.

## Nog af te werken vóór volledige release

- [ ] Native Dify Document Extractor in de bestandsroute en end-to-end bewijs.
- [ ] Native Human Input koppelen met hervatten, revieweridentiteit en timeout.
- [ ] Dify Knowledge Retrieval met metadatafilters en broncontrole.
- [ ] Dify Schedule/Integration Trigger met een echte toegestane externe aansluiting.
- [ ] Vergelijking directe query / vaste Dify-workflow / native Agent.
- [ ] Externe providertracing alleen indien nodig; metadata-only traces en configureerbare kostenbovengrens zijn gebouwd.
- [ ] Extra browseracceptatie, opname en screenshots.
- [ ] Schone installatie inclusief verse Dify-import testen.
- [ ] Handleidingen, OpenAPI en releasebewijs volledig gelijk trekken.
- [ ] Menselijke review van de evaluatievoorbeelden. De gebruiker doet dit later; nog geen menselijke validatie claimen.

Dify User Input en Trigger-startnodes zijn volgens de huidige documentatie wederzijds exclusief op één canvas. Een afzonderlijke triggerflow vraagt daarom een extra appslot of een uitdrukkelijk gekozen bestaande template. Een lokaal schema is niet hetzelfde als een Dify Schedule Trigger. Na een gecontroleerde backup en expliciete toestemming is uitsluitend de originele standaardtemplate verwijderd. Er is één appslot beschikbaar. Modelruns zijn momenteel door het opgebruikte gratis modelquotum geblokkeerd; geen upgrade of betaling is uitgevoerd. De vijf economische kennisbankdocumenten en NL/FR-filtertests zijn wel via de beperkte Knowledge API-sleutel geverifieerd.
