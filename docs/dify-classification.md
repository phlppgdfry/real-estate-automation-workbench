# Dify indelen en onderhouden

Gecontroleerd op 28 oktober 2026. De vier Studio-apps hebben elk één portfoliotag en drie taak- of technieklabels. De indeling is na herladen van Studio gecontroleerd. Zie [het classificatiebestand](../public/dify/classification.json) voor de exacte labels.

Gebruik **Duin & Dorp** om alle portfolio-apps terug te vinden. **Broncontrole** groepeert aanvraaganalyse, dossieradvies en de Agentvergelijking; **Human Input** wijst op de documentflow met expliciete beoordeling. Labels beschrijven gedrag; een label betekent niet dat een run is geslaagd.

## Tags en metadata hebben verschillende taken

App-tags zijn navigatie. De kennisbank gebruikt daarnaast echte documentmetadata `language`, `state` en `version`. De server filtert actuele procedures op taal en controleert elke teruggevonden bron opnieuw tegen de lokale canonieke inhoud. Een tag verleent geen toegang en is geen beveiligingsfilter.

De kennisbank heeft vier aangemaakte tagdefinities: Duin & Dorp, Procedures, NL / FR en Fictieve data. De Cloud-UI navigeert bij selecteren naar Documents en bewaart de koppeling niet. Een read-only controle met de beperkte Knowledge-sleutel bevestigt nul gekoppelde tags. Dit is nog open; er is geen ruimere sleutel aangemaakt om dit te omzeilen.

## Overdracht controleren

- Studio: filter Duin & Dorp; verwacht vier apps met de labels uit het classificatiebestand.
- Knowledge: vijf beschikbare fictieve bronnen; één oude versie blijft bewust bestaan om filters te testen.
- Draai `node --import tsx --env-file=.env.local scripts/dify/verify-knowledge.ts`; verwacht NL/FR-resultaten en de oude-versiecontrole.
- Documentcontrole: onderscheid de gepubliceerde uitvoeringslogica van nog te synchroniseren uitlegkaarten.
- Human Input: formulierpauze is live gezien; hervatting is door het uitgeputte modelquotum nog niet live bevestigd.
- Houd publieke webapps uitgeschakeld en sleutels uitsluitend in de genegeerde lokale configuratie.

De complete resterende scope staat in [het werkplan](implementation-v3.md). Nieuwe technieken worden toegevoegd wanneer ze een aantoonbare procesverbetering leveren; het portfolio claimt geen gebruik van elke Dify-functie.
