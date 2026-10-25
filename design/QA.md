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
