import { useEffect, useRef, useState } from "react";
import { NAV } from "../../data/profile";
import { pad2 } from "../../lib/format";
import { vars } from "../../lib/css";

interface Props { open: boolean; onClose: () => void }

/** Full-screen paper overlay that reveals with a clip-path circle. Esc closes, page scroll is locked. */
export function MobileMenu({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => firstLink.current?.focus(), 300);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }
    setVisible(false);
    document.body.style.overflow = "";
    const t = setTimeout(() => setMounted(false), 800);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const close = () => {
    onClose();
    document.querySelector<HTMLButtonElement>(".menu-btn")?.focus();
  };

  if (!mounted) return null;
  return (
    <div className={`overlay${visible ? " open" : ""}`} id="overlay" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="btn btn-ghost btn-sm overlay-close" onClick={close}>Close</button>
      <ol>
        {NAV.map((n, i) => (
          <li key={n.id} style={vars({ "--i": i })}>
            <a href={`#${n.id}`} ref={i === 0 ? firstLink : undefined} onClick={onClose}>
              <span>{pad2(i + 1)}</span>{"long" in n ? n.long : n.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
