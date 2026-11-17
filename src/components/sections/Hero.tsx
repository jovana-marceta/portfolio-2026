import { HERO_CHIPS, HERO_STATS, PROFILE } from "../../data/profile";
import { vars } from "../../lib/css";
import "./Hero.css";

export function Hero() {
  return (
    <section className='hero' id='top' aria-labelledby='heroTitle'>
      <div className='ghost' aria-hidden='true'>
        {PROFILE.first.toUpperCase()}
      </div>
      <div className='wrap'>
        <div>
          <p className='hero-kicker rv' style={vars({ "--i": 0 })}>
            <span className='pulse' aria-hidden='true' />
            {PROFILE.name} · {PROFILE.location}
          </p>
          <h1 id='heroTitle'>
            <span className='rv-mask' style={vars({ "--i": 1 })}>
              <span>Fullstack</span>
            </span>
            <span className='rv-mask' style={vars({ "--i": 2 })}>
              <span>Software</span>
            </span>
            <span className='rv-mask' style={vars({ "--i": 3 })}>
              <span>
                <em className='serif'>Engineer.</em>
              </span>
            </span>
          </h1>
          <p className='hero-sub rv' style={vars({ "--i": 4 })}>
            6+ years building backend services and REST APIs with .NET / C# and
            Node.js (NestJS), and modern interfaces in Angular and React.
          </p>
          <div className='hero-cta rv' style={vars({ "--i": 5 })}>
            <a className='btn btn-primary' href='#book'>
              Book a call →
            </a>
            <a className='btn btn-ghost' href='#experience'>
              Explore work
            </a>
            <a className='btn btn-ghost' href={PROFILE.resume} download>
              Resume ↓
            </a>
          </div>
          <div className='hero-meta rv' style={vars({ "--i": 6 })}>
            {HERO_STATS.map((s) => (
              <div key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='hero-visual'>
          <div className='halo' aria-hidden='true' />
          <div className='orbit' aria-hidden='true' />
          <div className='hero-photo'>
            <img
              src='/portrait.webp'
              alt={`Portrait of ${PROFILE.name}`}
              width={500}
              height={625}
              fetchPriority='high'
            />
          </div>
          {HERO_CHIPS.map((c, i) => (
            <div
              className={`float-chip fc-${i + 1}`}
              key={c.sym}
              aria-hidden='true'>
              <span className='ic'>{c.sym}</span>
              <span>
                {c.title}
                <small>{c.sub}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className='scroll-cue mono' aria-hidden='true'>
        <i />
        Scroll
      </div>
    </section>
  );
}
