# Dify: vier werkende toepassingen

De werkbank bevat aanvraaganalyse, een dossierassistent, documentcontrole en een native Agent-pandvergelijker. Voor de vierde toepassing zijn een native Agent, een skillpakket en een Workflow nodig. Ze zijn met fictieve gegevens in Dify Cloud Studio getest. De broncode, prompts, schema's en echte screenshots staan in deze repository. De publieke website toont opgeslagen runbewijs; nieuwe modelruns lopen via de lokale, geauthenticeerde server.

| Toepassing       | Directe waarde                                                                                              | Bron                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Aanvraaganalyse  | Herkent ook formuleringen zoals “waardebepaling” die de kleine regelbaseline mist; levert letterlijk bewijs | [Workflow DSL](../dify/apps/lead-intake.yml)          |
| Dossierassistent | Legt blokkades uit vanuit aangeleverde statusfeiten en stelt een volgende stap voor                         | [Chatflow DSL](../dify/apps/operations-assistant.yml) |
| Documentcontrole | Zet tekst om in controleerbare pandgegevens met exacte bronpassages en ontbrekende velden                   | [Workflow DSL](../dify/apps/document-review.yml)      |

| Agentvergelijking | Vergelijkt fictieve panden met expliciete criteria en onafhankelijke broncontrole | [Agent-handleiding](dify-agent-review.md) |

## Leesbare canvassen

Elke canonieke import-DSL bevat zeven gekleurde notitiepanelen en een beschrijving per uitvoerbare stap. Die uitleg reist mee met de importeerbare DSL. De vierde live flow bevat twee handmatig geplaatste overzichtskaarten; de uitgebreidere importvariant bevat zeven kaarten. Een app-limiet blokkeerde herimport in deze workspace; de uitvoerbare code is exact gelijk en getest. De site biedt dezelfde inhoud als klikbare stappen met invoer, uitvoer, controlepunt, gegevensgrens, eigenaar en testscenario’s. Lees de [canvas-reviewgids](dify-canvas-review.md) voor de ontwerpafwegingen en demonstratievragen.

## Starten

```bash
npm ci
npm run setup:local
npm run build
# Vul de app-sleutels in .env.local in (nooit committen).
npm run dify:doctor
npm run dify:smoke
npm run server
# In een tweede terminal, na het starten van de server:
npm run dify:verify-local
```

Open `http://127.0.0.1:4318/real-estate-automation-workbench/` en kies **Dify werkbank**. Gebruik de reviewer-token uit je lokale `.env.local`. Het veld is afgeschermd; de token blijft alleen in het geheugen van het tabblad en wordt niet in browseropslag bewaard. Het bestaande Aanvragen-scherm blijft een aparte browsersimulatie. Dossieradvies gebruikt een dossier-ID uit de **lokale API**; voer eerst `npm run demo:api` uit en gebruik een ID uit de uitvoer, of vraag `/api/leads` op met je reader-token.

De server bindt alleen aan localhost. Dit is een lokale portfolio-opstelling, geen productiehosting of organisatiebrede authenticatie. Start de gebouwde website via dezelfde server voor live requests; `npm run dev` heeft geen API-proxy.

```dotenv
DIFY_WORKFLOW_API_KEY=app-...
DIFY_AGENT_API_KEY=app-...
DIFY_DOCUMENT_API_KEY=app-...
DIFY_COMPARISON_API_KEY=app-...
DIFY_API_BASE_URL=https://api.dify.ai
DIFY_WORKFLOW_USER=duin-dorp-local
```

Dit zijn vier **afzonderlijke app-sleutels**, geen workspace- of CLI-token. De provider krijgt uitsluitend de relevante inhoud; app-sleutels gaan nooit naar de browser. Zonder workflow-sleutel gebruikt de bestaande inbox de regelbaseline (of de afzonderlijk geconfigureerde OpenAI-adapter). De expliciete Dify-endpoints geven bij ontbrekende configuratie 503 en vallen niet stilzwijgend terug.

Voor de native Agent: volg eerst de [afzonderlijke importvolgorde en herstelstappen](dify-agent-review.md). De bestaande smoke-suite test de oorspronkelijke drie apps; de vierde heeft een aparte bewuste betaalde test: `node --import tsx --env-file=.env.local scripts/dify/verify-comparison.ts`. Deze bewaart de andere bewijsgevallen.

## Reproduceren in je eigen Dify-workspace

1. Importeer de oorspronkelijke drie YAML-bestanden uit [`dify/apps`](../dify/apps/lead-intake.yml) via Studio → Create → Import DSL. Getest met DSL-versie 0.7.0 en de OpenAI-plugin 1.0.8. Dify kan bij import om installatie van de modelplugin vragen.
2. Configureer een beschikbare `gpt-4o-mini`-provider of pas het model aan. Cloud-credits of eigen providerbudget zijn nodig. De repo bevat geen providercredentials.
3. Test de fictieve voorbeelden en publiceer elke app. Schakel de publieke Web App uit; behoud alleen de Backend Service API. MCP en triggers zijn niet nodig.
4. Maak per app een API-sleutel en plaats die in `.env.local`. Dit bestand is genegeerd; `setup:local` bewaart bestaande waarden en zet rechten op 0600.
5. Voer de doctor en smoke-suite hierboven uit. De smoke-suite maakt echte, betaalde modelrequests en vervangt [`public/dify/evidence.json`](../public/dify/evidence.json) met alleen de ingebouwde fictieve fixtures en veilige metadata.

`difyctl` is niet nodig. De geïnstalleerde CLI kreeg voor deze Cloud-workspace HTTP 404 op zijn catalogusendpoint; daarom zijn import en publicatie via de echte Studio uitgevoerd. Er staan geen onbewezen CLI-runcommando's in dit stappenplan.

## Wat de lokale API doet

Alle routes vereisen een Bearer-token; alleen een reviewer mag modelruns aanvragen. Een reader mag configuratiebeschikbaarheid lezen. Deze routes wijzigen geen dossier, outbox of CRM.

| Route                     | Invoer                               | Resultaat                                          |
| ------------------------- | ------------------------------------ | -------------------------------------------------- |
| GET `/api/dify/status`    | —                                    | Vier beschikbaarheidsvlaggen, nooit sleutels       |
| POST `/api/dify/analyse`  | `{ "message": "…" }`                 | Intentie, referentie, broncitaat en runmetadata    |
| POST `/api/dify/assist`   | `{ "leadId": "…", "question": "…" }` | Voorstel met exacte verwijzingen naar serverfeiten |
| POST `/api/dify/document` | `{ "text": "…" }`                    | Gegevens met broncitaten en geminimaliseerde bron  |

Documentcontrole ondersteunt geplakte tekst, TXT en Markdown; maximaal 12.000 tekens en voor de browserupload 12 kB. PDF, OCR, URL-fetching, RAG en juridische volledigheidscontrole zijn niet geïmplementeerd. Het document wordt niet als dossier opgeslagen. Dify kan inhoud en logs bewaren volgens de workspace-instellingen: de lokale minimisatie is geen garantie op verwijdering bij de provider. Gebruik fictieve gegevens voor deze demo.

## Grenzen die in code worden gecontroleerd

Bij documentcontrole wordt de lijst met onbevestigde basisvelden onafhankelijk afgeleid van de gevalideerde citaten. Als het model een veld overslaat en `missing_fields` leeg laat, vult code dit aan. Referentie, prijs, gemeente en status zijn de vier basisvelden; een volledig geciteerde set is nog geen inhoudelijke of juridische volledigheidsverklaring.

- LLM-output gebruikt native structured output; aparte Python-code controleert schema en letterlijke broncitaten. De TypeScript-server valideert opnieuw.
- De verplichte menselijke controle wordt door code toegevoegd, niet door het model bepaald. De assistent heeft geen tools, geheugen tussen dossiers of schrijfrechten.
- Dossiercontext bevat alleen intentie, werkstatus, catalogusstatus en redenen; geen naam, e-mailadres, ruwe aanvraag of vrij auditlog. Een gepseudonimiseerde gebruikers-ID wordt per serverprincipal afgeleid. Elke aanvraag start een nieuwe conversatie.
- Documentcontactdetails worden vóór de provider beperkt met e-mail- en telefoonachtige patronen. Dit is een heuristiek: namen, adressen en alle identificatoren worden niet gegarandeerd verwijderd.
- Providerantwoorden zijn begrensd op 256 KiB; de standaardtimeout is 30 seconden. Alleen blocking JSON wordt ondersteund. Sleutels en ruwe providerfouten verschijnen niet in HTTP-foutmeldingen.
- Onjuiste output geeft een zichtbare 502 zonder dossierwijziging. De bestaande inbox bewaart ontvangst vóór de modelcall en gebruikt zijn aparte herstelproces. De adapter herhaalt zelf geen POST.
- Een exact citaat bewijst alleen herkomst, niet de juistheid van de interpretatie, volledigheid of veiligheid van een voorgestelde stap. Een medewerker controleert dat nog steeds.

## Echt bewijs en regressietests

De [lokale verificatie](../public/dify/local-verification.json) bewijst ook de volledige ondertekende intake met Dify, menselijke goedkeuring en CRM-mock, gevolgd door de drie beveiligde werkbankroutes. `npm run dify:verify-local` maakt daarvoor een nieuw fictief dossier; de modelcalls verbruiken providerbudget.

De kleine [live smoke-suite](../scripts/dify/smoke.ts) test waardebepaling, dossieradvies bij een verkocht pand, de [fictieve pandfiche](../data/dify/fictieve-pandfiche.txt), ontkenning, een verdachte instructie en een onvolledige pandfiche. Bekijk de status per case in het [runbewijs](../public/dify/evidence.json). Dit is geen representatieve nauwkeurigheidsmeting. De deterministische evaluatie in `data/evaluation-report.json` blijft daarvan gescheiden.

De eerste live runs brachten echte incompatibiliteiten aan het licht: een string `"null"`, een optioneel veld als Python `None`, en booleans die de modelconnector anders verwerkte. Native schema-output, expliciete lege-contextafhandeling en een menselijke controle die door code wordt toegevoegd lossen die integratieproblemen op. De guards zijn niet versoepeld om verzonnen bronnen door te laten.

Wijzig prompts/code/schema's in hun bronmappen en voer `npm run dify:sync` uit. De CI controleert dat de code in de importeerbare DSL exact overeenkomt met de geteste Python-bron. De tests controleren ook foutieve citaten, te grote antwoorden, timeout, veilige dossiercontext, contactminimisatie en roltoegang.

![Aanvraagcanvas met uitleg](../public/dify/screenshots/lead.png)

![Dossiercanvas met uitleg](../public/dify/screenshots/assistant.png)

![Documentcanvas met uitleg](../public/dify/screenshots/document.png)

Officiële referenties: [Dify Workflow API](https://docs.dify.ai/en/api-reference/guides/workflow), [Dify Chatflow API](https://docs.dify.ai/en/api-reference/guides/chatflow), [Dify DSL import/export](https://docs.dify.ai/en/use-dify/workspace/app-management).

POST `/api/dify/compare` accepteert `{question, city, maxPrice, minBedrooms}`. Alleen de reviewer mag uitvoeren; er wordt geen dossier gewijzigd. De lokale server gebruikt de vierde app-sleutel, met maximaal 75 seconden providerwachttijd.
