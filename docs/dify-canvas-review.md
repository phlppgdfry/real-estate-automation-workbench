# Een Dify-canvas dat een collega kan overnemen

De oorspronkelijke drie flows zijn tevens een overdraagbaar technisch dossier. De notities zitten **in de importeerbare DSL** en verschijnen dus ook in je eigen Dify Studio, zoals bij de officiële leersjablonen. De Lexical-notitiestructuur is gebaseerd op een echte Dify 0.7.0-template-export; de eigen inhoud staat centraal in [guide.json](../dify/canvas/guide.json).

## Lees de flow in drie minuten

1. **Blauw bovenaan:** het procesprobleem en het beoogde resultaat.
2. **Paars bovenaan:** welke gegevens de provider krijgt en waar de verantwoordelijkheid ligt.
3. **Uitvoerbare nodes:** lees van links naar rechts. Elk node heeft een eigen beschrijving; klik voor de echte configuratie.
4. **Uitleg onder de nodes:** invoer, begrensde modeltaak en onafhankelijke controle.
5. **Onderaan:** testvoorbeelden met verwachte uitkomst en het fout-/beheerpad.

Notities zijn documentatie. Ze hebben geen uitvoeringsverbindingen en bepalen geen permissies. De Python-code, TypeScript-validatie, authenticatie en domeinregels blijven de daadwerkelijke controles.

## Kies een bewuste afweging

| Vraag                                       | Keuze                                                                                           | Gevolg / resterende grens                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Waarom drie kleine apps?                    | Extractie, dossieruitleg en documentvoorbereiding hebben een eigen invoer- en uitvoercontract.  | Je kunt wijzigingen en fouten per taak onderzoeken; drie app-sleutels beheren.                                      |
| Waarom geen schrijvende agent?              | Een LLM stelt voor; een medewerker beslist; de outbox voert uit.                                | Minder autonomie, wel een duidelijke bevoegdheidsgrens. De CRM-adapter blijft een lokale mock.                      |
| Waarom geen dossiergeheugen in de Chatflow? | De server levert per vraag een minimale actuele context en start een nieuwe conversatie.        | Geen ongecontroleerde context tussen dossiers; de gesprekservaring is bewust begrensd.                              |
| Waarom citaten én onafhankelijke validatie? | Modeloutput en native JSON-schema's zijn geen garantie op brongetrouwheid.                      | Exacte citaten bewijzen geen correcte interpretatie of volledigheid.                                                |
| Waarom velden buiten het model aanvullen?   | Code markeert elk basisveld zonder gevalideerd citaat als onbevestigd.                          | Een gedeeltelijke extractie presenteert zich niet ongemerkt als volledig; een mens controleert de bron.             |
| Waarom een aparte procedureroute?           | Interne procedures hebben een beheerde NL/FR-bronverzameling; actuele pandfeiten blijven apart. | Native trefwoordretrieval met metadatafilters en canonieke broncontrole; geen claim over semantische zoekkwaliteit. |

## Concreet beoordelen tijdens een gesprek

- Laat de auteur één citaat vervalsen en toon dat de guard de uitvoer weigert.
- Laat het model `missing_fields: []` geven bij een fiche met alleen referentie. Toon dat prijs, gemeente en status alsnog als onbevestigd verschijnen.
- Toon waar een klantbericht eindigt en waar vertrouwde catalogusfeiten beginnen.
- Toon waarom een verkocht pand niet kan worden goedgekeurd, ook wanneer het model een bezoek herkent.
- Leg uit hoe een providerstoring de inbox bewaart en waarom een los werkbankvoorbeeld geen dossier opslaat.
- Wijzig één notitie in de centrale gids, voer `npm run dify:sync` uit en toon dat de importeerbare flow de wijziging bevat.

## Bewijs en onderhoud

[Studio-canvas aanvraaganalyse](../public/dify/screenshots/lead.png) · [dossierassistent](../public/dify/screenshots/assistant.png) · [documentcontrole](../public/dify/screenshots/document.png).

De afzonderlijke echte runs blijven zichtbaar: [aanvraag](../public/dify/screenshots/lead-run.png), [dossieradvies](../public/dify/screenshots/assistant-run.png), [document](../public/dify/screenshots/document-run.png). Screenshots tonen de editor; [live API-bewijs](../public/dify/evidence.json) bevat de daadwerkelijke uitvoer, runmetadata en SHA-256 van de bijbehorende DSL.

De site biedt dezelfde uitleg stap voor stap, leesbaar op mobiel. Een testscenario in de gids is een acceptatiecriterium; het is pas live getest wanneer het als uitgevoerde case in het bewijsbestand staat. De [deterministische regressietests](../tests/dify-operations.test.ts) toetsen daarnaast broncontrole, volledigheid, DSL-inhoud en roltoegang.

Bij een wijziging: bronbestanden aanpassen → `npm run dify:sync` → `npm run check` en browsertests → bestaande apps bijwerken via Import DSL → preview testen → Publish Update → `npm run dify:smoke` → screenshots actualiseren. Bewaar bestaande app-sleutels lokaal; er is geen nieuwe sleutel nodig voor deze update.

De DSL-fingerprint identificeert het lokale importbestand dat voor de test is gebruikt; het is geen cryptografische attestatie van de provider. Dify-runtime-ID’s en echte resultaatcapturen vormen het aanvullende bewijs. De [visuele QA](../design/QA.md) beschrijft viewport, consolecontrole, interacties en resterende testgrenzen.

De vierde toepassing voegt een native Agent met een echte Python-skill toe voor een afzonderlijke catalogustaak. Zie de [onderzoeks- en overdrachtsgids](dify-agent-review.md) voor de functiematrix, beta-beperkingen, de zeven gelijke live- en importkaarten en het echte API-bewijs. De dossierassistent heeft daarnaast een gepubliceerde proceduretak zonder LLM. De nieuwe canvasexport toont die tak; de oudere modelrun toont dossieradvies. De [configuratievergelijking](../public/dify/canvas-verification.json), [Knowledge API-controle](../public/dify/knowledge-verification.json) en [quotumblokkade van de volledige chatflow](../public/dify/procedure-flow-verification.json) hebben elk hun eigen bewijsbereik.
