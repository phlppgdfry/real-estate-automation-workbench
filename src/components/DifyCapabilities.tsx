export function DifyCapabilities() {
  return (
    <section className="dify-card" aria-label="Dify functies en afwegingen">
      <p className="eyebrow">Technische keuzes die je kunt uitleggen</p>
      <h3>Welke Dify-functies leveren hier waarde?</h3>
      <p>
        Elke uitbreiding heeft een afgebakende taak. De native Agent is een beta-pilot met fictieve
        data; de bestaande workflows blijven afzonderlijk bruikbaar.
      </p>
      <div className="dify-table">
        <table>
          <thead>
            <tr>
              <th>Functie</th>
              <th>Gebruik in deze case</th>
              <th>Waarom / grens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Workflow & Chatflow</td>
              <td>Aanvraag, document en dossieradvies</td>
              <td>Vaste stappen, broncitaten en gecontroleerde uitvoer.</td>
            </tr>
            <tr>
              <td>Build Mode & build note</td>
              <td>Echt gebruikt voor de Pandvergelijker</td>
              <td>
                Skill getest en context vastgelegd; daarna wijzigingen beoordeeld en toegepast.
              </td>
            </tr>
            <tr>
              <td>Native Agent, Skill & Agent Node</td>
              <td>Gepubliceerde Agent in een vierde workflow</td>
              <td>Python-catalogusquery, bron-ID’s en een onafhankelijke guard na de Agent.</td>
            </tr>
            <tr>
              <td>Code, schema’s, logs & versies</td>
              <td>Gebruikt en getest</td>
              <td>
                Een modelvoorstel passeert alleen bij geldige criteria en bronnen. Een schema
                bewijst geen juiste interpretatie.
              </td>
            </tr>
            <tr>
              <td>Menselijke goedkeuring</td>
              <td>In de eigen applicatie</td>
              <td>
                Reviewerrol en transactionele outbox. De Dify Human Input-node is hier niet
                ingericht.
              </td>
            </tr>
            <tr>
              <td>Knowledge / RAG</td>
              <td>Bewust nog niet</td>
              <td>
                Zes catalogusrecords zijn beter exact opvraagbaar. RAG past later bij een beheerde
                documentencollectie met actualisatie en bronrechten.
              </td>
            </tr>
            <tr>
              <td>MCP, triggers & schrijvende tools</td>
              <td>Niet ingeschakeld</td>
              <td>
                Eerst echte systeemcontracten, toegangsrechten en beheerafspraken vastleggen. Geen
                automatisch CRM- of e-mailverkeer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <details>
        <summary>Import, kosten en resterende beperkingen</summary>
        <p>
          Een native Agent-export bevat niet de skillbestanden zelf. De repo levert daarom de
          daadwerkelijk gebruikte skill-zip, de bronbestanden en een importhandleiding. Op het
          huidige Dify-plan blokkeerde ook herimport op de app-limiet; de bestaande live flow is
          rechtstreeks afgewerkt.
        </p>
        <p>
          De geslaagde workflowtest duurde 20,335 seconden en rapporteerde 18.197 tokens. Dit is één
          waarneming, geen prestatiebenchmark. De Linux-sandbox kan commando’s uitvoeren en is geen
          harde grens voor alleen-lezen toegang. Gebruik uitsluitend fictieve data en geen
          bedrijfssleutels in deze pilot.
        </p>
        <a href="https://github.com/phlppgdfry/real-estate-automation-workbench/blob/main/docs/dify-agent-review.md">
          Bronnen, reproduceerbaarheid en verbeterpad ↗
        </a>
      </details>
    </section>
  );
}
