# Bijdragen en lokaal controleren

Gebruik fictieve gegevens. Zet sleutels uitsluitend in de genegeerde `.env.local`; deel geen echte dossiers, formuliertokens of providerlogs in issues.

1. Installeer Node.js 24+, npm en Python 3; `npm ci`.
2. Maak een branch. Houd domeinregels in `src/domain.ts` en serverbevoegdheden in de server.
3. Wijzig Dify-code in `dify/code`, prompts of schema’s; voer `npm run dify:sync` uit. Bij de native trigger blijven planning en uitvoering expliciet.
4. Voeg een regressietest toe voor een gedragscorrectie. Tests met een lokale provider bewijzen het protocol; noem ze geen Cloud-run.
5. Draai `npm run check`, `npm run test:e2e` en waar relevant `npm run verify:install`.
6. Werk claim en bewijs samen bij. Oude runbewijzen krijgen hun oorspronkelijke datum en bereik; vervang ze niet door verzonnen succes.

De standaardcontrole en benchmark maken geen betaalde modelrequests. `--live`, Dify-smoke en afzonderlijke providerverificaties vragen een bewuste keuze. In CI staan geen providersleutels.

Voor UI-wijzigingen: controleer desktop en 375 px mobiel, toetsenbordbediening, foutmelding en focus. Gebruik echte captures van de werkende app. [Releasecontrole](docs/release-readiness.md) en [beveiliging](SECURITY.md).
