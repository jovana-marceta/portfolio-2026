import { useCallback, useEffect, useState } from "react";
import { prefersReducedMotion } from "./usePrefersReducedMotion";

export type Theme = "light" | "dark";

const root = document.documentElement;
const META: Record<Theme, string> = { light: "#f6f3fc", dark: "#0e0918" };
const read = (): Theme => (root.dataset.theme === "dark" ? "dark" : "light");

function paint(theme: Theme) {
  root.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = META[theme];
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/**
 * Light / dark theme. The initial value is set by an inline script in index.html
 * (saved choice, else the device setting) so the first paint is already correct.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(read);

  // Follow the device setting until the visitor picks a theme themselves
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("theme"); } catch { /* storage unavailable */ }
      if (!saved) { const t: Theme = e.matches ? "dark" : "light"; paint(t); setThemeState(t); }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme, origin?: HTMLElement | null) => {
    try { localStorage.setItem("theme", next); } catch { /* storage unavailable */ }
    const apply = () => { paint(next); setThemeState(next); };
    const doc = document as ViewTransitionDoc;

    if (prefersReducedMotion()) return apply();

    // Circular reveal from the toggle button where View Transitions are supported
    if (doc.startViewTransition && origin) {
      const r = origin.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      doc.startViewTransition(apply).ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
      return;
    }
    root.classList.add("theme-fade");
    apply();
    setTimeout(() => root.classList.remove("theme-fade"), 500);
  }, []);

  const toggle = useCallback((origin?: HTMLElement | null) => setTheme(read() === "dark" ? "light" : "dark", origin), [setTheme]);

  return { theme, setTheme, toggle };
}
