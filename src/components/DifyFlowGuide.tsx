import { useState } from 'react';
import guide from '../../dify/canvas/guide.json';
const repo = 'https://github.com/phlppgdfry/real-estate-automation-workbench';
export function DifyFlowGuide({
  tool,
  onExample,
  allowExamples,
}: {
  tool: string;
  allowExamples: boolean;
  onExample: (value: string) => void;
}) {
  const app = guide.apps.find((app) => app.tool === tool)!;
  const [step, setStep] = useState(0);
  const current = app.steps[Math.min(step, app.steps.length - 1)];
  return (
    <section className="flow-guide" aria-label="Uitleg van de Dify-flow">
      <div className="flow-guide-title">
        <div>
          <p className="eyebrow">Van proces naar implementatie</p>
          <h3>Zo werkt {app.title.toLowerCase()}</h3>
          <p>{app.value}</p>
        </div>
        <a href={`${repo}/blob/main/dify/apps/${app.id}.yml`}>Importeer deze flow ↗</a>
      </div>
      <ol className="flow-steps" aria-label="Verwerkingsstappen">
        {app.steps.map((item, index) => (
          <li key={item.id}>
            <button aria-pressed={index === step} onClick={() => setStep(index)}>
              {item.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="flow-step-detail" aria-live="polite">
        <h4>{current.title}</h4>
        <p>{current.description}</p>
        <dl>
          <div>
            <dt>Invoer</dt>
            <dd>{current.input}</dd>
          </div>
          <div>
            <dt>Uitvoer</dt>
            <dd>{current.output}</dd>
          </div>
        </dl>
        <p>
          <strong>Controlepunt:</strong> {current.check}
        </p>
      </div>
      <div className="flow-boundaries">
        <div>
          <h4>Gegevensgrens</h4>
          <p>{app.boundary}</p>
        </div>
        <div>
          <h4>Wie beslist?</h4>
          <p>{app.owner}</p>
          <h4>Als het misgaat</h4>
          <p>{app.failure}</p>
        </div>
      </div>
      <details className="flow-scenarios">
        <summary>Testscenario’s & verwachte uitkomst</summary>
        <div>
          {app.tests.map((test) => (
            <article key={test.label}>
              <h4>{test.label}</h4>
              <p className="flow-example-text">{test.input}</p>
              <p>
                <strong>Verwacht:</strong> {test.expect}
              </p>
              {allowExamples &&
              (tool === 'analyse' ||
                (tool === 'document' && test.label === 'Onvolledige fiche')) ? (
                <button onClick={() => onExample(test.input)}>
                  Gebruik dit voorbeeld hierboven
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <p className="muted">
          Dit zijn acceptatiecriteria. De vastgelegde runs tonen welke voorbeelden daadwerkelijk
          zijn uitgevoerd; niet ieder criterium is een live modeltest.
        </p>
      </details>
    </section>
  );
}
