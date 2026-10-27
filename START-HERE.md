# Start hier

Voor recruiter, zaakvoerder en technische reviewer. Kies een route.

## Twee minuten

[Open de rondleiding](https://phlppgdfry.github.io/real-estate-automation-workbench/?tour). Probleem: handwerk tussen aanvraag en opvolging. Oplossing: gecontroleerde werkstroom met menselijke goedkeuring en zichtbare uitzonderingen. Liever lezen? [Samenvatting](application-kit/executive/one-page-summary.md).

## Vijf minuten

Lees [proces en businesscase](CASE_STUDY.md), probeer een verkocht pand en mislukte overdracht, en bekijk [de bewijsmatrix](EVIDENCE.md). De calculator toont scenario-aannames.

## Vijftien minuten

Volg [het demoscript](application-kit/demo/5-minute-story.md), lees [architectuur](docs/architecture.md) en [ontwerpkeuzes](docs/decisions.md), en bekijk [integratietests](tests/integration.test.ts). Let op idempotentie, rollback en herstart.

## Zelf verifiëren

Volg [README](README.md), draai `npm run check`, `npm run test:e2e` en `npm run demo:api`. Lees [het runbook](docs/operations.md) en [de kennisgids](docs/knowledge.md). Geen JavaScript? [Statische samenvatting](public/fallback.html).

Fictieve data, CRM-mock, geen e-mails, geen bewezen bedrijfsresultaten.

## Senior reviewer

[Bevindingen en fixes](docs/senior-review.md) · [technische leesroute](docs/reviewer-guide.md) · [evaluatie inclusief missers](docs/evaluation.md). Voer `npm run drill` uit voor uitval en gecontroleerd herstel.

## Dify beoordelen

Open **Dify werkbank** in de demo: lees aanvraagclassificatie, dossieradvies en documentfeiten in gewone taal met hun broncitaten. De knop voor een vastgelegde run maakt geen nieuwe providerrequest. De [installatiegids](docs/dify-integration.md) bevat de oorspronkelijke drie importeerbare apps, echte screenshots, modelrunbewijs en de lokale end-to-end ketentest.

De oorspronkelijke drie flows bevatten nu ook de uitleg op het Dify-canvas zelf. Open de [canvas-reviewgids](docs/dify-canvas-review.md), volg de kleuren en stel één van de demonstratievragen. De site toont dezelfde uitleg zonder dat je toegang tot de workspace nodig hebt.

## Native Agent en volledige beelden

Kies **Agent · Pandvergelijker** in de Dify werkbank en open de vastgelegde echte run. Vergelijk DD-212 en DD-204 met de uitgesloten DD-223. Bekijk de functiematrix onderaan: wat is gebruikt, wat nog ontbreekt en waarom. De beeldgalerij opent elk volledig canvas met zoom en runbewijs. [Native Agent-handleiding](docs/dify-agent-review.md).
