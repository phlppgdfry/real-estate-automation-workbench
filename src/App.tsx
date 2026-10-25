import { useEffect, useState } from 'react';
import { z } from 'zod';
import {
  approve,
  createLead,
  deliver,
  manual,
  requeue,
  LeadSchema,
  ListingSchema,
  type Intake,
  type Lead,
  type Listing,
} from './domain';
import { catalog, seed } from './seed';
import { LeadList } from './components/LeadList';
import { LeadDetail } from './components/LeadDetail';
import { IntakeForm, Tour } from './components/Dialogs';
import { Impact, Technical } from './components/CaseViews';
const storageKey = 'duin-dorp-demo-v1';
type Session = { leads: Lead[]; listings: Listing[] };
const SessionSchema = z
  .object({
    leads: z.array(LeadSchema).min(1).max(1000),
    listings: z.array(ListingSchema).max(1000),
  })
  .strict();
function fresh(): Session {
  const now = new Date().toISOString();
  return { leads: seed(now), listings: catalog(now) };
}
function load(): Session {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    const restored = SessionSchema.safeParse(value);
    if (restored.success) return restored.data;
  } catch {
    /* Corrupt browser storage starts a fresh demo. */
  }
  return fresh();
}
export function App() {
  const [session, setSession] = useState(load);
  const [selected, setSelected] = useState(session.leads[0].id);
  const [view, setView] = useState('leads');
  const [form, setForm] = useState(false);
  const [tour, setTour] = useState(new URLSearchParams(location.search).has('tour'));
  const [fail, setFail] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
    } catch {
      setNotice('Browseropslag is niet beschikbaar. De demo blijft werken tot je herlaadt.');
    }
  }, [session]);
  const lead = session.leads.find((x) => x.id === selected) ?? session.leads[0];
  function change(fn: (l: Lead) => Lead, notice?: string) {
    try {
      const changed = fn(lead);
      setSession((s) => ({ ...s, leads: s.leads.map((x) => (x.id === changed.id ? changed : x)) }));
      setNotice(
        notice ??
          (changed.status === 'queued'
            ? 'Goedgekeurd en klaargezet. Verwerk de CRM-wachtrij om de overdracht te simuleren.'
            : 'Aanvraag overgedragen aan een medewerker.'),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Actie mislukt.');
    }
  }
  function intake(input: Intake) {
    try {
      const l = createLead(input, session.listings, new Date().toISOString());
      setSession((s) => ({ ...s, leads: [l, ...s.leads] }));
      setSelected(l.id);
      setView('leads');
      setForm(false);
      setNotice(
        l.status === 'manual'
          ? 'Aanvraag ontvangen; handmatige controle vereist.'
          : 'Aanvraag geanalyseerd. Controleer het voorstel.',
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Ongeldige aanvraag.');
    }
  }
  function dispatch() {
    if (busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    let processed = 0;
    let waits = 0;
    const next = session.leads.map((x) => {
      if (x.status !== 'queued') return x;
      try {
        const n = deliver(x, fail, now);
        processed++;
        return n;
      } catch {
        waits++;
        return x;
      }
    });
    setSession((s) => ({ ...s, leads: next }));
    setNotice(
      `${processed} overdracht(en) ${fail ? 'mislukt' : 'door CRM-simulatie bevestigd'}.${waits ? ' Een aanvraag wacht nog op de retrytermijn.' : ''} Geen e-mail verstuurd.`,
    );
    setBusy(false);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Naar de inhoud
      </a>
      <aside className="sidebar">
        <a className="brand" href="#workspace" onClick={() => setView('leads')}>
          <span className="brand-mark">D</span>
          <strong>duin & dorp</strong>
          <span>Vastgoedwerkplek</span>
        </a>
        <nav aria-label="Werkplek">
          {[
            ['leads', 'Aanvragen'],
            ['impact', 'Proces & impact'],
            ['technical', 'Technisch dossier'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? 'current' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="sidebar-foot">Portfolio · fictieve data</span>
      </aside>
      <main id="workspace">
        <header className="page-header">
          <div>
            <h1>Elke aanvraag, goed opgevolgd.</h1>
            <p>Van eerste contact naar een gecontroleerde volgende stap.</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setTour(true)}>Rondleiding</button>
            <button className="primary" onClick={() => setForm(true)}>
              + Nieuwe aanvraag
            </button>
          </div>
        </header>
        <div className="metrics" aria-label="Procesindicatoren">
          {[
            [session.leads.length, 'Aanvragen'],
            [session.leads.filter((x) => x.status === 'review').length, 'Te beoordelen'],
            [session.leads.filter((x) => x.status === 'queued').length, 'CRM-wachtrij'],
            [0, 'Verzonden e-mails'],
          ].map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {notice ? (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Melding sluiten">
              ×
            </button>
          </div>
        ) : null}
        {view === 'leads' ? (
          <>
            <ol className="pipeline">
              {['Ontvangen', 'Geanalyseerd', 'Gecontroleerd', 'CRM-overdracht'].map((s, i) => (
                <li key={s}>
                  <span>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="workbench">
              <LeadList leads={session.leads} selected={selected} onSelect={setSelected} />
              <LeadDetail
                key={lead.id}
                lead={lead}
                listings={session.listings}
                onApprove={() =>
                  change((l) =>
                    approve(
                      l,
                      l.version,
                      'Demo-beoordelaar',
                      session.listings,
                      new Date().toISOString(),
                    ),
                  )
                }
                onManual={() => change((l) => manual(l, new Date().toISOString()))}
                onRequeue={(reason) =>
                  change(
                    (l) =>
                      requeue(
                        l,
                        l.version,
                        'Demo-beheerder',
                        reason,
                        session.listings,
                        new Date().toISOString(),
                      ),
                    'Overdracht gecontroleerd hersteld. De eerdere fouten blijven in het log.',
                  )
                }
              />
            </div>
            <section className="outbox" aria-label="CRM-simulatie">
              <div>
                <h2>Overdracht testen</h2>
                <p>Lokale CRM-simulatie · maximaal drie pogingen · geen externe verzending</p>
              </div>
              <label className="checkbox">
                <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} />
                CRM-fout simuleren
              </label>
              <button
                disabled={busy || !session.leads.some((x) => x.status === 'queued')}
                onClick={dispatch}
              >
                CRM-wachtrij verwerken
              </button>
              <button
                className="text-button"
                onClick={() => {
                  const s = fresh();
                  setSession(s);
                  setSelected(s.leads[0].id);
                  setFail(false);
                  setNotice('Demo hersteld naar zes fictieve aanvragen.');
                }}
              >
                Reset demo
              </button>
            </section>
          </>
        ) : view === 'impact' ? (
          <Impact />
        ) : (
          <Technical />
        )}
        <footer>
          Onafhankelijke portfolio-case. Geen echte klanten, CRM-koppeling of verzending.{' '}
          <a href="https://github.com/phlppgdfry/real-estate-automation-workbench">
            Broncode & onderbouwing ↗
          </a>
        </footer>
      </main>
      {form ? <IntakeForm onSubmit={intake} onClose={() => setForm(false)} /> : null}
      {tour ? <Tour onClose={() => setTour(false)} /> : null}
    </div>
  );
}
