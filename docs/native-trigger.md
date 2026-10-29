# Native Schedule Trigger en gecontroleerde lokale ontvangst

De vijfde Dify-app **Duin & Dorp · Opvolgtrigger** heeft een echte Schedule Trigger, één Python-Code-node en een Output-node. Geen LLM, HTTP-node, mail of CRM-tool. De [DSL](../dify/apps/follow-up-trigger.yml) en [geteste Python-bron](../dify/code/prepare_followup.py) zijn opgenomen.

## Wat werkelijk is uitgevoerd

Op 29 oktober 2026 om 08:57 Europe/Brussels wachtte Dify Test Run op het volgende geplande minuutmoment. De drie stappen slaagden in 0,483 seconde met 0 modeltokens. Uitvoer:

```json
{ "eventId": "native-schedule-2026-10-29", "kind": "schedule" }
```

Dit is een echte timer-run, geen handmatige uitvoering van alleen de Code-node. De eerdere editorpogingen met foutieve inspringing zijn hersteld door de geteste DSL te importeren; bronvalidatie is niet versoepeld. [Runbewijs](../public/dify/trigger-verification.json).

Na de test is `0 9 * * 1-5`, Europe/Brussels teruggezet. De app is gepubliceerd en de schakelaar op het toegangspunt is daarna uitgezet: **0/1 ingeschakeld**. De release laat geen nieuwe achtergrondtaak actief. Bij triggerworkflows zijn Web App, service-API en MCP niet beschikbaar; er is geen app-sleutel aangemaakt.

## Ontvangst op de lokale API reproduceren

Cloud kan geen localhost op deze Mac bereiken. Een geslaagde Dify-timer bewijst daarom geen automatische aflevering aan de lokale werkplek. De demo gebruikt een expliciete lokale operatorreplay van de vastgelegde uitvoer.

```bash
npm run setup:local
npm run build
npm run server
# Tweede terminal; gebruikt OPERATOR_TOKEN uit genegeerde .env.local
npm run trigger:replay
```

De CLI biedt hetzelfde event twee keer aan. De tweede ontvangst moet `duplicate: true` hebben; `sentEmails` blijft nul. De API bewaart één event. De [CLI-integratietest](../tests/trigger.test.ts) verifieert dit tegen een echte tijdelijke HTTP-server en controleert het aantal opgeslagen events. Gewijzigde inhoud bij dezelfde sleutel geeft een conflict, zoals de bestaande API-test aantoont.

Voor een echte externe integratie zijn een bereikbaar geautoriseerd endpoint, authenticatie en beheerafspraken nodig. Deze release maakt geen tunnel, nieuwe accountverbinding of publiek dossierendpoint. De lokale worker blijft een afzonderlijk uitvoeringspad.

## Zelf importeren

Importeer de DSL in een Workflow-app, controleer de timezone en houd de trigger uit tot je de planning bewust wilt activeren. Voor een korte proef: tijdelijk `* * * * *`, Test Run laten wachten op het volgende minuutmoment, resultaat controleren, daarna werkdagen 09:00 herstellen en de trigger uitschakelen. Geen modelprovider nodig.

Gebaseerd op de actuele [officiële Schedule Trigger-documentatie](https://docs.dify.ai/en/cloud/use-dify/nodes/trigger/schedule-trigger). Een start met User Input en een start met triggers zijn afzonderlijke workflowtypen; gebruik de aparte app.
