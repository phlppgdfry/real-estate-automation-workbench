import { useEffect, useRef, useState } from 'react';
import { version } from '../../package.json';
const base = import.meta.env.BASE_URL;
const images = [
  ['lead', 'Aanvraaganalyse'],
  ['assistant', 'Dossierassistent'],
  ['document', 'Documentcontrole'],
  ['comparison', 'Agent · Pandvergelijker'],
] as const;
function source(id: string, run = false) {
  return `${base}dify/screenshots/${id}${run ? '-run' : ''}.png?v=${version}`;
}
function CanvasViewer({ initial, onClose }: { initial: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initial),
    [zoom, setZoom] = useState(1),
    [run, setRun] = useState(false);
  const [id, label] = images[index];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    element.showModal();
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = prior;
      previous?.focus();
    };
  }, []);
  function next(delta: number) {
    setIndex((index + delta + images.length) % images.length);
    setZoom(1);
    setRun(false);
    viewport.current?.scrollTo(0, 0);
  }
  return (
    <dialog
      ref={dialog}
      className="canvas-viewer"
      aria-labelledby="canvas-viewer-title"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'),
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-head">
        <div>
          <p className="eyebrow">Dify Studio · originele opname</p>
          <h2 id="canvas-viewer-title">{label}</h2>
        </div>
        <button onClick={onClose} aria-label="Beeldviewer sluiten">
          Sluiten ×
        </button>
      </div>
      <div className="canvas-toolbar">
        <div>
          <button
            aria-pressed={!run}
            onClick={() => {
              setRun(false);
              setZoom(1);
            }}
          >
            Canvas met uitleg
          </button>
          <button
            aria-pressed={run}
            onClick={() => {
              setRun(true);
              setZoom(1);
            }}
          >
            Echte run
          </button>
        </div>
        <div>
          <button
            aria-label="Uitzoomen"
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.5))}
          >
            −
          </button>
          <output aria-live="polite">
            {zoom === 1 ? 'Passend' : `${Math.round(zoom * 100)}%`}
          </output>
          <button
            aria-label="Inzoomen"
            disabled={zoom >= 3}
            onClick={() => setZoom(Math.min(3, zoom + 0.5))}
          >
            +
          </button>
          <button
            onClick={() => {
              setZoom(1);
              viewport.current?.scrollTo(0, 0);
            }}
          >
            Passend maken
          </button>
        </div>
      </div>
      <div className={`canvas-image-viewport ${zoom > 1 ? 'zoomed' : ''}`} ref={viewport}>
        <img
          src={source(id, run)}
          alt={`${run ? 'Echte modelrun' : 'Volledig canvas met uitleg'}: ${label}`}
          style={{ width: zoom > 1 ? `${zoom * 100}%` : undefined }}
        />
      </div>
      <div className="canvas-viewer-footer">
        <button onClick={() => next(-1)}>← Vorige flow</button>
        <span>
          {index + 1} van {images.length} ·{' '}
          {zoom > 1
            ? 'Scroll om het vergrote beeld te bekijken.'
            : 'Het volledige beeld past in het venster.'}
        </span>
        <button onClick={() => next(1)}>Volgende flow →</button>
        <a href={source(id, run)} target="_blank" rel="noreferrer">
          Origineel openen ↗
        </a>
      </div>
    </dialog>
  );
}
export function DifyGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <section className="canvas-evidence" aria-label="Dify canvasbeelden">
      <div className="canvas-evidence-title">
        <div>
          <h3>Bekijk de echte Dify-canvassen</h3>
          <p>Open een volledig canvas, vergroot de notities of wissel naar het runbewijs.</p>
        </div>
        <span>4 flows · canvas & uitvoer</span>
      </div>
      <div className="dify-gallery">
        {images.map(([id, label], index) => (
          <figure key={id}>
            <button
              className="canvas-thumbnail"
              onClick={() => setSelected(index)}
              aria-label={`Vergroot canvas: ${label}`}
            >
              <img
                loading="lazy"
                width="1728"
                height="992"
                src={source(id)}
                alt={`Dify Studio-canvas met uitleg: ${label}`}
              />
              <span>Vergroot canvas ↗</span>
            </button>
            <figcaption>
              <strong>{label}</strong>
              <a href={source(id, true)} target="_blank" rel="noreferrer">
                Echte run bekijken ↗
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      {selected !== null ? (
        <CanvasViewer initial={selected} onClose={() => setSelected(null)} />
      ) : null}
    </section>
  );
}
