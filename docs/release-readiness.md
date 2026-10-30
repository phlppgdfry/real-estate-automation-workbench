# Releasecontrole · v3.0.3

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
npx playwright install chromium chrome
npm run test:e2e
npm run benchmark
npm run verify:install
# Na het committen van de gecontroleerde bron; vereist een schone werkboom:
npm run release:package
```

Lokaal geverifieerd: **80 unit-/integratietests**, **16 browseracceptatietests**, evaluatie **24/24 + 16/16 + 12/12 NL/FR/EN**, nul bekende kwetsbaarheden volgens `npm audit` op 29 oktober 2026. De [schone installatie](../public/install-verification.json) is met de echte lokale HTTP-keten uitgevoerd. Dit zijn technische regressie-uitkomsten, geen onafhankelijke model- of bedrijfsmeting.

De CI-artifact `validation-evidence` bevat actuele evaluatie-, drill-, benchmark-, installatie- en replayrapporten. Historische Cloud-bewijzen blijven gedateerd in `public/dify`. Controleer een download met `shasum -a 256 -c SHA256SUMS.txt`; `RELEASE-MANIFEST.json` in de zip vermeldt broncommit en de hash van elk bronbestand. Dezelfde commit levert hetzelfde bronpakket op.

Een nieuwe GitHub-release hoort bij de geverifieerde tag en commit, niet bij alleen de versie in `package.json`. CI en de Pages-deploy moeten geslaagd zijn; de publicatie wordt daarna op de echte URL gecontroleerd.

[Alle gevonden showcasegaten en hun controles](showcase-audit.md).

## Definitieve afsluitaudit

### A. Eindstatus

**READY WITH DOCUMENTED LIMITATIONS**, vastgesteld op 31 oktober 2026 (Europe/Brussels). De broncode, tests, release en publieke demonstratie zijn opnieuw gecontroleerd; eerdere Codex-rapporten zijn niet als vervanging voor uitvoering gebruikt. Geen bekende P0/P1-bevinding blijft open. Dit is een afgeronde portfolio-case met een lokaal prototype, geen productiecertificering of menselijke inhoudsvalidatie.

### B. Technische baseline

- Repository: `phlppgdfry/real-estate-automation-workbench`, openbaar; standaardbranch `main`.
- Definitieve productrelease: **v3.0.3**, broncommit `63809d8f459540075baa910261b561f97b8febf1`.
- [Publieke showcase](https://phlppgdfry.github.io/real-estate-automation-workbench/) en [ongewijzigde release](https://github.com/phlppgdfry/real-estate-automation-workbench/releases/tag/v3.0.3).
- Stack: React 19, TypeScript 5.9, Vite 7, Node.js 24, SQLite, Zod, Python 3, Dify en Playwright.
- Lokale auditomgeving: Node 24.22.2, npm 11.19.1, Python 3.14.10; Chrome/Chromium. Safari/Firefox vallen buiten deze afsluitopdracht.
- Aanvang: schone werkboom op `release/v3.0.3`; remote `main` en de release wijzen naar dezelfde broncommit. De afsluitwijziging betreft alleen documentatie. Een latere documentatiecommit verandert deze releasebaseline niet en vereist geen nieuwe productversie.

### C. Uitgevoerde verificatie

| Controle                             | Status                 | Uitvoering en resultaat                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architectuur en codekwaliteit        | PASSED                 | Intake, rollen, lease/fencing, transacties, outbox, documentextractie/review, broncontroles, runledger, configuratie en cleanup naast implementatie en tests gelezen. Geen bevestigde P0/P1-fout.                                                                                                                                                      |
| Installatie dependencies             | PASSED                 | `npm ci --offline`; bestaande lockfile behouden.                                                                                                                                                                                                                                                                                                       |
| Typecontrole en productiebuild       | PASSED                 | `npm run check`, met `tsc --noEmit` en Vite-build. Upstream Zod-annotatiewaarschuwingen zijn niet fataal.                                                                                                                                                                                                                                              |
| Unit-, integratie- en HTTP-API-tests | PASSED                 | `npm run check`: **80/80** tests, geen failures of skips. Dit is één gecombineerde suite, geen drie afzonderlijke tellingen.                                                                                                                                                                                                                           |
| Stijl en API-contract                | PASSED                 | `npm run check`: Prettier, OpenAPI-validatie, bron/DSL-sync, relatieve links en publiceerbare-bestandenscan.                                                                                                                                                                                                                                           |
| Afzonderlijke linttool               | NOT APPLICABLE         | Geen ESLint- of andere aparte linter geconfigureerd; geen lintresultaat verzonnen.                                                                                                                                                                                                                                                                     |
| Browseracceptatie                    | PASSED                 | `npm run test:e2e`: **16/16**, Chrome voor media en Chromium voor overige flows; bestaande desktop- en mobiele viewports.                                                                                                                                                                                                                              |
| Regelevaluatie                       | PASSED                 | `npm run check`: **24/24 ontwikkel-, 16/16 challenge- en 12/12 meertalige regressies**; AI-geschreven voorbeelden, geen onafhankelijke accuracymeting.                                                                                                                                                                                                 |
| Vergelijkingsbenchmark               | PASSED / NOT EXECUTED  | `npm run benchmark`: **8 lokale uitvoeringen geslaagd, 8 Cloud-cellen niet uitgevoerd**. De CLI vat niet-uitgevoerde cellen samen als “not passed”; het JSON-rapport onderscheidt `not-run` van een fout.                                                                                                                                              |
| Schone installatie                   | PASSED                 | `npm run verify:install`: geïsoleerde bron zonder Git, bestaande secrets of database, volledige controleketen en ondertekende echte HTTP-demo.                                                                                                                                                                                                         |
| Documenttools                        | PASSED                 | `npm run install:check`: Node, Python, Poppler en Tesseract met `eng` aanwezig.                                                                                                                                                                                                                                                                        |
| Dependency-security                  | PASSED, beperkt bereik | `npm audit --json`: **0 bekende advisories** voor de huidige lockfile op de auditdatum. Geen garantie op afwezigheid van onbekende kwetsbaarheden.                                                                                                                                                                                                     |
| Secrets en historie                  | PASSED, beoordeeld     | `gitleaks git . --redact --log-opts=--all`: 26 commits, 0 meldingen. Aanvullend 490 bereikbare blobs met exacte lokaal geconfigureerde geheimen vergeleken: 0 matches; geen geheime waarden weergegeven.                                                                                                                                               |
| Releasepakket                        | PASSED                 | Echte release gedownload; tag, broncommit, SHA-256 en **225 bestandschecksums** gelijk. `python3 scripts/package-release.py` levert byte-identiek dezelfde ZIP. Uitgepakte download: `npm ci --offline` en `npm run check` geslaagd zonder Git.                                                                                                        |
| Secrets in pakket                    | PASSED, beoordeeld     | `gitleaks dir` met archiefinspectie gaf vijf generieke meldingen, alle op `RELEASE-MANIFEST.json`. Iedere waarde is onafhankelijk als SHA-256 van het genoemde bronbestand bevestigd: **5 checksum-valspositieven, 0 bevestigde credentials**. Er is geen ignore-regel toegevoegd.                                                                     |
| Live website en media                | PASSED                 | Werkelijke HTTPS-site in Chrome: vijf onderdelen op 1440 en 375 px, geen waargenomen console-/runtimefouten, ontbrekende bestanden, API-aanroepen of horizontale overflow.                                                                                                                                                                             |
| Video                                | PASSED                 | **76,12 s**, **1280 × 1000**, zeven hoofdstukken; MP4 en WebM afgespeeld en doorgeschoven, MP4-einde bereikt. Pauzeren, poster, downloadlinks, tekstversie en vrijstaande toelichting visueel gecontroleerd. Beide live bestanden hebben de verwachte hash, juiste MIME-types, HEAD 200 en bytebereik 206. Geen nieuwe opname gemaakt.                 |
| GitHub en publicatie                 | PASSED                 | [Main-CI en deploy](https://github.com/phlppgdfry/real-estate-automation-workbench/actions/runs/41001265214) op releasecommit groen. `main` beschermd, PR en actuele `verify`-check vereist, ook voor admins; force-push/verwijdering uit, squash-only en automatische branchverwijdering aan. Geen verplichte tweede reviewer: aantal approvals is 0. |
| Documentatie en portfolio            | PASSED                 | README, case, architectuur, contracts, setup, bewijs, video en actuele release vergeleken. Recruiter vindt probleem/demo/stack; engineer vindt ontwerp/tests/security; manager vindt proces, menselijke beslissingen en scenario-aannames. AI-assistentie en fictieve data blijven zichtbaar.                                                          |
| Nieuwe Dify/modelruns                | NOT EXECUTED           | Geen betaalde modelrequests, nieuwe Cloud-resources of nieuwe Dify-uitvoeringen in deze audit. Bestaand Cloud-bewijs behoudt de oorspronkelijke datum en reikwijdte.                                                                                                                                                                                   |

SHA-256 bronpakket: `27a806cc5c1ab999473db49a7fa31c36898abd26bf512ddebf8184247d1661bd`. Het manifest en de bestandschecksums onderbouwen integriteit ten opzichte van de GitHub-release; ze vervangen geen ondertekende onafhankelijke supply-chain-attestatie.

### D. Bekende beperkingen en restrisico's

De eerder genoemde Cloud-bestandsrun, Human Input-hervatting, nieuwe Cloud-benchmark, onafhankelijke menselijke labels en volledig verse Dify-workspace blijven **NOT EXECUTED**. Eerder vastgelegd opgebruikt modelquotum is historische context; actuele providerbeschikbaarheid is tijdens deze kostenloze audit niet opnieuw gemeten. Lokale fixtures, opgeslagen demonstraties, echte historische Dify-runs en menselijke beoordeling worden niet verwisseld. Deze beperkingen blokkeren portfolio-publicatie niet.

De lokale API heeft labtokens, geen SSO of tenant/objectisolatie. Contactminimisatie is heuristisch; broncitaten bewijzen geen correcte interpretatie. Lokale auditdata zijn niet onveranderbaar of door de app versleuteld. Parsergrenzen en timeouts zijn geen volwaardige malware-/processandbox. Er is geen echte CRM-, mail- of productie-infrastructuur en geen aangetoonde bedrijfsbesparing. De securitycontrole is een gerichte bron-, dependency- en secretsreview, geen volledige penetratietest. Alleen fictieve gegevens gebruiken.

### E. Uitgesteld onderhoud

| Voorstel                                                                                                    | Besluit                                      | Reden en bewijs                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PR #7: Node-types 24.19.2 → 26.6.5](https://github.com/phlppgdfry/real-estate-automation-workbench/pull/7) | **C — buiten de afgesloten baseline houden** | Runtime/CI gebruiken Node 24. Types voor Node 26 kunnen API's toestaan die de gekozen runtime niet heeft. CI is groen, maar een runtime-upgrade is niet nodig voor de case.                                                                                |
| [PR #8: TypeScript 5.9.3 → 7.0.2](https://github.com/phlppgdfry/real-estate-automation-workbench/pull/8)    | **B — waardevol, niet noodzakelijk**         | Voorstel vervangt de compiler door native platformpakketten en wijzigt de package-/language-service-API. De huidige configuratie gebruikt `Bundler`, niet de uitgefaseerde `node10`-resolutie. Bestaande PR-CI is groen; geen securitynoodzaak aangetoond. |
| [PR #9: Vite 7.3.7 → 8.3.5](https://github.com/phlppgdfry/real-estate-automation-workbench/pull/9)          | **B — waardevol, niet noodzakelijk**         | Nieuwe buildketen met Rolldown/Oxc in plaats van Rollup/esbuild. Bestaande PR-CI is groen, maar migratie levert voor deze stabiele demo geen noodzakelijke functionaliteit of aangetoonde securityfix.                                                     |

De actuele patches en officiële [Vite-migratiegids](https://github.com/vitejs/vite/blob/v8.0.0/docs/guide/migration.md), [TypeScript-release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2) en [native compilerinformatie](https://github.com/microsoft/typescript-go) zijn gelezen. De voorstellen zijn tijdens deze audit niet lokaal geïnstalleerd; hun groene GitHub-CI is afzonderlijk waargenomen. Alle drie blijven open als zichtbaar onderhoud, niet als onaf projectwerk. Er is geen major-upgrade samengevoegd.

Remote branches: alleen `main` en de drie bijbehorende Dependabot-branches; geen obsolete werkbranch of remote branch zonder bijbehorende PR. Release-tags blijven behouden. Een latere afsluitdocumentatie-PR is de enige bedoelde uitzondering en hoort na merge automatisch te verdwijnen. Beveiligingsupdates blijven normaal onderhoud wanneer nieuwe advisories verschijnen; afsluiting betekent geen garantie dat afhankelijkheden nooit meer onderhoud vragen. Cloud-verificatie en productie-infrastructuur zijn alleen relevant bij een latere wijziging van de claims of echte ingebruikname.

### F. Professionele portfoliosamenvatting

> Designed and implemented, with AI assistance, a fictional real-estate workflow prototype using React, TypeScript, Node.js, SQLite and Dify. Demonstrates durable intake, role-based human approval, source-validated AI suggestions and recoverable handover. Includes an interactive public demo, 80 automated unit/integration tests, 16 browser acceptance tests and reproducible release artifacts. Clearly separates local behavior and historical Cloud evidence from unverified model evaluation and production deployment.

Dit is geschikt voor GitHub, CV, LinkedIn en een technisch interview mits de auteur de keuzes zelf kan uitleggen. Het impliceert geen onafhankelijke ontwikkeling, werkgeverervaring, klantadoptie of productie-exploitatie.

### G. Afsluitbesluit

**PROJECT CLOSED — PORTFOLIO READY WITH DOCUMENTED LIMITATIONS**

Geen bekende P0/P1-blokkade. De enige auditwijzigingen zijn documentair: expliciete afsluiting, dependencybesluiten, een korte stackregel en verduidelijking van het historische werkplan. De functionele v3.0.3-release, opname, architectuur, dependencies en tests blijven ongewijzigd. Geen nieuwe versie, featurebacklog of verdere perfectioneringsronde nodig.
