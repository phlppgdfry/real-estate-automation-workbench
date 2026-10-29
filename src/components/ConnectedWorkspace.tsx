import { useState } from 'react';
import { DocumentReviewPanel } from './DocumentReviewPanel';
import { z } from 'zod';
import { LeadSchema, ListingSchema, statusLabels } from '../domain';
const Snapshot = z.object({
  mode: z.literal('local-api'),
  leads: z.array(LeadSchema),
  listings: z.array(ListingSchema),
  inbox: z.array(z.object({ id: z.string(), state: z.string(), attempts: z.number() })),
  runs: z.array(
    z.object({
      id: z.string(),
      tool: z.string(),
      lead_id: z.string().nullable(),
      state: z.string(),
      started_at: z.string(),
      elapsed_ms: z.number().nullable(),
      total_tokens: z.number().nullable(),
      error_code: z.string().nullable(),
      model: z.string(),
    }),
  ),
  budget: z.object({
    dailyLimit: z.number(),
    chargedTokens: z.number(),
    actualTokens: z.number(),
    unreportedUsageRuns: z.number(),
    runs: z.number(),
    failed: z.number(),
    averageMs: z.number(),
    costStatus: z.string(),
    budgetedCostMicros: z.number().nullable(),
  }),
  documents: z.array(
    z.object({
      id: z.string(),
      lead_id: z.string(),
      filename: z.string(),
      media_type: z.string(),
      state: z.string(),
    }),
  ),
  reviews: z.array(
    z.object({
      id: z.string(),
      document_id: z.string(),
      version: z.number(),
      state: z.string(),
      proposed: z.string(),
      expires_at: z.string(),
      native_human: z.number(),
    }),
  ),
  connectorJobs: z.array(
    z.object({
      id: z.string(),
      lead_id: z.string(),
      state: z.string(),
      attempts: z.number(),
      error_code: z.string().nullable(),
    }),
  ),
  digest: z.object({
    generatedAt: z.string(),
    items: z.array(
      z.object({ id: z.string(), status: z.string(), ageHours: z.number(), action: z.string() }),
    ),
  }),
});
type SnapshotData = z.infer<typeof Snapshot>;
export function ConnectedWorkspace() {
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  const [token, setToken] = useState(''),
    [snapshot, setSnapshot] = useState<SnapshotData | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [message, setMessage] = useState('Ik wil DD-204 bezoeken.'),
    [question, setQuestion] = useState('Waarom kan een verkocht pand niet worden bezocht?'),
    [language, setLanguage] = useState<'nl' | 'fr'>('nl'),
    [answer, setAnswer] = useState<unknown>(null),
    [ocr, setOcr] = useState(false),
    [nativeExtract, setNativeExtract] = useState(false),
    [nativeHuman, setNativeHuman] = useState(false),
    [file, setFile] = useState<File | null>(null);
  async function request(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    const value = await response.json();
    if (!response.ok)
      throw Error(
        value.message ??
          (
            {
              401: 'Token ontbreekt of is ongeldig.',
              403: 'Deze rol mag deze actie niet uitvoeren.',
              503: 'Benodigde verbinding is nog niet ingesteld.',
            } as Record<number, string>
          )[response.status] ??
          value.error ??
          'Aanvraag mislukt.',
      );
    return value;
  }
  async function refresh() {
    const value = Snapshot.parse(await request('/api/workspace'));
    setSnapshot(value);
    setSelected((current) =>
      value.leads.some((l) => l.id === current) ? current : (value.leads[0]?.id ?? ''),
    );
    return value;
  }
  async function downloadTraces() {
    const value = await request('/api/workspace/traces');
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `duin-dorp-runs-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await refresh();
      setNotice(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Actie mislukt.');
    } finally {
      setBusy(false);
    }
  }
  const lead = snapshot?.leads.find((l) => l.id === selected);
  async function upload() {
    if (!file || !lead) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > 2097152) throw Error('Maximaal 2 MB per document.');
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const result = await request('/api/workspace/documents', {
      leadId: lead.id,
      filename: file.name,
      base64: btoa(binary),
      ocr,
      nativeExtract,
    });
    setAnswer(result);
  }
  return (
    <section className="connected-workspace" aria-label="Verbonden dossierwerkplek">
      <div className="section-title">
        <div>
          <p className="eyebrow">Van intake tot gecontroleerde overdracht</p>
          <h2>Eén dossier, één uitvoeringsgeschiedenis</h2>
          <p>
            De lokale modus gebruikt de duurzame API. Rollen en goedkeuring blijven op de server
            afgedwongen.
          </p>
        </div>
        <span className="status-badge">{local ? 'Lokale API' : 'Publieke demonstratie'}</span>
      </div>
      {!local ? (
        <div className="dify-card">
          <h3>Open de lokale werkplek voor nieuwe acties</h3>
          <p>
            Deze publieke site bewaart geen dossiers op een server. Bekijk de opname en runbewijzen;
            start lokaal voor uploads, beoordeling, wachtrijen en de HTTP-testconnector.
          </p>
          <a href="https://github.com/phlppgdfry/real-estate-automation-workbench/blob/main/docs/connected-workspace.md">
            Starten en volledige demonstratieroute ↗
          </a>
          <figure>
            <video
              controls
              preload="metadata"
              poster={`${import.meta.env.BASE_URL}dify/screenshots/procedures.png`}
              style={{ width: '100%', borderRadius: 12 }}
            >
              <source
                src={`${import.meta.env.BASE_URL}dify/connected-local-demo.webm`}
                type="video/webm"
              />
              <a href={`${import.meta.env.BASE_URL}dify/connected-local-demo.webm`}>
                Opname downloaden
              </a>
            </video>
            <figcaption>
              Echte lokale API-demonstratie: duurzame intake, analyse, documentupload en
              procedurezoekroute met fictieve gegevens. Geen live Dify-modelrun.
            </figcaption>
          </figure>
        </div>
      ) : (
        <>
          <div className="connection-bar">
            <label>
              Persoonlijke sessietoken
              <input
                type="password"
                value={token}
                autoComplete="off"
                placeholder="Reader, reviewer of operator"
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
            <button
              disabled={busy || !token}
              onClick={() => act(refresh, 'Lokale dossiers opgehaald.')}
            >
              Verbinden / vernieuwen
            </button>
            <small>Token alleen in dit tabblad. Wissel van rol voor beoordelen of beheer.</small>
          </div>
          {error ? (
            <p role="alert" className="notice">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="notice">
              {notice}
            </p>
          ) : null}
          {busy ? <p role="status">Bezig met duurzame verwerking…</p> : null}
          {snapshot ? (
            <>
              <div className="metrics">
                <div>
                  <strong>{snapshot.leads.length}</strong>
                  <span>Lokale dossiers</span>
                </div>
                <div>
                  <strong>{snapshot.budget.actualTokens.toLocaleString('nl-BE')}</strong>
                  <span>Gerapporteerde tokens vandaag</span>
                </div>
                <div>
                  <strong>
                    {snapshot.budget.chargedTokens.toLocaleString('nl-BE')} /{' '}
                    {snapshot.budget.dailyLimit.toLocaleString('nl-BE')}
                  </strong>
                  <span>Budget inclusief onbekende verbruikreserveringen</span>
                </div>
                <div>
                  <strong>{snapshot.budget.failed}</strong>
                  <span>Mislukte modelruns</span>
                </div>
              </div>
              <p className="muted">
                {snapshot.budget.budgetedCostMicros === null
                  ? 'Kosten: geen prijsplafond geconfigureerd.'
                  : `Kostenbovengrens: ${(snapshot.budget.budgetedCostMicros / 1000000).toFixed(4)} in de geconfigureerde rekeneenheid; geen providerfactuur.`}{' '}
                Onbekend verbruik blijft gereserveerd.
              </p>
              <div className="dify-grid">
                <div className="dify-card">
                  <h3>Fictieve aanvraag ontvangen</h3>
                  <label>
                    Bericht
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={4000}
                    />
                  </label>
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () =>
                          request('/api/workspace/intake', {
                            eventId: 'ui-' + crypto.randomUUID(),
                            name: 'Robin Demo',
                            email: 'robin@example.com',
                            channel: 'website',
                            message,
                          }),
                        'Ontvangst opgeslagen. Analyse gebeurt afzonderlijk.',
                      )
                    }
                  >
                    Duurzaam ontvangen
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => request('/api/inbox/process', { limit: 2 }),
                        'Analysebatch verwerkt; bekijk dossiers en runs.',
                      )
                    }
                  >
                    Analysebatch uitvoeren · operator
                  </button>
                  <h4>Ontvangstwachtrij</h4>
                  {snapshot.inbox.map((item) => (
                    <p key={item.id}>
                      {item.id} · {item.state} · {item.attempts} poging(en)
                    </p>
                  ))}
                </div>
                <div className="dify-card">
                  <h3>Dossier</h3>
                  <label>
                    Lokale aanvraag
                    <select
                      value={selected}
                      onChange={(e) => {
                        setSelected(e.target.value);
                        setAnswer(null);
                      }}
                    >
                      <option value="">Selecteer dossier</option>
                      {snapshot.leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.id} · {statusLabels[l.status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {lead ? (
                    <>
                      <p>
                        <strong>{lead.message}</strong>
                      </p>
                      <p>
                        {statusLabels[lead.status]} · versie {lead.version}
                      </p>
                      {lead.reasons.map((r) => (
                        <p key={r}>{r}</p>
                      ))}
                      <blockquote>{lead.draft}</blockquote>
                      <button
                        disabled={busy || lead.status !== 'review'}
                        onClick={() =>
                          act(
                            () =>
                              request(`/api/leads/${lead.id}/approve`, { version: lead.version }),
                            'Dossier goedgekeurd; nog geen CRM-overdracht.',
                          )
                        }
                      >
                        Goedkeuren · reviewer
                      </button>
                      <button
                        disabled={busy || lead.status !== 'queued'}
                        onClick={() =>
                          act(
                            () =>
                              request(`/api/workspace/leads/${lead.id}/connector`, {
                                version: lead.version,
                              }),
                            'Connectorstatus bijgewerkt; ontvangst is apart gecontroleerd.',
                          )
                        }
                      >
                        HTTP-testconnector uitvoeren · operator
                      </button>
                      <button
                        disabled={busy || lead.status !== 'queued'}
                        onClick={() =>
                          act(
                            () => request('/api/outbox/dispatch', { simulateFailure: false }),
                            'Lokale mock verwerkt.',
                          )
                        }
                      >
                        Bestaande lokale mock uitvoeren · operator
                      </button>
                      <h4>Dossieradvies</h4>
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(
                            async () =>
                              setAnswer(
                                await request(`/api/workspace/leads/${lead.id}/assist`, {
                                  question:
                                    'Wat moet een medewerker controleren vóór de volgende stap?',
                                }),
                              ),
                            'Dossieradvies opgehaald.',
                          )
                        }
                      >
                        Brongebonden advies vragen
                      </button>
                      <h4>Verwerkingsgeschiedenis</h4>
                      <ol>
                        {lead.audit.map((event, index) => (
                          <li key={index}>
                            <time>{event.at}</time> · {event.action}
                            <p>{event.detail}</p>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : (
                    <p>Nog geen geanalyseerd dossier.</p>
                  )}
                </div>
              </div>
              {lead ? (
                <div className="dify-grid">
                  <div className="dify-card">
                    <h3>Documenteninbox</h3>
                    <label>
                      PDF, DOCX, EML, TXT of Markdown · maximaal 2 MB
                      <input
                        type="file"
                        accept=".pdf,.docx,.eml,.txt,.md"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={ocr}
                        onChange={(e) => setOcr(e.target.checked)}
                      />
                      OCR voor scans · eerste vijf pagina’s, Engelstalig model
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={nativeExtract}
                        disabled={ocr}
                        onChange={(e) => setNativeExtract(e.target.checked)}
                      />
                      Ook via Dify Document Extractor controleren · uploadt het fictieve bestand
                      naar Dify
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={nativeHuman}
                        onChange={(e) => setNativeHuman(e.target.checked)}
                      />
                      Analyse pauzeren met Dify Human Input · vereist beschikbare providercredits
                    </label>
                    <button
                      disabled={busy || !file || (ocr && nativeExtract)}
                      onClick={() =>
                        act(upload, 'Document verwerkt; bron en status zijn opgeslagen.')
                      }
                    >
                      Toevoegen aan dit dossier
                    </button>
                    {snapshot.documents
                      .filter((d) => d.lead_id === lead.id)
                      .map((d) => (
                        <article key={d.id}>
                          <h4>{d.filename}</h4>
                          <p>
                            {d.state} · {d.media_type}
                          </p>
                          <button
                            disabled={busy}
                            onClick={() =>
                              act(
                                async () =>
                                  setAnswer(
                                    await request(`/api/workspace/documents/${d.id}/source`),
                                  ),
                                'Geminimaliseerde bron getoond.',
                              )
                            }
                          >
                            Bron bekijken
                          </button>
                          <button
                            disabled={busy || d.state === 'needs_ocr'}
                            onClick={() =>
                              act(
                                async () =>
                                  setAnswer(
                                    await request(`/api/workspace/documents/${d.id}/analyse`, {
                                      nativeHuman,
                                    }),
                                  ),
                                'Documentanalyse klaar voor inhoudelijke controle.',
                              )
                            }
                          >
                            Analyseren met Dify
                          </button>
                          {snapshot.reviews
                            .filter((r) => r.document_id === d.id)
                            .map((r) => (
                              <DocumentReviewPanel
                                key={`${r.id}:${r.version}`}
                                review={r}
                                busy={busy}
                                onReconcile={() =>
                                  act(
                                    () =>
                                      request(`/api/workspace/reviews/${r.id}/reconcile`, {
                                        version: r.version,
                                      }),
                                    'Providerstatus gecontroleerd; controleer de actuele reviewstatus.',
                                  )
                                }
                                onDecision={(action, comment, corrected) =>
                                  act(
                                    () =>
                                      request(`/api/workspace/reviews/${r.id}`, {
                                        version: r.version,
                                        action,
                                        comment,
                                        corrected,
                                      }),
                                    'Inhoudelijke controle vastgelegd; dossiergoedkeuring blijft afzonderlijk.',
                                  )
                                }
                              />
                            ))}
                        </article>
                      ))}
                  </div>
                  <div className="dify-card">
                    <h3>Interne procedures</h3>
                    <label>
                      Proceduretaal
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'nl' | 'fr')}
                      >
                        <option value="nl">Nederlands</option>
                        <option value="fr">Français</option>
                      </select>
                    </label>
                    <label>
                      Vraag
                      <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
                    </label>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          async () =>
                            setAnswer(
                              await request('/api/workspace/knowledge', {
                                question,
                                language,
                              }),
                            ),
                          'Actuele procedures met bronnen opgehaald.',
                        )
                      }
                    >
                      Zoek in actuele procedures
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          async () =>
                            setAnswer(
                              await request('/api/workspace/knowledge', {
                                question,
                                language,
                                native: true,
                              }),
                            ),
                          'Dify-procedures met onafhankelijke broncontrole opgehaald.',
                        )
                      }
                    >
                      Zoek via Dify Knowledge
                    </button>
                    <p>
                      Beide routes filteren op actuele versie en taal. Dify gebruikt beheerde
                      zoekwoorden; bij ontbrekende bronnen volgt geen verzonnen antwoord.
                    </p>
                    <h3>Pandopties vergelijken</h3>
                    <p>Vaste testcriteria: Oudenburg, maximaal €390.000, minstens 3 slaapkamers.</p>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          async () =>
                            setAnswer(
                              await request(`/api/workspace/leads/${lead.id}/compare`, {
                                question:
                                  'Vergelijk beschikbare panden en verklaar waarom DD-223 niet voldoet.',
                                city: 'Oudenburg',
                                maxPrice: 390000,
                                minBedrooms: 3,
                              }),
                            ),
                          'Agentvoorstel en broncontrole afgerond.',
                        )
                      }
                    >
                      Vergelijken met native Agent
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="dify-card">
                <h3>Runhistoriek en herkomst</h3>
                <button
                  disabled={busy}
                  onClick={() =>
                    act(
                      downloadTraces,
                      'Runmetadata gedownload; documentinhoud en toegangssleutels zijn uitgesloten.',
                    )
                  }
                >
                  Runmetadata downloaden
                </button>
                <div className="dify-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Run / dossier</th>
                        <th>Taak</th>
                        <th>Status</th>
                        <th>Model</th>
                        <th>Duur / tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.runs
                        .filter((r) => !selected || r.lead_id === selected || r.lead_id === null)
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              {r.id}
                              <br />
                              {r.lead_id ?? 'Los voorbeeld'}
                            </td>
                            <td>{r.tool}</td>
                            <td>
                              {r.state}
                              {r.error_code ? ' · ' + r.error_code : ''}
                            </td>
                            <td>{r.model}</td>
                            <td>
                              {r.elapsed_ms ?? '…'} ms / {r.total_tokens ?? 'onbekend'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dify-card">
                <h3>Dagelijkse opvolglijst</h3>
                <p>Intern overzicht · geen e-mail of klantbericht verzonden.</p>
                {snapshot.digest.items.map((item) => (
                  <p key={item.id}>
                    <strong>{item.id}</strong> · {item.ageHours} uur · {item.action}
                  </p>
                ))}
                <button
                  disabled={busy}
                  onClick={() =>
                    act(
                      () =>
                        request('/api/workspace/digest/trigger', {
                          eventId: 'manual-' + crypto.randomUUID(),
                          kind: 'manual',
                        }),
                      'Opvolgmoment duurzaam vastgelegd.',
                    )
                  }
                >
                  Opvolgmoment vastleggen · operator
                </button>
                <h4>HTTP-connector</h4>
                {snapshot.connectorJobs.map((j) => (
                  <p key={j.id}>
                    {j.lead_id}: {j.state} · {j.attempts} poging(en) ·{' '}
                    {j.error_code ?? 'geen foutcode'}
                  </p>
                ))}
              </div>
              {answer ? (
                <details open className="dify-card">
                  <summary>Resultaat en brongegevens</summary>
                  <pre className="dify-result">{JSON.stringify(answer, null, 2)}</pre>
                </details>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
