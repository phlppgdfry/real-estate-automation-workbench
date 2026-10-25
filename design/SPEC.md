# Duin & Dorp — ontwerp

Bron: `concept.png`, gegenereerd met de ingebouwde Image Gen-tool. Gekozen door de uitvoerende agent binnen de vrije ontwerpopdracht. Geen externe merkassets.

Volledige primaire werkplek op 1536×1024: zijbalk 210–238px, kop met twee acties, vier onomkaderde tellers, procesbalk, aanvraaglijst en detailpaneel. Wit canvas, grijze zijbalk #f5f7f8, inkt #172b32, teal #12675b, zachte teal #e7f3f0, grens #dce4e8. Geen foto, overlay, externe fonts of iconen nodig. Woordmerk met letter D; symbolen in knoppen zijn tekst.

Sans: system-ui; kop 32px/1.2, paneelkop 21px, body 14–15px/1.6, labels 11px/1.4. Radius 5px, tussenruimte 8/12/16/24/32. Zijbalknav 16px. Geselecteerde rij teal achtergrond en linkerrand. Brontekst grijs, voorstel zacht teal, controles oranje. Knoppen 40–44px hoog met zichtbare focus. Op mobiel wordt nav horizontaal, metrics 2×2, lijst en detail onder elkaar.

Toegestane hoofdcopy: duin & dorp; Vastgoedwerkplek; Aanvragen; Proces & impact; Technisch dossier; Portfolio · fictieve data; Elke aanvraag, goed opgevolgd.; Van eerste contact naar een gecontroleerde volgende stap.; Rondleiding; + Nieuwe aanvraag; Aanvragen; Te beoordelen; CRM-wachtrij; Verzonden e-mails; Ontvangen; Geanalyseerd; Gecontroleerd; CRM-overdracht; Zoek op naam of referentie; Alles; Afgehandeld. Detailcopy volgt de seedbron; aantallen worden echt berekend. Operationele details (log, foutinjectie, reset) staan onder de hoofdwerkplek. Tour is een toegankelijk dialoogvenster, 7 stappen met vorige/volgende/sluiten. Nieuwe aanvraag is een formulierdialoog.

Componenten: Shell, Metrics, LeadList, LeadDetail, IntakeForm, Tour, Impact, Technical. Browserstate gebruikt dezelfde pure domeinfuncties als de server, maar een aparte lokale adapter. Geen netwerkillusie: browseroverdracht wordt steeds simulatie genoemd.
