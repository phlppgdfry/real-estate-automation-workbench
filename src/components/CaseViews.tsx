import { useState } from 'react';
import evaluation from '../../data/evaluation-report.json';
const repo = 'https://github.com/phlppgdfry/real-estate-automation-workbench';
export function Impact() {
  const [volume, setVolume] = useState(250);
  const [before, setBefore] = useState(8);
  const [after, setAfter] = useState(4);
  const [rate, setRate] = useState(35);
  const [cost, setCost] = useState(120);
  const [investment, setInvestment] = useState(3500);
  const hours = (volume * (before - after)) / 60;
  const net = hours * rate - cost;
  return (
    <section className="case-view">
      <h2>Een beter proces, aantoonbaar gemaakt.</h2>
      <p className="intro">
        De eerste winst zit in minder overdrachtswerk en duidelijk eigenaarschap. AI is één
        onderdeel van die keten.
      </p>
      <div className="process-columns">
        <div>
          <h3>Vandaag · werkhypothese</h3>
          <ol>
            <li>Aanvraag lezen in mailbox of portaal.</li>
            <li>Gegevens opnieuw invoeren in CRM.</li>
            <li>Pand opzoeken; prijs en status controleren.</li>
            <li>Antwoord schrijven en collega informeren.</li>
            <li>Handmatig controleren of iemand opvolgt.</li>
          </ol>
        </div>
        <div>
          <h3>Voorgestelde werkwijze</h3>
          <ol>
            <li>Gevalideerde aanvraag één keer ontvangen.</li>
            <li>Doel en pandreferentie uit bron halen.</li>
            <li>Catalogusregels controleren, uitzonderingen blokkeren.</li>
            <li>Medewerker controleert het antwoordvoorstel.</li>
            <li>Betrouwbare overdracht met ontvangstbevestiging.</li>
          </ol>
        </div>
      </div>
      <div className="calculator">
        <div>
          <h3>Maak de afweging zelf</h3>
          <p>
            Alle waarden zijn instelbare aannames. Dit is een scenario, geen gerealiseerde
            besparing.
          </p>
          {[
            ['Aanvragen per maand', volume, setVolume, 0, 2000],
            ['Minuten vóór', before, setBefore, 0, 30],
            ['Minuten ná', after, setAfter, 0, 30],
            ['Kost per uur (€)', rate, setRate, 0, 150],
            ['Beheer en tools per maand (€)', cost, setCost, 0, 2000],
            ['Eenmalige implementatie (€)', investment, setInvestment, 0, 30000],
          ].map(([label, value, set, min, max]) => (
            <label key={String(label)}>
              {String(label)}
              <input
                type="number"
                min={Number(min)}
                max={Number(max)}
                value={Number(value)}
                onChange={(e) =>
                  (set as (v: number) => void)(
                    Math.max(Number(min), Math.min(Number(max), Number(e.target.value))),
                  )
                }
              />
            </label>
          ))}
        </div>
        <div className="impact-result">
          <span>Potentiële capaciteit per maand</span>
          <strong>{hours.toLocaleString('nl-BE', { maximumFractionDigits: 1 })} uur</strong>
          <p>
            Netto capaciteitswaarde:{' '}
            <b>€ {net.toLocaleString('nl-BE', { maximumFractionDigits: 0 })}/maand</b>
          </p>
          <p>
            Indicatieve terugverdientijd:{' '}
            <b>
              {net > 0
                ? `${(investment / net).toLocaleString('nl-BE', { maximumFractionDigits: 1 })} maanden`
                : 'geen positieve businesscase'}
            </b>
          </p>
          <p className="fine">
            Capaciteit is geen cashbesparing. Meet een nulmeting en pilot; tel controle,
            uitzonderingen, licenties en beheer mee.
          </p>
        </div>
      </div>
      <h3>Zo toets je de pilot</h3>
      <table>
        <thead>
          <tr>
            <th>Indicator</th>
            <th>Meting</th>
            <th>Eigenaar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Eerste persoonlijke reactie</td>
            <td>Mediaan + P90 tussen ontvangst en menselijke reactie; alleen kantooruren</td>
            <td>Teamverantwoordelijke</td>
          </tr>
          <tr>
            <td>Actieve behandeltijd</td>
            <td>Steekproef vóór/na, inclusief uitzonderingen</td>
            <td>Procesverantwoordelijke</td>
          </tr>
          <tr>
            <td>Verkeerde pandinfo / dubbele CRM-records</td>
            <td>Elke dag controle; één ernstige fout stopt de pilot</td>
            <td>Beheerder</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
export function Technical() {
  return (
    <section className="case-view">
      <h2>Van demo naar controleerbare techniek.</h2>
      <p className="intro">
        De browserdemo en lokale API delen dezelfde domeinregels. De opslag en uitvoering zijn
        bewust gescheiden.
      </p>
      <div className="architecture">
        <span>Ondertekende webhook</span>
        <b>→</b>
        <span>Duurzame inbox</span>
        <b>→</b>
        <span>Validatie + intentie</span>
        <b>→</b>
        <span>Cataloguscontrole</span>
        <b>→</b>
        <span>Goedkeuring</span>
        <b>→</b>
        <span>SQLite-outbox</span>
        <b>→</b>
        <span>CRM-mock + ontvangst</span>
      </div>
      <div className="process-columns">
        <div>
          <h3>Werkend in deze repo</h3>
          <ul>
            <li>HMAC-SHA256 op exacte payload + timestamp.</li>
            <li>Herhaalde events leveren hetzelfde record op.</li>
            <li>Ontvangst vóór AI; workerlease met bescherming tegen oude workers.</li>
            <li>Aparte lees-, beoordelings- en beheerrechten in de lab-API.</li>
            <li>Goedkeuring met versiecontrole.</li>
            <li>Lead en outbox in één database-transactie.</li>
            <li>Persistente CRM-mock met unieke externe sleutel.</li>
            <li>Retry met wachttijd en herstel met reden na drie fouten.</li>
            <li>AI-uitvoer met schema én bronvalidatie.</li>
          </ul>
        </div>
        <div>
          <h3>Grenzen van het bewijs</h3>
          <ul>
            <li>Pages draait zonder server, AI of echt CRM.</li>
            <li>De API draait lokaal met een enkel proces.</li>
            <li>Geen verzendfunctie, echte CRM-connector of agenda.</li>
            <li>Labrollen zijn geen productie-SSO of tenantisolatie.</li>
            <li>Live AI is pas geverifieerd na een echte API-test.</li>
            <li>Patroonherkenning detecteert niet elke promptinjectie.</li>
          </ul>
        </div>
      </div>
      <section className="evaluation" aria-label="Evaluatie van de herkenningsregels">
        <h3>Kwaliteit meten, ook waar het misgaat</h3>
        <p>
          Ontwikkelset:{' '}
          <strong>
            {evaluation.development.passed}/{evaluation.development.total}
          </strong>
          . Diagnostische challengeset:{' '}
          <strong>
            {evaluation.challenge.passed}/{evaluation.challenge.total}
          </strong>
          . Gemiste handmatige controles in deze set:{' '}
          <strong>{evaluation.challenge.missedManualReview}</strong>.
        </p>
        <p className="fine">
          Drie taalvarianten gaan onnodig naar een medewerker. Deze AI-geschreven voorbeelden zijn
          tijdens de review gebruikt en zijn geen onafhankelijke benchmark of live AI-test.
        </p>
        <a href={`${import.meta.env.BASE_URL}evaluation.json`}>
          Open het reproduceerbare meetrapport ↗
        </a>
      </section>
      <h3>Beoordeel de bron</h3>
      <div className="doc-links">
        {[
          ['START-HERE.md', 'Start hier · 2 / 5 / 15 minuten'],
          ['EVIDENCE.md', 'Functie-eis → code → test'],
          ['docs/senior-review.md', 'Senior review · bevindingen, fixes en grenzen'],
          ['docs/evaluation.md', 'Evaluatie · methode, missers en releasebesluit'],
          ['docs/architecture.md', 'Architectuur & API-contract'],
          ['docs/decisions.md', 'Ontwerpkeuzes & alternatieven'],
          ['docs/operations.md', 'Beheer, privacy & pilot'],
          ['docs/knowledge.md', 'Technische begrippen & oefeningen'],
          ['tests', 'Uitvoerbare tests'],
        ].map(([path, label]) => (
          <a key={path} href={`${repo}/blob/main/${path}`}>
            {label}
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
