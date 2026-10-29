# Dify indelen en onderhouden

Gecontroleerd op 29 oktober 2026. De vier Studio-apps hebben elk één portfoliotag en drie taak- of technieklabels. De indeling is na herladen van Studio gecontroleerd. Zie [het classificatiebestand](../public/dify/classification.json) voor de exacte labels.

Gebruik **Duin & Dorp** om alle portfolio-apps terug te vinden. **Broncontrole** groepeert aanvraaganalyse, dossieradvies en de Agentvergelijking; **Human Input** wijst op de documentflow met expliciete beoordeling. Labels beschrijven gedrag; een label betekent niet dat een run is geslaagd.

## Tags en metadata hebben verschillende taken

App-tags zijn navigatie. De kennisbank gebruikt daarnaast echte documentmetadata `language`, `state` en `version`. De server filtert actuele procedures op taal en controleert elke teruggevonden bron opnieuw tegen de lokale canonieke inhoud. Een tag verleent geen toegang en is geen beveiligingsfilter.

De kennisbank heeft vier opgeslagen tags: Duin & Dorp, Procedures, NL / FR en Fictieve data. Een read-only controle op 29 oktober met de bestaande beperkte Knowledge-sleutel bevestigt alle vier koppelingen. De eerdere UI-koppelingsfout is opgelost.

## Overdracht controleren

- Studio: filter Duin & Dorp; verwacht vier apps met de labels uit het classificatiebestand.
- Knowledge: vijf beschikbare fictieve bronnen; één oude versie blijft bewust bestaan om filters te testen.
- Draai `node --import tsx --env-file=.env.local scripts/dify/verify-knowledge.ts`; verwacht NL/FR-resultaten en de oude-versiecontrole.
- Documentcontrole: de gepubliceerde export bevat dezelfde 23 nodeconfiguraties (inclusief uitlegkaarten) en 16 verbindingen als de importbron.
- Human Input: formulierpauze is live gezien; hervatting is door het uitgeputte modelquotum nog niet live bevestigd.
- Houd publieke webapps uitgeschakeld en sleutels uitsluitend in de genegeerde lokale configuratie.

De complete resterende scope staat in [het werkplan](implementation-v3.md). Nieuwe technieken worden toegevoegd wanneer ze een aantoonbare procesverbetering leveren; het portfolio claimt geen gebruik van elke Dify-functie.

## Native kennisbankbinding

Dify gebruikt in de canvas-export een versleutelde workspaceverwijzing; een UUID uit de Knowledge API is geen vervanging daarvan. Controleer na import of de kennisbank werkelijk in de node staat, koppel haar via **Add Kennisbank** opnieuw en stel de metadatafilters opnieuw in. Een algemene groene checklist alleen bewijst de binding niet. De losse retrievaltest zonder gekoppelde kennisbank kan ten onrechte succesvol met een lege lijst eindigen.
