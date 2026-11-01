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

## Definitieve presentatie- en UX-review · 2 november 2026

Baseline: schone `main` op `1e8694438f487b8700acf530798b767a1f824ad4`, gelijk aan de remote en de eerdere afsluiting. Productrelease v3.0.3 blijft op `63809d8f459540075baa910261b561f97b8febf1`. De drie major-Dependabot-voorstellen blijven bewust uitgesteld. De bestaande vormgeving is behouden: wit/koelgrijs, donkere tekst, teal voor acties, statuswoorden naast kleur, systeemfonts en de bestaande lijst/detailstructuur. Geen nieuw framework, animatie, modelrequest of infrastructuur.

De beoordeling is gebaseerd op echte Chrome-renders van alle vijf hoofdonderdelen op 1440 px en 375 px, toetsenbordbediening, de bestaande lokale API-fixtures en de gepubliceerde media. Screenshots van vóór en na zijn tijdelijk buiten de repo opgeslagen. De publieke [productpreview](../public/preview.png) is één authentieke nieuwe render; historische technische/Dify-afbeeldingen zijn behouden. Beoordelingen van recruiterbegrip zijn expertinschattingen, geen gemeten gebruikersonderzoek.

| Bevinding                                         | Impact en bewijs                                                                                                                         | Gerichte correctie                                                                                                                          | Verificatie                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2 — Kleine ondersteunende tekst te licht         | Tijdlabels 3,93:1 op wit; calculatornoot 4,36:1 op de lichte achtergrond, onder 4,5:1                                                    | Twee bestaande tekstkleuren donkerder gemaakt                                                                                               | axe meldt deze overtredingen niet meer; browserregressie controleert berekend contrast ≥ 4,5:1                                                                        |
| P2 — Zwakke focusring                             | Amber focuskleur 2,50:1 op wit                                                                                                           | Donkerder amber binnen dezelfde kleurfamilie                                                                                                | Berekend 5,35:1 op wit; regressie vereist ≥ 3:1                                                                                                                       |
| P2 — Groepslabels zonder geldige rol              | axe markeerde labels op generieke divs voor indicatoren, filters en hoofdstukken als handmatig te beoordelen                             | Bestaande groepen krijgen `role="group"`                                                                                                    | Geen resterende `aria-prohibited-attr`-meldingen in de onderzochte schermen                                                                                           |
| P2 — Mobiele bewijstabel niet expliciet focusbaar | axe vond de horizontaal scrollbare bewijsvergelijking; de regio had geen tabstop                                                         | Bestaande tabelcontainer krijgt een naam, regirol, tabstop en focusstijl                                                                    | Echte Tab-navigatie en ArrowRight-scroll getest, zonder pagina-overflow                                                                                               |
| P2 — Mobiele selectie liet details buiten beeld   | Na Bram kiezen stond de titel op circa y=1111 bij een viewport van 812 px                                                                | Alleen op de bestaande gestapelde layout (≤ 620 px) wordt na selectie/nieuwe intake de actuele titel gefocust en in beeld gebracht          | Nieuwe titel op circa y=24, focus op de titel; ook dezelfde rij opnieuw kiezen en nieuwe intake getest. Desktop houdt focus in de lijst; initiële pagina springt niet |
| P2 — Portfolioherkomst niet direct zichtbaar      | De eerste viewport benoemde het fictieve prototype en AI-assistentie niet; de footer kon als onafhankelijke implementatie worden gelezen | Concretere ondertitel, korte herkomstregel en preciezere footer                                                                             | Desktop/mobiel visueel nagekeken; geen productie-, klant- of besparingsclaim toegevoegd                                                                               |
| Ontbrekende interviewroute                        | Er was een technische reviewgids, maar geen equivalente pitch/businessroute met interviewvragen                                          | Eén [interviewgids](../docs/portfolio-interview-guide.md) met 30 seconden, 3 minuten, 10 minuten en twaalf brongebonden vragen; README-link | Relatieve links en vergelijking met architectuur, broncode, tests en bewijsgrenzen                                                                                    |

### Resultaten en bewijsgrenzen

- `npm run check`: **80/80 unit-/integratie-/HTTP-tests**, typecontrole, productiebuild, **24/24 + 16/16 + 12/12** regelregressies, storingsdrill, OpenAPI, bron/DSL-sync, formattering, links en publiceerbare-bestandenscan geslaagd.
- `npm run test:e2e`: **19/19 Chrome/Chromium-browsertests**, inclusief drie nieuwe presentatie-/toegankelijkheidsregressies. Bestaande tests en assertions zijn niet afgezwakt.
- `npm run verify:install`: schone bronkopie zonder bestaande secrets, database of Git; volledige controle en echte lokale HTTP-keten geslaagd.
- axe-core **4.13.0**, gebruikt uit een reeds aanwezige tijdelijke toolcache, zonder projectdependency. `axe.run` met `wcag2a`, `wcag2aa`, `wcag21aa` en `wcag22aa`: **0 automatische overtredingen in 10 hoofdscherm-/viewportcombinaties** na de correcties.
- Resterende axe-`incomplete`-meldingen zijn niet als automatische passes gepresenteerd. Bij de lijst verhinderen scheidingslijnen/selectiestripes als pseudo-elementen de automatische achtergrondbepaling. Visuele/CSS-controle en berekening op de werkelijke vlakke tekstachtergronden geven voor de gecontroleerde tijd-/statuslabels minimaal circa **5,04:1**. Technische tabeltekst is donker op licht; de video is stil, heeft toelichting in beeld en een tekstversie. Dit is geen volledige WCAG- of screenreader-certificering.
- Handmatig in Chrome: skiplink, native formulier-validatie, Escape, focusherstel, geblokkeerd verkocht pand en mobiel selectieresultaat gecontroleerd. Native `<dialog>` houdt de achtergrond inert; een Tab-uitstap naar browserbediening is geen reden om een eigen focus-trap toe te voegen. Er is geen schermlezer-gebruikersonderzoek uitgevoerd.
- Alle vijf hoofdonderdelen: geen waargenomen runtimefouten of horizontale overflow in de onderzochte desktop-/mobiele renders. Aanvullende reflowcontrole op 320, 414 en 768 px slaagt voor alle vijf onderdelen. Inline tekstlinks onder 24 px vallen niet automatisch af: hun context en tussenruimte zijn visueel beoordeeld; er is geen ongefundeerde claim dat elke link een 44 px-knop moet worden.
- Gepubliceerde media: alle **8 native canvas-/runafbeeldingen** laden; lazy loading en de vergrotingsviewer behouden de leesbaarheid van grote bewijsbeelden. De video blijft **76,12 s**, **1280 × 1000**, zeven hoofdstukken, MP4 en WebM met werkende playback, representatieve hoofdstuksprongen en tekstversie. De opname is niet opnieuw gemaakt: haar expliciete scope is lokale intake/document/broncontrole; goedkeuring en herstel worden in de interactieve demo getoond.
- De nieuwe `public/preview.png` is circa **186 KiB**, toont alleen fictieve seeddata en is geen gegenereerde mock. Geen debugpaneel of credential in de screenshot. Canvasbeelden en modelrunbewijzen behouden hun historische betekenis.

### Eindafweging

De bestaande operationele UI, procesroute, onderbouwing en expliciete beperkingen zijn de sterkste presentatie-elementen. De gerichte correcties verbeteren leesbaarheid, focus, geloofwaardigheid en interviewnavigatie zonder de afgesloten implementatie te heropenen. De drie reviewroutes blijven één applicatie: rondleiding/README voor de recruiter, Proces & impact voor de businessmanager, Technisch dossier en repository voor de technische reviewer.

Publicatie van dit afzonderlijke presentatiepakket vereist expliciete toestemming en de bestaande PR-/CI-regels. Release v3.0.3 en historische test-/Cloud-bewijzen worden niet overschreven. Er is geen nieuwe productrelease of grotere verbouwronde nodig om deze presentatiecorrectie te beoordelen. Bekende grenzen blijven de labopstelling, niet-uitgevoerde Cloud-modelruns, onafhankelijke labels en verse Dify-workspace; ze blokkeren de portfolio-case niet.
