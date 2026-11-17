import { useRef, useState } from "react";
import { PATH, type PathStop } from "../../data/profile";
import { useScrollFrame } from "../../hooks/useScrollFrame";
import { prefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { Lightbox } from "../ui/Lightbox";
import { SectionHeading } from "../ui/SectionHeading";
import "./Experience.css";

// Newest first: current role at the top, school at the bottom
const STOPS = [...PATH].reverse();

/** Photos stacked like polaroids next to the card; click opens the gallery. */
function PhotoStack({
  stop,
  onOpen,
}: {
  stop: PathStop;
  onOpen: (i: number) => void;
}) {
  const photos = stop.photos!;
  const shown = photos.slice(0, 3);
  return (
    <div className='photo-col'>
      <button
        type='button'
        className={`photo-stack n${shown.length}`}
        onClick={() => onOpen(0)}
        aria-label={`Open ${photos.length} photo${photos.length > 1 ? "s" : ""} from ${stop.place}`}>
        {shown.map((ph, i) => (
          <span
            className='polaroid'
            key={ph.src}
            style={{ zIndex: shown.length - i }}>
            <img src={ph.src} alt='' loading='lazy' />
          </span>
        ))}
        {photos.length > 1 && (
          <span className='photo-count'>{photos.length} photos</span>
        )}
      </button>
      {photos[0].caption && (
        <p className='photo-cap'>
          {photos.length > 1 ? "Team moments" : photos[0].caption}
        </p>
      )}
    </div>
  );
}

function StopCard({ stop }: { stop: PathStop }) {
  const [open, setOpen] = useState<number | null>(null);
  const first = stop.points.slice(0, 3),
    rest = stop.points.slice(3);
  const hasPhotos = !!stop.photos?.length;
  return (
    <article className={`stop-card${hasPhotos ? " has-photos" : ""}`}>
      <div className='stop-body'>
        <span className='kind'>{stop.kind}</span>
        <h3>{stop.title}</h3>
        <p className='place'>{stop.place}</p>
        {first.length > 0 && (
          <ul>
            {first.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {rest.length > 0 && (
          <details className='more'>
            <summary>+ {rest.length} more</summary>
            <ul>
              {rest.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </details>
        )}
        {stop.tech && (
          <ul className='tech' aria-label='Technologies'>
            {stop.tech.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
      {hasPhotos && <PhotoStack stop={stop} onOpen={setOpen} />}
      {open !== null && hasPhotos && (
        <Lightbox
          photos={stop.photos!}
          start={open}
          title={`${stop.title} · ${stop.place}`}
          onClose={() => setOpen(null)}
        />
      )}
    </article>
  );
}

/** Roles and education on one path, newest first. The spine draws with scroll and lights each stop it reaches. */
export function Experience() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLElement>(null);
  const stopRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [lit, setLit] = useState(0);

  useScrollFrame(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (innerHeight * 0.62 - r.top) / r.height));
    if (spineRef.current) spineRef.current.style.transform = `scaleY(${p})`;
    const reach = r.top + p * r.height;
    const count = prefersReducedMotion()
      ? stopRefs.current.length
      : stopRefs.current.filter(
          (s) => s && s.getBoundingClientRect().top + 20 <= reach,
        ).length;
    setLit(count);
  });

  return (
    <section className='section' id='experience' aria-labelledby='expTitle'>
      <div className='wrap'>
        <SectionHeading
          id='expTitle'
          index='03'
          label='Experience'
          lines={["Experience &", <em className='serif'>education.</em>]}
        />
        <div className='timeline' ref={wrapRef}>
          <span className='spine' aria-hidden='true'>
            <i ref={spineRef} />
          </span>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li
              className={`stop${lit > 0 ? " lit" : ""}`}
              ref={(el) => {
                stopRefs.current[0] = el;
              }}>
              <span className='yr'>Next</span>
              <span className='dot' aria-hidden='true' />
              <div className='next-card'>
                <div>
                  <span
                    className='mono'
                    style={{ color: "var(--accent-text)" }}>
                    What's next
                  </span>
                  <h3>
                    Next - <em className='serif'>your team?</em>
                  </h3>
                </div>
                <a className='btn btn-primary' href='#book'>
                  Book a call →
                </a>
              </div>
            </li>
            {STOPS.map((stop, i) => (
              <li
                className={`stop${i + 1 < lit ? " lit" : ""}`}
                key={stop.years + stop.place}
                ref={(el) => {
                  stopRefs.current[i + 1] = el;
                }}>
                <span className='yr'>{stop.years}</span>
                <span className='dot' aria-hidden='true' />
                <StopCard stop={stop} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
