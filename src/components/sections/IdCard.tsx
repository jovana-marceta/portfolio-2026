import { useEffect, useRef, useState, type RefObject } from "react";
import { ID_CARD, PROFILE } from "../../data/profile";
import { prefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/**
 * Developer ID hanging on a lanyard. A damped pendulum reacts to mouse velocity
 * and sways gently when idle. Flips on hover (mouse), tap (touch) or Enter / Space.
 */
export function IdCard({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const lanyard = useRef<HTMLDivElement>(null);
  const physics = useRef({ angle: 0, vel: 0 });
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const section = sectionRef.current,
      el = lanyard.current;
    if (!section || !el) return;
    const p = physics.current;
    const reduced = prefersReducedMotion();
    let running = false,
      raf = 0,
      lastX: number | null = null,
      lastT = 0;
    const t0 = performance.now();

    const step = (now: number) => {
      const idle = reduced ? 0 : Math.sin((now - t0) / 1400) * 1.6;
      p.vel += -0.045 * (p.angle - idle) - 0.09 * p.vel;
      p.angle = Math.max(-22, Math.min(22, p.angle + p.vel));
      el.style.transform = `rotate(${p.angle.toFixed(3)}deg)`;
      if (running) raf = requestAnimationFrame(step);
    };
    // Only animate while the section is on screen
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(step);
      } else if (!e.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(section);

    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      const now = performance.now();
      if (lastX !== null && now - lastT < 100) {
        const v = (e.clientX - lastX) / Math.max(1, now - lastT);
        p.vel += Math.max(-1.2, Math.min(1.2, v * 0.9));
      }
      lastX = e.clientX;
      lastT = now;
    };
    section.addEventListener("pointermove", onMove);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      section.removeEventListener("pointermove", onMove);
    };
  }, [sectionRef]);

  const flip = () => {
    setFlipped((f) => !f);
    physics.current.vel += flipped ? -1.2 : 1.2;
  };

  return (
    <div className='lanyard' ref={lanyard}>
      <div className='strap' aria-hidden='true'>
        <span className='strap-text'>
          {`${PROFILE.name} · ${PROFILE.role} · `.toUpperCase().repeat(3)}
        </span>
      </div>
      <div className='clip' aria-hidden='true' />
      <div
        className={`idcard${flipped ? " flipped" : ""}`}
        tabIndex={0}
        role='button'
        aria-pressed={flipped}
        aria-label='Developer ID card - press Enter to flip'
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}>
        <div className='idcard-inner'>
          <div className='face face-front'>
            <div className='band'>
              <span>DEVELOPER ID</span>
              <b>{PROFILE.initials}</b>
            </div>
            <div className='photo-frame'>
              <div>
                <img
                  src='/bust.webp'
                  alt={PROFILE.name}
                  width={400}
                  height={500}
                  loading='lazy'
                />
              </div>
            </div>
            <p className='id-name'>{PROFILE.name}</p>
            <p className='id-role'>{PROFILE.role}</p>
            <dl className='id-rows'>
              {ID_CARD.rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className='id-foot'>
              <span className='barcode' aria-hidden='true' />
              <span className='holo' aria-hidden='true' />
            </div>
          </div>
          <div className='face face-back'>
            <h3>What I am</h3>
            <ul>
              {ID_CARD.back.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className='sign'>
              <p>{PROFILE.first}</p>
              <small>If found, say hello · {PROFILE.email}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
