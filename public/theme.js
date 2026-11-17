// Light / dark theme toggle. The initial theme is set by an inline script in <head>
// (saved choice, else the device setting) so the page never flashes the wrong colours.

const root = document.documentElement;
const META = { light: "#f6f3fc", dark: "#0e0918" };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICONS = `
  <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>
  <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>`;

const current = () => (root.dataset.theme === "dark" ? "dark" : "light");

function paint(theme) {
  root.dataset.theme = theme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = META[theme];
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", theme === "dark");
    b.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    b.title = theme === "dark" ? "Light mode" : "Dark mode";
  });
}

function setTheme(theme, origin) {
  try { localStorage.setItem("theme", theme); } catch {}
  if (reduced()) return paint(theme);
  // Circular reveal from the button where the browser supports View Transitions
  if (document.startViewTransition && origin) {
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(() => paint(theme));
    t.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
    return;
  }
  root.classList.add("theme-fade");
  paint(theme);
  setTimeout(() => root.classList.remove("theme-fade"), 500);
}

export function initThemeToggles() {
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    if (!b.innerHTML.trim()) b.innerHTML = ICONS;
    b.addEventListener("click", () => setTheme(current() === "dark" ? "light" : "dark", b));
  });
  paint(current());
  // Follow the device setting until the visitor picks a theme themselves
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch {}
    if (!saved) paint(e.matches ? "dark" : "light");
  });
}

initThemeToggles();
