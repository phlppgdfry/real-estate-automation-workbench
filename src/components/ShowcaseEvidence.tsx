import benchmark from '../../data/benchmark-report.json';
import trigger from '../../data/trigger-verification.json';

const repo = 'https://github.com/phlppgdfry/real-estate-automation-workbench/blob/main/';
export function ShowcaseEvidence() {
  const localRuns = benchmark.results.filter((r) => r.status === 'passed');
  return (
    <section className="dify-card" aria-label="Bewijs en resterende grenzen">
      <p className="eyebrow">Controleer zelf wat er werkelijk is uitgevoerd</p>
      <h3>Van werkende demo naar aantoonbaar gedrag</h3>
      <div className="dify-table">
        <table>
          <thead>
            <tr>
              <th>Onderdeel</th>
              <th>Bewijs</th>
              <th>Grens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Intake → goedkeuring → overdracht</td>
              <td>Echte lokale HTTP-keten, herstart en hersteltests</td>
              <td>Fictieve aanvragen en een afzonderlijke HTTP-testdienst; geen productie-CRM.</td>
            </tr>
            <tr>
              <td>Documentreview</td>
              <td>Citaten, correcties, afwijzing, verlopen controle en gescheiden rollen</td>
              <td>Native Dify-formulierpauze gezien; Cloud-hervatting wacht op modelbudget.</td>
            </tr>
            <tr>
              <td>Actuele NL/FR-procedures</td>
              <td>Echte Knowledge API-runs en onafhankelijke broncontrole</td>
              <td>Kleine trefwoordcollectie; volledige chatflow door modelquotum geblokkeerd.</td>
            </tr>
            <tr>
              <td>Native Schedule Trigger</td>
              <td>
                {trigger.steps} stappen · {trigger.elapsedSeconds} s · {trigger.totalTokens}{' '}
                modeltokens
              </td>
              <td>
                Echte geplande testrun. Gepubliceerd en daarna uitgeschakeld; lokale replay is een
                afzonderlijke stap.
              </td>
            </tr>
            <tr>
              <td>Directe query / vaste workflow / Agent</td>
              <td>{localRuns.length} lokale vergelijkingsruns met gelijke criteria</td>
              <td>
                De vaste Python-nodes zijn lokaal uitgevoerd. Nieuwe Cloud-benchmark en
                onafhankelijke labels zijn niet uitgevoerd.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Nieuwe modelruns zijn uitgesteld: het gratis Dify-modelquotum is opgebruikt. De demo, lokale
        werkplek, evaluatie en storingsdrill werken zonder providerbudget.
      </p>
      <div className="doc-links">
        <a href={`${repo}docs/release-readiness.md`}>Releasecontrole en bekende grenzen ↗</a>
        <a href={`${import.meta.env.BASE_URL}dify/trigger-verification.json`}>
          Native timerbewijs ↗
        </a>
        <a href={`${import.meta.env.BASE_URL}dify/benchmark.json`}>
          Vergelijkingsrapport met uitvoeringsmodus ↗
        </a>
      </div>
    </section>
  );
}
