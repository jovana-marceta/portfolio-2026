export const pad2 = (n: number) => String(n).padStart(2, "0");

export const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const fmtLong = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** YYYY-MM-DD of a Date in the browser's local time zone */
export const localKey = (d: Date) => d.toLocaleDateString("en-CA");

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
