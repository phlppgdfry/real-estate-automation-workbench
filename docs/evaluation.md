# Kwaliteit meten zonder een perfect resultaat te suggereren

De extractor in de publieke demo is een regelbaseline. Dit meetrapport gaat uitsluitend daarover. De OpenAI- en Dify-adapters hebben contracttests, geen live modelbenchmark.

## Methode

- Ontwikkelset: de oorspronkelijke 24 voorbeelden. De regels zijn daarop aangepast; 24/24 zegt weinig over generalisatie.
- Diagnostische challengeset: 16 aanvullende voorbeelden met parafrases, Frans, omgekeerde ontkenning, referenties over meerdere regels en gemengde vragen.
- Beide sets zijn door AI opgesteld. De challengeset is tijdens deze review gebruikt om fouten te herstellen en is dus een regressieset geworden. Dit is geen onafhankelijke, blind beoordeelde holdout.
- Het rapport vermeldt de SHA-256 van canoniek geserialiseerde datasets. `npm run evaluate` genereert dezelfde JSON in `data/` en `public/`; CI publiceert het rapport bij de build.

## Uitkomst en leerpunt

Vóór de review: 10/16 challengevoorbeelden volledig correct, met drie aanvragen die handmatige interpretatie vroegen maar toch een goedkeuringsvoorstel kregen. Er was nog altijd menselijke goedkeuring nodig; het was geen automatische verzending.

De review herstelt generieke fouten: ontkenning vóór én na een bezoekvraag, meerdere unieke referenties over regelgrenzen, en gemengde intenties die niet uitsluitend een bezoek betreffen. Het ontwikkelvoorbeeld met twee panden is expliciet herlabeld naar onbekende intentie + handmatig.

Na herstel: 13/16 volledig correct en nul gemiste handmatige controles **in deze eindige set**. Drie parafrases/Franse waarderingsvragen worden niet herkend en gaan conservatief naar een medewerker. Dit is kwaliteitsinformatie, geen populatienauwkeurigheid of veiligheidsbewijs voor willekeurige input.

Bekijk [het volledige reproduceerbare rapport](../data/evaluation-report.json). De UI toont dezelfde cijfers onder Technisch dossier. CI faalt bij een regressie op de ontwikkelset of gemiste vereiste handmatige controle in deze regressievoorbeelden.

## Voor live AI

Laat een domeinmedewerker een nieuwe meertalige set labelen vóór promptafstelling. Scheid ontwikkeling en eindbeoordeling; documenteer meningsverschillen. Meet intentie, referentie, routing, onterechte belofte, antwoordkwaliteit, refusal, kosten en P50/P95-latentie per model/provider. Test met echte foutresponsen en timeouts, zonder echte klantdata. Een valide schema of exact citaat bewijst geen correcte interpretatie.
