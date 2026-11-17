import { useRef } from "react";
import { PROFILE, QUICK_FACTS } from "../../data/profile";
import { vars } from "../../lib/css";
import { SectionHeading } from "../ui/SectionHeading";
import { IdCard } from "./IdCard";
import "./About.css";

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      className='section'
      id='about'
      aria-labelledby='aboutTitle'
      ref={sectionRef}>
      <div className='wrap about-grid'>
        <div className='about-left'>
          <SectionHeading
            id='aboutTitle'
            index='01'
            label='About'
            lines={["Hi, I'm", <em className='serif'>{PROFILE.first}.</em>]}
          />
          <p className='rv'>{PROFILE.summary}</p>
          <p className='rv'>{PROFILE.education}</p>
          <div className='btns rv'>
            <a className='btn btn-dark' href={PROFILE.resume} download>
              Resume ↓
            </a>
            <a
              className='btn btn-ghost'
              href={PROFILE.github}
              target='_blank'
              rel='noopener'>
              GitHub ↗
            </a>
            <a
              className='btn btn-ghost'
              href={PROFILE.linkedin}
              target='_blank'
              rel='noopener'>
              LinkedIn ↗
            </a>
          </div>
        </div>

        <div className='lanyard-col'>
          <IdCard sectionRef={sectionRef} />
        </div>

        <div className='facts'>
          <p className='tag mono rv'>Quick facts</p>
          <dl>
            {QUICK_FACTS.map((f, i) => (
              <div className='rv' style={vars({ "--i": i + 1 })} key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
            <div className='rv' style={vars({ "--i": QUICK_FACTS.length + 1 })}>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
              </dd>
            </div>
          </dl>
          <p className='quote rv'>{PROFILE.quote}</p>
        </div>
      </div>
    </section>
  );
}
