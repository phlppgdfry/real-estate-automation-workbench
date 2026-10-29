# Releasecontrole · v3.0.1

Deze release levert een controleerbare lokale showcase en overdraagbare Dify-bronnen. Het is geen productie-uitrol en geen claim dat alle externe afhankelijkheden beschikbaar zijn. Er zijn geen nieuwe betaalde modellen, abonnementen, externe accounts of publieke dossierendpoints toegevoegd.

## Afgerond en reproduceerbaar

- Duurzame ondertekende intake, rollen, workerleases, versiecontrole, outbox en gecontroleerd herstel.
- Verbonden lokale dossierwerkplek met documenten, brongebonden correcties, afwijzing en verlopen reviews. Sessiewisseling verwijdert het eerder geladen dossier en resultaat; tokens worden niet in browseropslag bewaard.
- PDF/DOCX/EML/TXT/MD en expliciete beperkte OCR. Installatiecontrole noemt ontbrekende documenttools apart.
- Afzonderlijke HTTP-testconnector met remote idempotentie, rate limits en reconcile na een commit-disconnect en databaseherstart.
- Vijf gepubliceerde Dify-apps: vier werkbankapps en één modelvrije native Schedule Trigger. De laatste is na een echte geplande testrun uitgeschakeld.
- Echte directe Knowledge API-verificatie met actuele NL/FR-bronnen en een oude-versiecontrole. De gepubliceerde dossierassistent heeft taalfilters en onafhankelijke bronvalidatie.
- Dify Human Input-client met pauze, bedoelde actie, één inzending en reconcile; lokale providercontracttests dekken approve, reject, timeout en onbekende uitkomst.
- Meertalige regelregressies, inclusief ontkende bezoek-, schattings- en zoekvragen. Alle fixtures blijven als AI-geschreven gemarkeerd.
- Uitvoerbare benchmark: dezelfde criteria voor directe query en de daadwerkelijke Python-Code-nodes van de vaste workflow; Cloud-cellen krijgen geen score wanneer ze niet zijn uitgevoerd.
- Schone installatierunner zonder bestaande `.env`, database of node_modules: offline cache-installatie, setup, volledige controleketen, storingsdrill en echte HTTP-demo.
- Actuele startgids, bewijsmatrix, voorbeeldconfiguratie, Engelse reviewroute, beveiligingsbeleid en bijdragehandleiding.
- Bron/DSL-sync, schema- en broncontrole, browseracceptatie, repo-scan en relatieve links in CI. Officiële Actions op commit-SHA en een vaste Ubuntu-versie.
- Reproduceerbaar bronpakket uit een schone commit, met broncommit, bestandsmanifest en SHA-256-checksum. Geen lokale staat of credentials in het pakket.

## Externe verificatievoorwaarden die overblijven

| Voorwaarde                             | Actuele stand                                                                                                                            | Benodigde vervolgstap                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Nieuwe Dify-modelruns                  | Gratis modelquotum opgebruikt; gebruiker kiest geen nieuwe kosten                                                                        | Eigen beschikbaar budget regelen vóór live bestandsrun, Human Input-hervatting en de nieuwe Cloud-benchmark |
| Onafhankelijke menselijke labels       | `humanReview` blijft `null`; geen menselijke beoordeling verzonnen                                                                       | Persoon beoordeelt [de zes kandidaten](evaluation-human-review.md), onafhankelijk van de huidige regels     |
| Volledig verse Dify-workspace          | Lokale schone installatie en een nieuwe trigger-app-import zijn getest; volledige workspace met Agent-assets en Knowledge-bindingen niet | Iemand met een eigen lege workspace volgt [de importgids](dify-integration.md) en legt de uitkomst vast     |
| Automatische Cloud-naar-API-aflevering | Native timer en lokale replay zijn afzonderlijk bewezen                                                                                  | Bereikbaar geautoriseerd endpoint en beheercontract. Geen tunnel of extra toegang toegevoegd                |
| Productie en bedrijfsimpact            | Fictieve data, labrollen, HTTP-test-CRM en scenario-calculator                                                                           | SSO/objectrechten, echte leverancier, retentie, restore, alerts en een gemeten schaduwpilot                 |

Deze voorwaarden staan niet als onafgemaakte lokale code verstopt. De lokale release kan worden beoordeeld zonder ze als geslaagd te presenteren. Beschikbaar modelbudget is een uitvoeringsvoorwaarde, geen reden om authenticatie of broncontroles te omzeilen.

## Release zelf controleren

```bash
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run benchmark
npm run verify:install
# Na het committen van de gecontroleerde bron; vereist een schone werkboom:
npm run release:package
```

Lokaal geverifieerd: **79 unit-/integratietests**, **14 browseracceptatietests**, evaluatie **24/24 + 16/16 + 12/12 NL/FR/EN**, nul bekende kwetsbaarheden volgens `npm audit` op 29 oktober 2026. De [schone installatie](../public/install-verification.json) is met de echte lokale HTTP-keten uitgevoerd. Dit zijn technische regressie-uitkomsten, geen onafhankelijke model- of bedrijfsmeting.

De CI-artifact `validation-evidence` bevat actuele evaluatie-, drill-, benchmark-, installatie- en replayrapporten. Historische Cloud-bewijzen blijven gedateerd in `public/dify`. Controleer een download met `shasum -a 256 -c SHA256SUMS.txt`; `RELEASE-MANIFEST.json` in de zip vermeldt broncommit en de hash van elk bronbestand. Dezelfde commit levert hetzelfde bronpakket op.

Een nieuwe GitHub-release hoort bij de geverifieerde tag en commit, niet bij alleen de versie in `package.json`. CI en de Pages-deploy moeten geslaagd zijn; de publicatie wordt daarna op de echte URL gecontroleerd.

[Alle gevonden showcasegaten en hun controles](showcase-audit.md).
