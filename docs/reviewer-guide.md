# Technische review in vijftien minuten

Voor een hiring manager of senior engineer. Gebruik [de demo](https://phlppgdfry.github.io/real-estate-automation-workbench/?tour) eerst om het proces te zien. De [senior review](senior-review.md) bevat bevindingen en beperkingen.

1. **2 min — Bedrijfsgrens:** lees de eerste helft van [CASE_STUDY](../CASE_STUDY.md). Waarom geen autonome verzending of leadranking?
2. **3 min — Ontvangst en crash:** lees [Inbox](../server/inbox.ts), vooral accept/claim/complete. Een late worker mag nooit de nieuwe eigenaar overschrijven. Bekijk de test met twee databaseverbindingen.
3. **3 min — Beslissen en uitvoeren:** bekijk [auth](../server/auth.ts), approve/requeue in [domain](../src/domain.ts) en de outboxtransactie in [Store](../server/store.ts). Waarom kan een operator niet goedkeuren?
4. **3 min — Bewijs:** voer `npm run check` en `npm run drill` uit. De drill laat provideruitval, herstart, drie CRM-fouten en gecontroleerd herstel zien zonder API-key.
5. **2 min — Kwaliteit:** lees [de evaluatie](evaluation.md). Welke beperkingen blijven in de taalbaseline? Waarom zijn regressievoorbeelden geen onafhankelijke modelbenchmark? De zes nieuwe menselijke labels zijn nog te beoordelen; zie [de korte reviewlijst](evaluation-human-review.md).
6. **2 min — Grenzen:** kies één punt uit de productie-eisen in [de review](senior-review.md) en laat de auteur een alternatief verdedigen.

Zelfstandigheidstoets: voeg met een eerst falende test een nieuwe pandstatus toe. Of verklaar waarom een worker na een verlopen lease geen resultaat mag opslaan, ook als zijn analyse inhoudelijk juist is. Een AI-uitgewerkte repo vervangt die demonstratie niet.
