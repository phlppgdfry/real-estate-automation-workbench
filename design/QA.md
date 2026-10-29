# Ontwerp- en browsercontrole

Referentie: [Image Gen-concept](concept.png), 1536×1024. De uitvoerende agent koos dit ontwerp binnen de vrije ontwerpopdracht; er was geen afzonderlijke gebruikerssignoff. Implementatie: [echte browserrender](../public/preview.png). Beide zijn met `view_image` visueel geïnspecteerd, samen met 1280×800 en 375×812 renders.

Playwright Chromium is gebruikt omdat de Browser-plugin met bijbehorende `browser`-skill in deze sessie niet beschikbaar was. De browserflow test pagina-identiteit, zichtbare hoofdinhoud, runtime-/consolefouten, goedkeuring, CRM-fout en herstel, uitzonderingen, formulier, lokale persistentie, reset, calculator, documentatie, tour, Escape en mobiele overflow.

## Vergelijkingslog

| Punt           | Concept → implementatie                                                       | Controle / besluit                                                                                |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Structuur      | Zijbalk, kop, vier tellers, proceslijn, lijst/detail                          | Behouden; desktop verticale ruimte compacter gemaakt om acties zichtbaar te houden                |
| Palet          | Wit, koele grijstinten, donkere inkt, teal, oranje uitzonderingen             | Tokens vastgelegd in SPEC; geen gradient of beeldoverlay                                          |
| Typografie     | Grote sans kop, compacte leesbare werktekst                                   | Systeemfont in plaats van onbekend conceptfont; geen externe fontverzoeken                        |
| Componenten    | Geen kaartgrid; twee werkpanelen, geselecteerde rij, bron grijs/voorstel teal | Geïmplementeerd; controles en focus zichtbaar                                                     |
| Copy           | Hoofdtitel, navigatie, knoppen, proceslabels                                  | Overgenomen; echte afgeleide tellers gebruiken 2 te beoordelen, geen fictieve 3                   |
| Statuswaarheid | Concept had Noor als afgehandeld ondanks verkocht pand                        | Bewust gecorrigeerd naar handmatig; Milan afgehandeld, Emma in wachtrij                           |
| Brongegevens   | Concept had relatieve tijden en één handmatige tekstweergave                  | Echte seedtimestamps en ongewijzigde bron; initialen automatisch bepaald                          |
| Bediening      | Primaire goedkeuring zichtbaar; gebeurtenissenlog/CRM-tests onder werkplek    | Uitbreiding nodig voor bewijs en foutafhandeling; geen inert decoratief element                   |
| Mobiel         | Concept bevatte geen mobiel scherm                                            | Zelfde tokens, horizontale nav, tellers 2×2, lijst boven detail; geen horizontale pagina-overflow |

De hoofdcopy is vergeleken met de toegestane lijst in [SPEC](SPEC.md). Intentionele toevoegingen: audit, foutinjectie, reset, broncodelink en functionele statusmeldingen. Een decoratief zoekicoon en concepttextuur zijn niet overgenomen; code-native bediening heeft hier voorrang. De hoofdstructuur, kleurverdeling en interacties zijn tegen het ontwerp gecontroleerd; de afwijkingen hierboven zijn expliciet vastgelegd.

De screenshot wordt met `npm run capture` gemaakt. Voor een actuele volledige controle: `npm run check` en `npm run test:e2e`. Live AI, productie-SSO en echte CRM-integratie vallen buiten deze controle.

## v2.0 — gerichte uitbreiding in hetzelfde ontwerp

De hoofdwerkplek behoudt de vastgelegde structuur, kleuren, typografie en hoofdcopy. Toegevoegd binnen bestaande componentfamilies: herstelreden en herstelknop uitsluitend bij een gestopte overdracht; technisch kwaliteitsrapport met echte gegenereerde cijfers. [Technische render](../public/technical-preview.png). Geen nieuw visueel concept nodig voor deze gerichte uitbreiding.

Playwright Chromium, 1536×1024, 1280×800 en 375×812. De actuele desktop- en mobiele screenshots zijn visueel geïnspecteerd; het oorspronkelijke concept en de nieuwe render zijn samen met view_image bekeken. Geen onbedoelde hoofdcopywijziging; de nieuwe technische copy en herstelbediening zijn intentioneel. Vijf browserflows controleren ook drie fouten → herstelreden → succesvolle mock-overdracht en beschadigde browseropslag → bruikbare seed. Geen relevante consolefouten in de hoofdflow. Live backend, echte CRM en live modelkwaliteit worden hiermee niet bewezen.

## Dify v2.2 — canvas en overdracht

De gecontroleerde gebruikersroute is: Dify werkbank → toepassing kiezen → echte opgeslagen run bekijken → verwerkingsstap openen → testscenario bekijken → lokaal een voorbeeld laden. Dify Studio is afzonderlijk met CUA bediend; notities zijn echt geïmporteerd en gepubliceerde API-runs zijn opnieuw uitgevoerd.

Browser-plugin niet beschikbaar; de lokale visuele controle gebruikt de bestaande Playwright-installatie. Omgeving: `http://127.0.0.1:4331/real-estate-automation-workbench/?view=dify&evidence`, desktop 1536×1050 en mobiel 375×812.

| Controle                               | Resultaat                                   | Bewijs                                                                                           |
| -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Juiste pagina en betekenisvolle inhoud | Geslaagd                                    | Titel Duin & Dorp; werkbank, resultaten en stappen zichtbaar                                     |
| Frameworkfouten / console              | Geen appfouten; geen CSP-overtreding        | Parser in gedocumenteerde jitless-modus; scriptbeleid ongewijzigd                                |
| Interactie                             | Geslaagd                                    | Stapkeuze, reset per toepassing, scenario-invoer, veilige sessie en tekstupload                  |
| Mobiele weergave                       | Geen horizontale overflow                   | 375 px; [mobiel beeld](../public/dify/screenshots/mobile.png)                                    |
| Afbeeldingen                           | Alle canvasbeelden geladen                  | Echte Studio-captures met een afzonderlijke link naar runbewijs                                  |
| Canvasoverdracht                       | Drie apps, elk zeven notities               | Notities zijn DSL-inhoud; geen uitvoeringsverbindingen; bron en nodebeschrijvingen gecontroleerd |
| Regressie                              | 49 code-/integratietests, 9 browsertests    | Inclusief CSP zonder eval en onafhankelijke documentdekking                                      |
| Provider / volledige keten             | Zes API-cases en lokale HTTP-keten geslaagd | [Runbewijs](../public/dify/evidence.json), [ketenbewijs](../public/dify/local-verification.json) |

[Desktopwerkbank](../public/dify/screenshots/workbench.png) · [interactieve uitleg](../public/dify/screenshots/guide.png) · [canvas-review](../docs/dify-canvas-review.md).

Grens: desktop en één mobiel formaat zijn gecontroleerd met Chromium, geen volledige browsermatrix. De modelcases zijn kleine fictieve acceptatievoorbeelden, geen onafhankelijke kwaliteitsbenchmark. Notities tonen ontwerp en beheer; uitvoering en veiligheid worden door de daadwerkelijke code bepaald.

## v2.3.0 — volledige canvasviewer en native Agent

Flow onder test: `?view=dify` → canvas openen → volledig beeld / zoom / echte run → Escape → focus terug; vierde tab → vastgelegde echte Agent-run → bronvelden en uitsluitingen.

Omgeving: Chromium; desktop 1536×1050 en mobiel 375×812. Browser plugin not available; bestaande Playwright-suite gebruikt. Dify Cloud zelf is via CUA bediend en vastgelegd.

| Controle                                         | Uitkomst | Bewijs                                                                                                                                    |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pagina-identiteit / niet leeg / frameworkoverlay | Geslaagd | Titel Duin & Dorp, werkbank en resultaten aanwezig; geen overlay.                                                                         |
| Console / assets / overflow                      | Geslaagd | Geen app-consolefouten; alle canvasbeelden geladen; geen horizontale pagina-overflow.                                                     |
| Originele fout                                   | Hersteld | Dossiercanvas opnieuw opgenomen; alle 12 nodes inclusief 7 notities binnen het originele viewport. Geen uitsnede of gegenereerde mock.    |
| Beeldviewer                                      | Geslaagd | Passend beeld, 150% zoom, terug naar passend, runwissel en volgende flow; Escape herstelt focus.                                          |
| Toetsenbordgrens                                 | Geslaagd | Extra test vond Shift+Tab-randgeval; expliciete grens naar laatste/eerste control toegevoegd en getest.                                   |
| Favicon / basispath                              | Geslaagd | SVG via Pages-basispath HTTP 200; afbeeldings-URL’s hebben v2.3.0-cacheversie.                                                            |
| Native Agent                                     | Geslaagd | Echte Build Mode, skill-Preview, vierstaps Workflow en geauthenticeerde lokale API-run. Python en TypeScript bewaken bronnen en matchset. |
| Regressies                                       | Geslaagd | `npm run check`: 54 unit/integratietests, storingsdrill, DSL-sync, OpenAPI, formattering en links. `npm run test:e2e`: 11 geslaagd.       |

[Screenshot volledige viewer](../public/dify/screenshots/viewer.png) · [Agent-resultaat](../public/dify/screenshots/comparison-workbench.png) · [native canvas](../public/dify/screenshots/comparison.png) · [native run](../public/dify/screenshots/comparison-run.png).

Resterende grenzen: één browserfamilie en één mobiel formaat; geen onafhankelijke live modelbenchmark. Publieke site toont opgenomen bewijs; nieuwe runs vragen lokale serverconfiguratie. Native Agent is beta, gebruikt fictieve data en heeft geen bedrijfssleutels of echte CRM-koppeling. De exacte live export heeft twee overzichtskaarten; de uitgebreide canonieke importvariant zeven.

## Showcase-afronding v3 · 29 oktober 2026

De functiematrix is gelijkgetrokken met de gepubliceerde native Knowledge/Human Input/triggerstatus. Het technische dossier toont per bewijs de uitvoeringsmodus. De nieuwe mobiele deep-linktest controleert dat dit overzicht geen API-aanvragen start en binnen 375 px blijft. De volledige suite heeft 14 browsergevallen; 76 unit-/integratietests controleren de onderliggende regels.

De verbonden werkplek toont procedures en broncitaten leesbaar; technische JSON is uitklapbaar. Documentcorrectie, geweigerde verzonnen waarde, verlopen beoordeling en gewiste gegevens na sessiewisseling zijn via de echte lokale API getest. De Dify-werkbank wist oude resultaten en dossiers bij een nieuwe sessietoken.

Native Schedule Trigger: echte timer-run, 3 stappen, 0,483 s en 0 tokens. Gepubliceerd, normale werkdagplanning hersteld en toegangspuntschakelaar gecontroleerd uitgezet. Dit bewijs komt uit de echte Kippieg-Chrome-sessie, niet uit een gereconstrueerde screenshot. De oudere v2.3-uitspraken hierboven zijn historische controles; de actuele canvasvergelijking en releasegrenzen staan in de gekoppelde bewijsbestanden.
