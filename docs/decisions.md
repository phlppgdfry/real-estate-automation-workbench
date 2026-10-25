# Ontwerpkeuzes

Voor de technisch verantwoordelijke. De afwegingen gaan over een toetsbare portfolio-case, niet over een onbekende echte IT-omgeving.

## ADR-01 — AI extraheert, beleid beslist

Opties: vrije agent met tools, schema-extractor, alleen regels. Keuze: optionele extractor met bewijsvelden, daarna domeincode en catalogusgebonden template. Openbare demo gebruikt regels. Templates beperken stijl, maar voorkomen modelverzonnen prijzen. Schema en letterlijk citaat zijn niet voldoende om waarheid te bewijzen; daarom controleert een medewerker elk voorstel. Voor productie: representatieve meertalige testset en correctiemeting, niet alleen geldig JSON tellen.

## ADR-02 — Maatwerk kern, low-code aan de rand

Opties: Make/n8n/Power Automate als volledige workflow, eigen app, hybride. Keuze hier: kleine TypeScript-kern met webhook. Een low-code tool kan later aanleveren. Dat laat transacties en tests direct beoordelen. In een Microsoft-omgeving met beheerders kan Power Automate goedkoper te beheren zijn. Vergelijk in discovery licenties, connectoren, DLP, debugging en eigenaarschap. Er wordt geen gedeployde low-code flow geclaimd.

## ADR-03 — SQLite voor het lab

Opties: browseropslag, SQLite, beheerde PostgreSQL. Keuze: browseropslag voor Pages, SQLite voor herstart-/rollbackbewijs. Eén applicatieproces, één worker, beperkte dataset. Meerdere instanties en fijnmazige rollen kunnen PostgreSQL logischer maken. Een JSON-body vereenvoudigt dit lab, maar maakt rapportage en migraties lastiger. Geen claim van productie-databasebeheer.

## ADR-04 — Goedkeuring is klaarzetten

Opties: direct mailen, concept opslaan, CRM-opvolgtaak. Keuze: goedgekeurd voorstel plus taak in CRM-mock. Geen agenda- of e-mailadapter. Het resultaat is klein en controleerbaar. Afgehandeld betekent ontvangst door mock, niet antwoord aan klant. Verzending, afleverstatus en afspraken zijn een afzonderlijk ontwerp.

## ADR-05 — Outbox met ontvangst

Een directe CRM-call na opslaan laat een gat bij een crash. Daarom leadwijziging en outbox atomair. De duurzame mock maakt foutinjectie mogelijk. Een echte CRM-call vraagt remote idempotentie en afstemming: een lokale unieke sleutel is niet voldoende.

Vorige: [architectuur](architecture.md). Volgende: [beheer](operations.md).
