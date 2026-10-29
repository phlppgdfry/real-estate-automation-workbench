# Beveiliging en gegevensgrenzen

Dit is een lokale portfolio-opstelling met fictieve data. De API bindt aan 127.0.0.1; labtokens zijn geen productie-identiteitsbeheer. De openbare Pages-site biedt een browsersimulatie en opgeslagen runbewijs. De Dify-webapps zijn uitgeschakeld; de geteste opvolgtrigger staat eveneens uit.

Gebruik geen echte klantgegevens. Contactminimisatie is een heuristiek, geen volledige anonimisering. Dify kan aangeleverde inhoud en logs volgens de workspace-instellingen bewaren. De native Agent-sandbox is geen alleen-lezen beveiligingsgrens. Een schema en broncitaat zijn geen garantie op juiste interpretatie.

## Een kwetsbaarheid melden

Publiceer geen werkende sleutels, persoonsgegevens, formulierlinks of exploitdetails in een openbaar issue. Gebruik bij voorkeur [een private GitHub-securitymelding](https://github.com/phlppgdfry/real-estate-automation-workbench/security/advisories/new). Als die optie niet beschikbaar is, mail de maintainer via het openbare GitHub-profiel met een korte omschrijving zonder gevoelige inhoud. Er wordt geen reactietijd of beveiligingscertificering beloofd.

## Verificatie

`npm run check` controleert onder meer bron/DSL-sync, rechten, bronvalidatie, herstel en een scan van publiceerbare bestanden. De scan weigert herkenbare credentialpatronen en de exacte lokaal geconfigureerde geheimen; dit is aanvullende detectie, geen bewijs dat er nooit een geheim aanwezig kan zijn. GitHub Actions zijn op officiële commit-SHA’s vastgepind; releasebestanden bevatten een broncommit en SHA-256-manifest.

Vóór echte inzet zijn SSO/objectrechten, retentie, back-ups en restore, rate limiting, leverancierscontracten en een gecontroleerde pilot nodig. [Runbook](docs/operations.md).
