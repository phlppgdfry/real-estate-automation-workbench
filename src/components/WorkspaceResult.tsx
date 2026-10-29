import { z } from 'zod';
import { ReadableResult } from './DifyResult';

const Procedure = z.object({
  answer: z.string(),
  sources: z.array(z.object({ source_id: z.string(), title: z.string(), quote: z.string() })),
});

export function WorkspaceResult({ value }: { value: unknown }) {
  const procedure = Procedure.safeParse(value);
  const source = z.object({ source: z.string() }).safeParse(value);
  return (
    <section className="dify-card" aria-label="Resultaat en brongegevens">
      <h3>Resultaat en brongegevens</h3>
      {procedure.success ? (
        <>
          <p>{procedure.data.answer}</p>
          {procedure.data.sources.map((item) => (
            <blockquote key={item.source_id}>
              <strong>{item.title}</strong>
              <br />
              <small>{item.source_id}</small>
              <br />
              {item.quote}
            </blockquote>
          ))}
          <p>Een medewerker controleert de procedure naast de actuele dossierfeiten.</p>
        </>
      ) : source.success ? (
        <pre className="dify-result">{source.data.source}</pre>
      ) : value && typeof value === 'object' ? (
        <ReadableResult value={value as Record<string, unknown>} />
      ) : null}
      <details>
        <summary>Technische gegevens bekijken</summary>
        <pre className="dify-result">{JSON.stringify(value, null, 2)}</pre>
      </details>
    </section>
  );
}
