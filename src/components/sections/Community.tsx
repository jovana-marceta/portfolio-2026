import { useEffect, useRef, useState } from "react";
import { COMMUNITY, type Milestone } from "../../data/profile";
import { useScrollFrame, requestScrollFrame } from "../../hooks/useScrollFrame";
import { prefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { pad2 } from "../../lib/format";
import { Icon } from "../ui/Icon";
import "./Community.css";

const format = (m: Milestone, v: number) =>
  m.plain
    ? v.toFixed(m.decimals ?? 0)
    : v.toLocaleString("en-US", {
        minimumFractionDigits: m.decimals ?? 0,
        maximumFractionDigits: m.decimals ?? 0,
      });

/** Huge number that counts up (easeOutQuart, 1.4 s) the first time it is mostly visible. */
function CountUp({ m }: { m: Milestone }) {
  const ref = useRef<HTMLDivElement>(null);
  const from = m.plain ? Math.floor(m.value * 0.98) : 0;
  const [val, setVal] = useState(from);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now(),
          dur = prefersReducedMotion() ? 1 : 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - t0) / dur);
          setVal(from + (m.value - from) * (1 - Math.pow(1 - t, 4)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [m.value, from]);

  return (
    <div
      className='big'
      ref={ref}
      aria-label={`${m.value}${m.suffix ?? ""} ${m.unit ?? ""}`.trim()}>
      {format(m, val)}
      {m.suffix && <small>{m.suffix}</small>}
      {m.unit && <small> {m.unit}</small>}
    </div>
  );
}

/** Pinned section: vertical scroll drives a horizontal track of milestone cards. */
export function Community() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const travel = useRef(0);
  const [focus, setFocus] = useState(-1);

  // The section is as tall as the viewport plus the horizontal travel distance
  useEffect(() => {
    const size = () => {
      const track = trackRef.current,
        sec = sectionRef.current;
      if (!track || !sec) return;
      travel.current = Math.max(0, track.scrollWidth - innerWidth);
      sec.style.height = `${innerHeight + travel.current}px`;
      requestScrollFrame();
    };
    size();
    addEventListener("resize", size);
    document.fonts?.ready.then(size);
    return () => removeEventListener("resize", size);
  }, []);

  useScrollFrame(() => {
    const sec = sectionRef.current,
      track = trackRef.current;
    if (!sec || !track) return;
    const r = sec.getBoundingClientRect();
    const p = travel.current
      ? Math.max(0, Math.min(1, -r.top / travel.current))
      : 0;
    track.style.transform = `translate3d(${-p * travel.current}px,0,0)`;
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;

    // Lift the card nearest the centre of the viewport
    let best = -1,
      bestD = Infinity;
    track.querySelectorAll<HTMLElement>(".acard:not(.end)").forEach((c, i) => {
      const b = c.getBoundingClientRect(),
        d = Math.abs(b.left + b.width / 2 - innerWidth / 2);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    const pinned = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
    setFocus(pinned ? best : -1);
  });

  const total = pad2(COMMUNITY.length);
  return (
    <section
      className='pin'
      id='community'
      aria-labelledby='comTitle'
      ref={sectionRef}>
      <div className='pin-sticky'>
        <div className='wrap pin-head'>
          <div>
            <p className='tag mono'>06 - Community &amp; milestones</p>
            <h2 className='h2' id='comTitle'>
              Proud <em className='serif'>moments.</em>
            </h2>
          </div>
          <div className='pin-bar' aria-hidden='true'>
            <i ref={barRef} />
          </div>
        </div>
        <div className='track' ref={trackRef}>
          {COMMUNITY.map((m, i) => (
            <article
              className={`acard${i === focus ? " focus" : ""}`}
              key={m.title}>
              <div className='acard-top'>
                <span className='alogo'>
                  <Icon name={m.icon} />
                </span>
                <span className='acard-idx'>
                  {pad2(i + 1)} / {total}
                </span>
              </div>
              <div className='acard-bot'>
                <div>
                  <span className='lbl'>{m.label}</span>
                  <h3>{m.title}</h3>
                  <p>{m.detail}</p>
                </div>
                <CountUp m={m} />
              </div>
            </article>
          ))}
          <div className='acard end'>
            <p>and counting →</p>
          </div>
        </div>
      </div>
    </section>
  );
}
