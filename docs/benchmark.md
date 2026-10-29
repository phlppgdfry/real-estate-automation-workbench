# Directe query, vaste workflow en native Agent vergelijken

De vraag is of een Agent iets toevoegt aan een taak die ook met expliciete criteria kan. Alle paden gebruiken dezelfde zes fictieve catalogusrecords, gemeente, maximale prijs en minimale slaapkamers. De criteria worden meegegeven; dit meet geen extractie uit vrije taal.

## Zonder providerbudget reproduceren

```bash
npm run benchmark
# Rapport: var/benchmark.json
```

Vier gevallen: dezelfde criteria met NL- en FR-vraag, een gemeente zonder matches en een brede selectie waarin het verkochte pand uitgesloten blijft. De runner voert de directe Python-query uit en vervolgens de echte Python-Code-nodes uit de importeerbare vaste workflow, inclusief onafhankelijke guard. TypeScript valideert opnieuw. Acht lokale uitvoeringen slagen; beide Cloud-paden staan expliciet op `not-run`.

De lokale uitvoering van nodecode is geen uitvoering van de Dify-runtime. Latentie bevat de Python-processtart; vergelijk dit niet als productie-P50/P95 met een historische Agent-run. Kosten blijven onbekend zolang er geen geverifieerde prijsconfiguratie bestaat. De fixtures zijn door AI opgesteld.

## Later een echte Cloud-meting uitvoeren

Importeer [de vaste workflow](../dify/benchmarks/fixed-comparison.yml) in een eigen workspace en plaats de bijbehorende app-sleutel lokaal in `DIFY_FIXED_COMPARISON_API_KEY`. De native Agent gebruikt de bestaande `DIFY_COMPARISON_API_KEY`. Er is geen nieuwe sleutel aangemaakt voor deze release. Deze aparte workflow past niet naast de vijf bestaande apps binnen de huidige workspace-limiet.

Na bewust regelen van providerbudget:

```bash
node --import tsx --env-file=.env.local scripts/benchmark.ts --live
```

Dit is een expliciete externe uitvoeringsmodus en kan modelbudget verbruiken. Hij wordt niet in CI of in de standaardbenchmark gebruikt. De runner valideert alle antwoorden, stopt bij een provider- of contractfout en verzint geen tokens, matches of scores voor ontbrekende runs. Nieuwe live rapporten blijven in `var`; historische productieclaims worden niet overschreven.

De eerdere [Agent-run](../data/agent/local-api-proof.json) laat zien dat de native Agent en guards werkelijk werkten. Die ene waarneming met andere uitvoeringsomstandigheden is geen winnaar in de nieuwe vergelijkingsmatrix. De onderbouwde keuze voor expliciete cataloguscriteria blijft daarom: gebruik een directe query als de vaste criteria voldoende zijn; rechtvaardig een Agent met een afzonderlijke informatie- of interactiebehoefte.
