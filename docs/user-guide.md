# Handleiding voor de medewerker

De [werkplek](https://phlppgdfry.github.io/real-estate-automation-workbench/?tour) bevat fictieve aanvragen. Elke status heeft één betekenis.

## Controleren en beslissen

Selecteer een naam. Lees de bron, pandgegevens en het voorstel. Controleer juiste referentie, prijs, beschikbaarheid en passend vervolg. Een afspraak is nog niet vastgelegd. **Beslissingen & gebeurtenissen** toont broncitaat en log.

**Goedkeuren & klaarzetten** zet de aanvraag in de CRM-wachtrij; het verstuurt geen bericht. **Handmatig behandelen** haalt de aanvraag uit dit pad. De echte handmatige opvolging gebeurt buiten het prototype.

## Uitzonderingen

Verkocht pand, ontbrekende of onbekende referentie, oude data en verdachte instructies blokkeren goedkeuring. Controleer de gezaghebbende bron en laat iemand opvolgen. Er is geen knop om regels zomaar te negeren.

## Overdracht testen

**CRM-wachtrij verwerken** laat de simulatie ontvangst bevestigen. Met **CRM-fout simuleren** zie je pogingen en wachttijd. Na drie fouten: **Interventie nodig**; volg het [runbook](operations.md).

**Afgehandeld** betekent alleen ontvangst door de CRM-mock, niet dat de klant antwoord kreeg. De teller **Verzonden e-mails** blijft nul.

## Nieuwe aanvraag en reset

Kies **+ Nieuwe aanvraag**, een scenario en fictieve gegevens. De browser onthoudt je demo bij herladen. **Reset demo** herstelt zes fictieve aanvragen. **Proces & impact** rekent met instelbare aannames; **Technisch dossier** opent de bewijsstukken.

## Dify werkbank

De tab **Dify werkbank** toont aanvraaganalyse, dossieradvies en documentcontrole. In de publieke demo kun je voor elk onderdeel een vastgelegde echte run openen; de bronpassages en voorgestelde volgende stap zijn leesbaar zonder JSON te hoeven interpreteren. De technische uitvoer blijft uitklapbaar.

Voor nieuwe modelruns start je de gebouwde werkbank via de lokale server en gebruik je je reviewer-token. Haal lokale dossiers op bij de dossierassistent; deze zijn gescheiden van de zes browserdemo-aanvragen. Documentcontrole accepteert geplakte tekst of TXT/Markdown en doet geen PDF/OCR. De uitkomst blijft een voorstel voor menselijke controle. Zie [installatie, grenzen en screenshots](dify-integration.md).

Onder de resultaten staat **Zo werkt deze flow**. Klik een stap voor invoer, uitvoer en het controlepunt. De testscenario’s tonen verwachte uitkomsten; lokaal kun je een tekstvoorbeeld in het invoerveld laden. Het canvasoverzicht en een afzonderlijke echte runscreenshot blijven aanklikbaar. De documenttabel toont ook de brondekking van de vier basisvelden; een veld zonder gecontroleerd citaat blijft onbevestigd.

## Verbonden dossierwerkplek

Start de [lokale API-werkplek](connected-workspace.md). Ontvang een fictieve aanvraag met reviewerrechten; laat de operator de analysebatch verwerken. Kies een dossier, voeg een fictief document toe en controleer de geminimaliseerde bron. Voor nieuwe Dify-analyse is beschikbare modelconfiguratie nodig; zonder credits blijft het bronbestand lokaal zichtbaar en wordt geen geslaagde analyse geclaimd.

Een inhoudelijke review staat los van het goedkeuren van de aanvraag. Vergelijk elke waarde met het letterlijke broncitaat, pas zo nodig aan of verwijder een onbevestigd veld, en bevestig of wijs af met een controleopmerking. Een onjuist citaat wordt geweigerd. Een verlopen review is niet meer beslisbaar; het document komt terug voor nieuwe analyse. Een onbekende native formulieruitkomst moet eerst worden afgestemd, niet nogmaals ingediend.

Zoek procedures met de gekozen taal. De lokale bronroute werkt zonder providerbudget; de aparte Dify Knowledge-route vereist de beperkte kennisbankconfiguratie. Het resultaat en de herkomst verschijnen leesbaar en krijgen focus. Prijzen en pandstatus blijven afkomstig uit de catalogus. Een andere sessietoken wist eerder geladen dossiers en resultaten.
