import { ComparisonSchema } from '../comparison-contract';
import { AssistanceSchema, DocumentReviewSchema } from '../dify-contracts';
import { z } from 'zod';
type Result = Record<string, unknown>;
export function ReadableResult({ value }: { value: Result }) {
  const data = (value.result ?? value) as Result;
  const assistance = AssistanceSchema.safeParse(data.proposal),
    document = DocumentReviewSchema.safeParse(data.review),
    comparison = ComparisonSchema.safeParse(data.comparison);
  const extraction = z
    .object({
      intent: z.enum(['visit', 'valuation', 'search', 'unknown']),
      reference: z.string().nullable(),
      evidence: z.string(),
    })
    .safeParse(data.extraction);
  const labels: Record<string, string> = {
    visit: 'Bezoekaanvraag',
    valuation: 'Waardebepaling',
    search: 'Zoekvraag',
    unknown: 'Handmatig beoordelen',
    reference: 'Referentie',
    price: 'Vraagprijs',
    city: 'Gemeente',
    status: 'Status',
    epc: 'EPC',
    area: 'Oppervlakte',
  };
  return (
    <>
      {value.status ? (
        <p className="dify-note">
          Vastgelegde echte run · {value.status === 'passed' ? 'geslaagd' : 'mislukt'} · geen nieuwe
          modelaanroep
        </p>
      ) : null}
      {extraction.success ? (
        <>
          <h4>{labels[extraction.data.intent]}</h4>
          <p>{extraction.data.reference ?? 'Geen pandreferentie opgegeven'}</p>
          <blockquote>{extraction.data.evidence}</blockquote>
          <p>Controleer de intentie en het broncitaat vóór verdere verwerking.</p>
        </>
      ) : null}
      {assistance.success ? (
        <>
          <h4>{assistance.data.summary}</h4>
          <p>
            <strong>Volgende stap voor de medewerker</strong>
            <br />
            {assistance.data.next_action}
          </p>
          {assistance.data.facts.map((f, i) => (
            <blockquote key={i}>
              <small>{f.source_id} · aangeleverd statusfeit</small>
              <br />
              {f.quote}
            </blockquote>
          ))}
          {assistance.data.risks.map((r, i) => (
            <p key={i}>Aandachtspunt: {r}</p>
          ))}
        </>
      ) : null}
      {document.success ? (
        <>
          <div className="dify-table">
            <table>
              <thead>
                <tr>
                  <th>Veld</th>
                  <th>Gevonden waarde & bron</th>
                </tr>
              </thead>
              <tbody>
                {document.data.facts.map((f) => (
                  <tr key={f.field}>
                    <td>{labels[f.field]}</td>
                    <td>
                      <strong>{f.value}</strong>
                      <br />
                      <small>{f.quote}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Niet bevestigde of ontbrekende velden:{' '}
            {document.data.missing_fields.map((f) => labels[f]).join(', ') ||
              'alle basisvelden hebben een gecontroleerd citaat'}
            .
          </p>
          {document.data.risks.map((r, i) => (
            <p key={i}>Aandachtspunt: {r}</p>
          ))}
          <p>
            Brondekking basisvelden:{' '}
            <strong>
              {
                ['reference', 'price', 'city', 'status'].filter((field) =>
                  document.data.facts.some((fact) => fact.field === field),
                ).length
              }
              /4
            </strong>
            . Controleer ook velden die het model mogelijk heeft overgeslagen.
          </p>
        </>
      ) : null}
      {comparison.success ? (
        <>
          <h4>{comparison.data.suggested_references.length} passende opties voor beoordeling</h4>
          <p>{comparison.data.summary}</p>
          <div className="dify-table">
            <table>
              <thead>
                <tr>
                  <th>Pand & bron</th>
                  <th>Prijs</th>
                  <th>Slaapkamers</th>
                  <th>Uitkomst</th>
                </tr>
              </thead>
              <tbody>
                {comparison.data.comparisons.map((p) => (
                  <tr key={p.reference}>
                    <td>
                      <strong>{p.title}</strong>
                      <br />
                      {p.city} · {p.source_id}
                    </td>
                    <td>
                      {new Intl.NumberFormat('nl-BE', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                      }).format(p.price)}
                    </td>
                    <td>{p.bedrooms}</td>
                    <td>
                      {comparison.data.suggested_references.includes(p.reference)
                        ? 'Optie voor beoordeling'
                        : 'Voldoet niet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Uitsluitingscodes: sold = verkocht; city = gemeente; price = prijs; bedrooms =
            slaapkamers.
          </p>
          {comparison.data.excluded.map((p) => (
            <p key={p.reference}>
              {p.reference}: {p.reasons.join(', ')}
            </p>
          ))}
          <p>Fictieve snapshot · menselijke controle vereist · geen afspraak of CRM-actie.</p>
        </>
      ) : null}
      <details>
        <summary>Technische uitvoer & runmetadata</summary>
        <pre className="dify-result" tabIndex={0}>
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    </>
  );
}
