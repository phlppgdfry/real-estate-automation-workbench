import { useState } from 'react';
import { ComparisonSchema } from '../comparison-contract';
import { DifyCapabilities } from './DifyCapabilities';
import { DifyGallery } from './DifyGallery';
import { DifyFlowGuide } from './DifyFlowGuide';
import { AssistanceSchema, DocumentReviewSchema } from '../dify-contracts';
import { z } from 'zod';
type Result = Record<string, unknown>;
const base = import.meta.env.BASE_URL;
const tools = [
  ['analyse', 'Aanvraaganalyse'],
  ['assist', 'Dossierassistent'],
  ['document', 'Documentcontrole'],
  ['compare', 'Agent · Pandvergelijker'],
] as const;
function ReadableResult({ value }: { value: Result }) {
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
export function DifyWorkbench() {
  const [tool, setTool] = useState<string>('analyse'),
    [token, setToken] = useState(''),
    [text, setText] = useState('Kunt u een waardebepaling van mijn woning in Oudenburg regelen?'),
    [city, setCity] = useState('Oudenburg'),
    [maxPrice, setMaxPrice] = useState(390000),
    [minBedrooms, setMinBedrooms] = useState(3),
    [leadId, setLeadId] = useState(''),
    [cases, setCases] = useState<{ id: string; status: string }[]>([]),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const local =
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
    !new URLSearchParams(location.search).has('evidence');
  async function loadCases() {
    setError('');
    try {
      const response = await fetch('/api/leads', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Dossiers ophalen mislukt. Controleer je reviewer-token.');
      const data = await response.json();
      const list = z.array(z.object({ id: z.string(), status: z.string() })).parse(data.leads);
      setCases(list);
      if (list[0]) setLeadId(list[0].id);
      else
        setError(
          'Er zijn nog geen lokale dossiers. Voeg eerst een fictieve aanvraag toe via de lokale ketentest.',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt.');
    }
  }
  async function run() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const payload =
        tool === 'compare'
          ? { question: text, city, maxPrice, minBedrooms }
          : tool === 'analyse'
            ? { message: text }
            : tool === 'assist'
              ? { leadId, question: text }
              : { text };
      const response = await fetch(`/api/dify/${tool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(tool === 'compare' ? 85000 : 45000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? 'Reviewer-token ontbreekt of is ongeldig.'
            : response.status === 403
              ? 'Deze rol mag geen AI-aanvragen uitvoeren.'
              : (data.message ?? data.error ?? 'Aanvraag mislukt.'),
        );
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aanvraag mislukt.');
    } finally {
      setBusy(false);
    }
  }
  async function example() {
    setError('');
    try {
      const response = await fetch(`${base}dify/evidence.json`);
      if (!response.ok) throw new Error('Bewijsbestand niet beschikbaar.');
      const data = await response.json();
      const entry = data.cases.find((x: { tool: string }) => x.tool === tool);
      if (!entry) throw new Error('Nog geen vastgelegde run voor dit onderdeel.');
      setResult(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt.');
    }
  }
  return (
    <section className="dify-workbench" aria-label="Dify werkbank">
      <div className="section-title">
        <div>
          <p className="eyebrow">AI met broncontrole</p>
          <h2>Van aanvraag naar onderbouwd voorstel</h2>
          <p>
            Vier gespecialiseerde toepassingen. Elke uitkomst vraagt controle door een medewerker.
          </p>
        </div>
        <a href="https://github.com/phlppgdfry/real-estate-automation-workbench/blob/main/docs/dify-integration.md">
          Installatie & bewijs ↗
        </a>
      </div>
      <div className="dify-tabs">
        {tools.map(([id, label]) => (
          <button
            key={id}
            disabled={busy}
            aria-pressed={tool === id}
            className={tool === id ? 'primary' : ''}
            onClick={() => {
              setTool(id);
              setResult(null);
              setError('');
              setText(
                id === 'compare'
                  ? 'Vergelijk beschikbare panden in Oudenburg tot 390000 euro met minstens 3 slaapkamers. Waarom voldoet DD-223 niet?'
                  : id === 'analyse'
                    ? 'Kunt u een waardebepaling van mijn woning in Oudenburg regelen?'
                    : id === 'assist'
                      ? 'Waarom is deze aanvraag geblokkeerd en wat is de veilige volgende stap?'
                      : 'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR\nStatus: beschikbaar\nOppervlakte: 145 m²\nEPC: 158 kWh/m²/jaar\nContact: fictief@example.com',
              );
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="dify-grid">
        <div className="dify-card">
          <h3>{tools.find((x) => x[0] === tool)?.[1]}</h3>
          <p>
            {tool === 'compare'
              ? 'Een native Agent gebruikt een lokale Python-skill. Daarna controleert code alle bronvelden en zoekcriteria opnieuw. De Linux-sandbox is geen harde grens voor alleen-lezen toegang.'
              : tool === 'analyse'
                ? 'Herkent bezoek, waardebepaling of zoekvraag, met letterlijk bewijs uit het bericht.'
                : tool === 'assist'
                  ? 'Verklaart een bestaand dossier op basis van gecontroleerde statusfeiten. De assistent heeft geen actietools.'
                  : 'Haalt pandgegevens uit tekst en toont de exacte bronpassage. Contactdetails worden vooraf beperkt; controle blijft nodig.'}
          </p>
          {local ? (
            <>
              <label>
                Reviewer-token
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Alleen in geheugen van dit tabblad"
                />
              </label>
              {tool === 'assist' ? (
                <>
                  <button disabled={!token} onClick={loadCases}>
                    Lokale dossiers ophalen
                  </button>
                  <label>
                    Dossier
                    {cases.length ? (
                      <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                        {cases.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} · {c.status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={leadId}
                        onChange={(e) => setLeadId(e.target.value)}
                        placeholder="Dossier-ID"
                      />
                    )}
                  </label>
                </>
              ) : null}
              {tool === 'compare' ? (
                <div className="comparison-criteria">
                  <label>
                    Gemeente
                    <input value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
                  </label>
                  <label>
                    Maximumprijs (€)
                    <input
                      type="number"
                      min={1}
                      max={10000000}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Minimaal slaapkamers
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      value={minBedrooms}
                      onChange={(e) => setMinBedrooms(Number(e.target.value))}
                    />
                  </label>
                </div>
              ) : null}
              <label>
                {tool === 'document'
                  ? 'Documenttekst (maximaal 12.000 tekens)'
                  : 'Vraag of aanvraag'}
                <textarea
                  id="dify-input"
                  rows={8}
                  maxLength={tool === 'document' ? 12000 : tool === 'analyse' ? 4000 : 1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              {tool === 'document' ? (
                <label>
                  Tekstbestand toevoegen (.txt of .md)
                  <input
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!/\.(txt|md)$/i.test(f.name) || f.size > 12000) {
                        setError('Gebruik een TXT- of Markdown-bestand van maximaal 12 kB.');
                        return;
                      }
                      setText(await f.text());
                      setError('');
                    }}
                  />
                </label>
              ) : null}
              <button
                className="primary"
                disabled={busy || !token || !text.trim() || (tool === 'assist' && !leadId)}
                onClick={run}
              >
                {busy ? 'Dify verwerkt…' : 'Echt uitvoeren via lokale API'}
              </button>
              <p className="muted">
                Gebruik de lokale installatie uit de handleiding. Je sessietoken blijft alleen in
                dit tabblad. Gebruik uitsluitend fictieve gegevens.
              </p>
            </>
          ) : (
            <div className="dify-note">
              <strong>Publieke bewijsweergave</strong>
              <p>
                Deze website toont vastgelegde echte Dify-runs. Voor nieuwe runs gebruik je de
                lokale werkbank met eigen app-sleutels.
              </p>
            </div>
          )}
          <button disabled={busy} onClick={example}>
            Bekijk vastgelegde echte run
          </button>
        </div>
        <div className="dify-card">
          <h3>Resultaat & herkomst</h3>
          <p>
            Een geldig schema en correcte citaten bewijzen geen volledige inhoudelijke juistheid.
            Controleer de interpretatie en volgende stap.
          </p>
          {error ? (
            <p role="alert" className="notice">
              {error}
            </p>
          ) : null}
          {busy ? <p role="status">Modelrun en broncontrole worden uitgevoerd…</p> : null}
          {result ? (
            <ReadableResult value={result} />
          ) : (
            <p className="muted">Voer lokaal een aanvraag uit of open een vastgelegde run.</p>
          )}
        </div>
      </div>
      <DifyFlowGuide
        key={tool}
        tool={tool}
        allowExamples={local}
        onExample={(value) => {
          setText(value);
          setResult(null);
          setError('');
          document.getElementById('dify-input')?.focus();
        }}
      />
      <DifyGallery />
      <DifyCapabilities />
    </section>
  );
}
