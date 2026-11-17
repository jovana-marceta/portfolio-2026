import { useEffect, useRef, useState } from "react";
import "./Lightbox.css";

export interface LightboxPhoto { src: string; caption?: string }

interface Props {
  photos: LightboxPhoto[];
  start: number;
  title: string;
  onClose: () => void;
}

/** Full-screen photo viewer: arrows / swipe to browse, Esc or backdrop click to close. */
export function Lightbox({ photos, start, title, onClose }: Props) {
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const many = photos.length > 1;
  const go = (d: number) => setI((n) => (n + d + photos.length) % photos.length);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photo = photos[i];
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — photo ${i + 1} of ${photos.length}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button ref={closeRef} className="lb-btn lb-close" aria-label="Close" onClick={onClose}>✕</button>
      {many && <button className="lb-btn lb-prev" aria-label="Previous photo" onClick={() => go(-1)}>←</button>}
      <figure className="lb-figure" key={photo.src}>
        <img src={photo.src} alt={photo.caption || title} />
        <figcaption>
          <span>{photo.caption || title}</span>
          {many && <span className="mono">{i + 1} / {photos.length}</span>}
        </figcaption>
      </figure>
      {many && <button className="lb-btn lb-next" aria-label="Next photo" onClick={() => go(1)}>→</button>}
    </div>
  );
}
