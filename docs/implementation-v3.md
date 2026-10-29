# Werkplan v3 · afgeronde lokale showcase en externe verificatievoorwaarden

Stand: 29 oktober 2026. Het eerdere werk op `feature/connected-operations` is via PR #5 samengevoegd. De showcase-afronding staat op `feature/showcase-completion`. De actuele product- en bewijsgrenzen staan in [de releasecontrole](release-readiness.md).

## Uitgevoerde tienpuntenafwerking

| Punt                                      | Afwerking                                                                                                                                                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Native Knowledge Retrieval             | Gepubliceerde dossierassistent met actuele NL/FR-filters, expliciete NL-standaard, canonieke broncontrole en retrievalfouttak. Volledige chatflow door modelquotum geblokkeerd; component en directe API afzonderlijk bewezen.                            |
| 2. Consistente classificatie              | De vier werkbankapps en kennisbank zijn getagd en geverifieerd. De afzonderlijke trigger heeft een duidelijke naam en expliciete begrenzing. [Classificatie](dify-classification.md).                                                                     |
| 3. Leesbare document- en dossiercanvassen | Live export vergeleken met alle nodeconfiguraties en verbindingen; volledige beelden en centraal beheerde uitleg. [Vergelijking](../public/dify/canvas-verification.json).                                                                                |
| 4. Native bestand en Human Input          | Extractor, client, revieweridentiteit, bedoelde actie, timeout en reconcile gebouwd. Formulierpauze live gezien; hervatting en nieuwe bestandsrun wachten op beschikbaar modelbudget. Geen lokale test als Cloud-run geclaimd.                            |
| 5. Driewegsbenchmark                      | Runner, vaste importeerbare workflow, gelijke NL/FR-criteria, broncontrole en rapport aanwezig. Directe query en workflowcode lokaal uitgevoerd; nieuwe Cloud-paden expliciet niet uitgevoerd. [Methode](benchmark.md).                                   |
| 6. Native trigger                         | Vijfde app gepubliceerd. Echte geplande modelvrije run geslaagd: 3 stappen, 0,483 s, 0 tokens. Daarna normale planning hersteld en trigger uitgezet. [Bewijs en lokale replay](native-trigger.md).                                                        |
| 7. Review en browseracceptatie            | Broncorrectie, onjuiste bewerking, verlopen review en sessiewisseling getest tegen echte lokale API. Leesbare bronresultaten; contract en resultaatcomponenten afgesplitst.                                                                               |
| 8. Meertalige evaluatie                   | Aanvullende NL/FR/EN-regressies; gemiste ontkenningen bij schatting/zoeken hersteld. Eenvoudig menselijk reviewbestand bestaat; inhoudelijke menselijke review blijft uitgesteld.                                                                         |
| 9. Schone overdracht                      | Geautomatiseerde geïsoleerde installatie zonder bestaande sleutels/data, build, drill en echte HTTP-keten. Volledig verse Dify-workspace blijft een externe verificatievoorwaarde.                                                                        |
| 10. Showcase en publicatie                | README/startgids/bewijsmatrix gelijkgetrokken; expliciete status in de site, Engelse gids, social metadata, beveiligings- en bijdragebeleid, gepinde CI en reproduceerbaar bronpakket. CI, release en Pages worden op de werkelijke commit gecontroleerd. |

## Bewuste grenzen

De gebruiker kiest **geen nieuwe kosten**. Het Dify Sandbox-modelquotum blijft op. Er is geen upgrade, nieuwe provider, ruimer token, extern account of publiek dossierendpoint aangemaakt. Menselijke labels zijn niet door AI ingevuld. Een lokale replay van de echte timeroutput bewijst geen automatische Cloud-verbinding.

Vijf fictieve economische kennisbankdocumenten zijn beschikbaar en geïndexeerd; de Knowledge-sleutel blijft beperkt tot die kennisbank. Publieke werkbankwebapps staan uit; de nieuwe trigger staat na de demonstratie uit. Een verse zelfstandige Dify-workspace, live Cloud-hervatting en onafhankelijke labels krijgen pas een groen resultaat na echte uitvoering.
