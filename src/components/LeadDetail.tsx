import { intentLabels, statusLabels, type Lead, type Listing } from '../domain';
export function LeadDetail({
  lead,
  listings,
  onApprove,
  onManual,
}: {
  lead: Lead;
  listings: Listing[];
  onApprove: () => void;
  onManual: () => void;
}) {
  const listing = listings.find((x) => x.id === lead.extraction.reference);
  return (
    <section className="panel lead-detail" aria-label="Aanvraagdetails">
      <div className="detail-heading">
        <div>
          <h2>
            {lead.extraction.intent === 'visit' && listing
              ? `Bezoek aan de ${listing.title}`
              : intentLabels[lead.extraction.intent]}
          </h2>
          <p>
            {lead.extraction.reference ? `${lead.extraction.reference} · ` : ''}
            {lead.name}
          </p>
        </div>
        <span className={`status ${lead.status}`}>
          {lead.status === 'review' ? 'Menselijke controle' : statusLabels[lead.status]}
        </span>
      </div>
      <ol className="detail-steps" aria-label="Aanvraagstatus">
        {['Ontvangst', 'Analyse', 'Goedkeuring', 'Overdracht'].map((s, i) => (
          <li
            key={s}
            className={
              i < (lead.status === 'synced' ? 4 : lead.status === 'queued' ? 3 : 2) ? 'active' : ''
            }
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="source">
        <h3>Oorspronkelijk bericht</h3>
        <p>{lead.message}</p>
      </div>
      <dl className="facts">
        <div>
          <dt>Vraag</dt>
          <dd>{intentLabels[lead.extraction.intent]}</dd>
        </div>
        <div>
          <dt>Pand</dt>
          <dd>
            {listing
              ? `${listing.id} · ${listing.status === 'sold' ? 'verkocht' : 'beschikbaar'}`
              : (lead.extraction.reference ?? 'Niet van toepassing')}
          </dd>
        </div>
        <div>
          <dt>Vervolgactie</dt>
          <dd>
            {lead.reasons.length
              ? 'Handmatig controleren'
              : lead.extraction.intent === 'visit'
                ? 'Afspraak afstemmen'
                : 'Contact opnemen'}
          </dd>
        </div>
      </dl>
      {lead.reasons.length ? (
        <div className="warning" role="note">
          <strong>Controle vereist</strong>
          <ul>
            {lead.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="draft">
        <h3>Antwoordvoorstel</h3>
        <p>{lead.draft}</p>
      </div>
      <p className="fine">Een bezoekmoment wordt pas na bevestiging vastgelegd.</p>
      <div className="actions">
        <button disabled={lead.status !== 'review'} onClick={onManual}>
          Handmatig behandelen
        </button>
        <button className="primary" disabled={lead.status !== 'review'} onClick={onApprove}>
          Goedkeuren & klaarzetten
        </button>
      </div>
      {lead.approvedBy ? (
        <p className="approval">
          Gecontroleerd door {lead.approvedBy}.{' '}
          {lead.status === 'synced'
            ? 'CRM-simulatie bevestigt ontvangst.'
            : 'Overdracht staat in de wachtrij.'}{' '}
          Geen e-mail verstuurd.
        </p>
      ) : null}
      <details className="audit">
        <summary>
          Beslissingen & gebeurtenissen <span>({lead.audit.length})</span>
        </summary>
        <p className="fine">
          Correlatie-ID: {lead.id} · versie {lead.version} · broncitaat: “
          {lead.extraction.evidence || 'geen'}”
        </p>
        <ol>
          {lead.audit.map((a, i) => (
            <li key={i}>
              <time>{new Date(a.at).toLocaleTimeString('nl-BE')}</time>
              <span>
                <strong>{a.action}</strong>
                <br />
                {a.detail}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
