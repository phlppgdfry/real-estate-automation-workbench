import { useState } from 'react';
import { intentLabels, statusLabels, type Lead } from '../domain';
export function LeadList({
  leads,
  selected,
  onSelect,
}: {
  leads: Lead[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const shown = leads.filter(
    (x) =>
      `${x.name} ${x.extraction.reference ?? ''}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' || (filter === 'review' ? x.status === 'review' : x.status === 'synced')),
  );
  return (
    <section className="panel lead-list" aria-label="Aanvragenlijst">
      <h2>
        Aanvragen <span className="count">({leads.length})</span>
      </h2>
      <label className="search">
        <span className="sr-only">Zoek op naam of referentie</span>
        <input
          placeholder="Zoek op naam of referentie"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="filters" aria-label="Filter aanvragen">
        {[
          ['all', 'Alles'],
          ['review', 'Te beoordelen'],
          ['done', 'Afgehandeld'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="lead-rows">
        {shown.map((l, i) => (
          <button
            className={`lead-row ${selected === l.id ? 'selected' : ''}`}
            key={l.id}
            onClick={() => onSelect(l.id)}
            aria-pressed={selected === l.id}
          >
            <span className="avatar" aria-hidden="true">
              {l.name
                .split(' ')
                .map((x) => x[0])
                .filter((_, j, a) => j === 0 || j === a.length - 1)
                .join('')}
            </span>
            <span className="lead-name">
              <strong>{l.name}</strong>
              <small>
                {intentLabels[l.extraction.intent]}
                {l.extraction.reference ? ` · ${l.extraction.reference}` : ''}
              </small>
            </span>
            <span className="row-meta">
              <time dateTime={l.receivedAt}>
                {new Date(l.receivedAt).toLocaleTimeString('nl-BE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <span className={`status ${l.status}`}>{statusLabels[l.status]}</span>
            </span>
          </button>
        ))}
        {shown.length === 0 ? (
          <p className="empty">Geen aanvragen gevonden. Pas je zoekopdracht of filter aan.</p>
        ) : null}
      </div>
    </section>
  );
}
