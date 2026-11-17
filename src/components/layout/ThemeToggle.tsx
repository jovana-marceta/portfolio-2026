import { useRef } from "react";
import { useTheme } from "../../hooks/useTheme";
import { Icon } from "../ui/Icon";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const dark = theme === "dark";
  return (
    <button
      ref={ref}
      type="button"
      className="theme-btn"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      onClick={() => toggle(ref.current)}
    >
      <Icon name="moon" className="moon" />
      <Icon name="sun" className="sun" />
    </button>
  );
}
