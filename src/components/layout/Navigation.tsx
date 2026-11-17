import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NAV, PROFILE } from "../../data/profile";
import { useScrollFrame } from "../../hooks/useScrollFrame";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import "./Navigation.css";

const SECTION_IDS = ["top", ...NAV.map((n) => n.id)];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("top");
  const [menuOpen, setMenuOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);

  // Scroll progress bar + "scrolled" state
  useScrollFrame(() => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    setScrolled(y > 40);
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  });

  // Track the section in the middle of the viewport
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    SECTION_IDS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  // Slide the ink pill under the active link
  const moveIndicator = () => {
    const ind = indRef.current, a = pillRef.current?.querySelector<HTMLAnchorElement>("a.active");
    if (!ind) return;
    if (!a) { ind.style.opacity = "0"; return; }
    ind.style.opacity = "1";
    ind.style.width = `${a.offsetWidth}px`;
    ind.style.transform = `translateX(${a.offsetLeft - 5}px)`;
  };
  useLayoutEffect(moveIndicator, [active]);
  useEffect(() => {
    addEventListener("resize", moveIndicator);
    document.fonts?.ready.then(moveIndicator);
    return () => removeEventListener("resize", moveIndicator);
  }, []);

  return (
    <>
      <div className="progress" ref={progressRef} aria-hidden="true" />
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap">
          <a className="mark" href="#top" aria-label={`${PROFILE.name} — back to top`}>
            <span className="mark-dot">{PROFILE.initials}</span>
            <span className="mark-name">{PROFILE.name}</span>
          </a>
          <nav className="nav-pill" aria-label="Sections" ref={pillRef}>
            <span className="nav-ind" ref={indRef} style={{ left: 5 }} aria-hidden="true" />
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={active === n.id ? "active" : undefined} aria-current={active === n.id ? "true" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="nav-right">
            <ThemeToggle />
            <button className="btn btn-dark btn-sm menu-btn" aria-expanded={menuOpen} aria-controls="overlay" onClick={() => setMenuOpen(true)}>
              Menu
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
