# Wijzigingen

## 1.1.0 — Betrouwbaarheid en reviewbewijs

- Duurzame inbox vóór analyse, 202/statusendpoint, begrensde batches, leases en fencing.
- Afzonderlijke lees-, beoordelings- en beheerrechten in de lokale API.
- Gecontroleerde herstart van mislukte analyses en CRM-opdrachten, met reden en audit.
- Versiemigraties, SQL-tellingen en begrensde paginering.
- Drie semantische routingfouten hersteld; diagnostische evaluatie met zichtbare beperkingen.
- Runtime-validatie van browserstate en zichtbaar herstelpad voor de demo.
- Reproduceerbare storingsdrill, onderzoek, reviewroute en expliciete productiegrenzen.

API-wijziging: intake geeft een ontvangstbewijs (202 bij pending) in plaats van direct een lead. Start analyse met operatorrechten via `/api/inbox/process`; `APP_TOKEN` wordt niet meer gebruikt. `setup:local` vult de nieuwe rolcredentials aan zonder bestaande waarden te overschrijven.

## 1.0.0

Eerste portfolio-case met fictieve vastgoedaanvragen, gedeelde domeinregels, menselijke goedkeuring, lokale CRM-mock, outbox, tests en Pages-demo.
