import { useRef, useState } from 'react';
import demo from '../../data/demo-video.json';

const base = `${import.meta.env.BASE_URL}dify/`;
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export function ShowcaseVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  function seek(seconds: number) {
    if (!video.current) return;
    video.current.currentTime = seconds;
    void video.current.play().catch(() => {
      // The browser may require the viewer to use its native play control.
    });
  }
  const media = (format: string) => {
    const file = demo.files.find((entry) => entry.format === format)!;
    return `${base}connected-local-demo.${format}?v=${file.sha256.slice(0, 12)}`;
  };
  return (
    <figure className="showcase-video" aria-label="Lokale demonstratievideo">
      <div className="video-heading">
        <div>
          <p className="eyebrow">Kijk mee · {clock(Math.round(demo.duration))}</p>
          <h3>{demo.title}</h3>
        </div>
        <span className="status-badge">Echte lokale API</span>
      </div>
      <p id="demo-video-description">
        Volg één fictieve aanvraag, het gekoppelde document en de actuele Nederlandse en Franse
        bronnen. Zonder geluid, met toelichting in beeld. Bekijk details schermvullend of lees de
        stappen onder de video.
      </p>
      <video
        ref={video}
        controls
        playsInline
        preload="metadata"
        width={demo.width}
        height={demo.height}
        aria-label="Duin & Dorp: van aanvraag naar bron"
        aria-describedby="demo-video-description"
        poster={`${base}screenshots/connected-video-poster.png?v=${demo.files[0].sha256.slice(0, 12)}`}
        onError={() => setFailed(true)}
      >
        <source src={media('mp4')} type="video/mp4" />
        <source src={media('webm')} type="video/webm" />
        Je browser ondersteunt deze videospeler niet. Gebruik de downloadlinks hieronder.
      </video>
      {failed ? (
        <p role="alert">Afspelen lukt niet in deze browser. Download de opname hieronder.</p>
      ) : null}
      <div className="video-chapters" aria-label="Videohoofdstukken">
        {demo.chapters.map((chapter) => (
          <button
            key={chapter.start}
            type="button"
            onClick={() => seek(chapter.start)}
            aria-label={`Spring naar ${clock(chapter.start)}: ${chapter.title}`}
          >
            <span>{clock(chapter.start)}</span> {chapter.title}
          </button>
        ))}
      </div>
      <figcaption>
        Een opname van echte lokale acties met fictieve gegevens. De analyse gebruikt lokale regels;
        deze video is geen live Dify-modelrun.
      </figcaption>
      <div className="doc-links video-downloads">
        <a href={media('mp4')} download>
          Download MP4
        </a>
        <a href={media('webm')} download>
          Download WebM
        </a>
      </div>
      <details className="video-transcript">
        <summary>Lees de demonstratie stap voor stap</summary>
        <ol>
          {demo.chapters.map((chapter) => (
            <li key={chapter.start}>
              <strong>
                {clock(chapter.start)} · {chapter.title}
              </strong>
              <p>{chapter.description}</p>
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
