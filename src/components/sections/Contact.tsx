import { useState, type PointerEvent } from "react";
import { PROFILE } from "../../data/profile";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import "./Contact.css";

/** Splits text into letters that hop when the pointer passes over them. */
function HopText({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) =>
        ch === " " ? (
          " "
        ) : (
          <span className='ch' aria-hidden='true' key={i}>
            {ch}
          </span>
        ),
      )}
    </>
  );
}

const MARQUEE = Array.from({ length: 12 }, (_, i) =>
  i % 2 ? "let's talk" : "Say hello",
);

export function Contact() {
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const reduced = usePrefersReducedMotion();

  const hop = (e: PointerEvent<HTMLHeadingElement>) => {
    const c = (e.target as HTMLElement).closest(".ch");
    if (reduced || !c || c.classList.contains("hop")) return;
    c.classList.add("hop");
    c.addEventListener("animationend", () => c.classList.remove("hop"), {
      once: true,
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(""), 2200);
  };

  return (
    <section
      className='section contact'
      id='contact'
      aria-labelledby='contactTitle'>
      <div className='wrap'>
        <p className='tag mono rv'>08 - Contact</p>
        <h2
          className='contact-title'
          id='contactTitle'
          aria-label="Let's build something together."
          onPointerOver={hop}>
          <span className='ln'>
            <HopText text="Let's build" />
          </span>
          <span className='ln'>
            <em className='serif'>
              <HopText text='something' />
            </em>{" "}
            <HopText text='together.' />
          </span>
        </h2>

        <div className='contact-row'>
          <div>
            <div className='email-line'>
              <a className='email' href={`mailto:${PROFILE.email}`}>
                {PROFILE.email}
              </a>
              <button className='copy' type='button' onClick={copy}>
                {copied === "ok"
                  ? "Copied ✓"
                  : copied === "fail"
                    ? "Select & copy"
                    : "Copy"}
              </button>
              <span className='sr-only' aria-live='polite'>
                {copied === "ok" ? "Email copied" : ""}
              </span>
            </div>
            <div className='links'>
              <a className='btn btn-primary' href='#book'>
                Book a call →
              </a>
              <a className='btn btn-ghost' href={PROFILE.phoneHref}>
                {PROFILE.phone}
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
              <a className='btn btn-ghost' href={PROFILE.resume} download>
                Resume ↓
              </a>
            </div>
          </div>
          <a
            className='badge-spin'
            href={`mailto:${PROFILE.email}`}
            aria-label='Say hello by email'>
            <svg viewBox='0 0 150 150' aria-hidden='true'>
              <defs>
                <path
                  id='circ'
                  d='M75,75 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0'
                />
              </defs>
              <text>
                <textPath href='#circ'>
                  Say hello · Say hello · Say hello ·{" "}
                </textPath>
              </text>
            </svg>
            <span aria-hidden='true'>↗</span>
          </a>
        </div>
      </div>

      <div className='marquee' aria-hidden='true'>
        <div>
          {MARQUEE.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <footer className='foot wrap'>
        <p className='mono'>
          © {new Date().getFullYear()} {PROFILE.name}
        </p>
        <p className='mono'>Built with React, Vite &amp; Node.js</p>
        <a className='mono' href='#top'>
          Back to top ↑
        </a>
      </footer>
    </section>
  );
}
