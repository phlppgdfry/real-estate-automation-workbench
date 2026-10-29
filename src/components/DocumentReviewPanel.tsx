import { useState } from 'react';
import { DocumentReviewSchema, type DocumentReview } from '../dify-contracts';

export function DocumentReviewPanel({
  review,
  busy,
  onDecision,
  onReconcile,
}: {
  review: {
    id: string;
    version: number;
    state: string;
    proposed: string;
    expires_at: string;
    native_human?: number;
  };
  busy: boolean;
  onDecision: (action: 'approve' | 'reject', comment: string, corrected: DocumentReview) => void;
  onReconcile: () => void;
}) {
  const initial = DocumentReviewSchema.parse(JSON.parse(review.proposed));
  const [draft, setDraft] = useState(initial);
  const [comment, setComment] = useState('Brongegevens nagekeken.');
  const disabled = busy || review.state !== 'pending';
  function update(index: number, field: 'value' | 'quote', value: string) {
    setDraft((current) => ({
      ...current,
      facts: current.facts.map((fact, i) => (i === index ? { ...fact, [field]: value } : fact)),
    }));
  }
  return (
    <section aria-label="Documentinhoud beoordelen">
      <p>
        Inhoudelijke controle: {review.state} · verloopt {review.expires_at}
      </p>
      {review.native_human === 1 && (
        <p>
          Verbonden met een gepauzeerde Dify-run. De lokale reviewerrechten bepalen wie mag
          antwoorden.
        </p>
      )}
      {['submitting', 'submission_unknown'].includes(review.state) && (
        <button disabled={busy} onClick={onReconcile}>
          Providerstatus afstemmen · reviewer
        </button>
      )}
      <p className="muted">
        Vergelijk elke waarde met de brontekst. Correcties moeten nog steeds een letterlijk
        broncitaat hebben. Deze beslissing keurt het dossier niet goed.
      </p>
      {draft.facts.map((fact, index) => (
        <fieldset key={fact.field} disabled={disabled}>
          <legend>{fact.field}</legend>
          <label>
            Waarde
            <input value={fact.value} onChange={(e) => update(index, 'value', e.target.value)} />
          </label>
          <label>
            Exact broncitaat
            <textarea value={fact.quote} onChange={(e) => update(index, 'quote', e.target.value)} />
          </label>
          <button
            onClick={() =>
              setDraft((current) => ({
                ...current,
                facts: current.facts.filter((_, i) => i !== index),
                missing_fields: [...new Set([...current.missing_fields, fact.field])],
              }))
            }
          >
            Niet bevestigd · veld verwijderen
          </button>
        </fieldset>
      ))}
      <p>Ontbrekend: {draft.missing_fields.join(', ') || 'geen basisvelden'}</p>
      {draft.risks.length > 0 && (
        <ul>
          {draft.risks.map((risk, i) => (
            <li key={i}>{risk}</li>
          ))}
        </ul>
      )}
      <label>
        Controleopmerking
        <input disabled={disabled} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      {(['approve', 'reject'] as const).map((action) => (
        <button
          key={action}
          disabled={disabled || comment.trim().length < 5}
          onClick={() => onDecision(action, comment, draft)}
        >
          {action === 'approve' ? 'Documentinhoud bevestigen' : 'Afwijzen'} · reviewer
        </button>
      ))}
    </section>
  );
}
