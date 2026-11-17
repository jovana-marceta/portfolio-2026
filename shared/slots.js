// Availability → bookable slots. Shared by the server (source of truth) and the
// browser (used only in offline preview mode). All times are computed in the
// owner's time zone, then returned as UTC ISO strings.

export const DEFAULT_AVAILABILITY = {
  timezone: "Europe/Belgrade",
  slotMinutes: 30,
  // 0 = Sunday … 6 = Saturday. Each day: list of [start, end] "HH:MM" windows.
  days: {
    1: [["10:00", "13:00"], ["14:00", "17:00"]],
    2: [["10:00", "13:00"], ["14:00", "17:00"]],
    3: [["10:00", "13:00"], ["14:00", "17:00"]],
    4: [["10:00", "13:00"], ["14:00", "17:00"]],
    5: [["10:00", "13:00"]],
  },
  minNoticeHours: 12,
  horizonDays: 30,
  blockedDates: [], // ["2026-12-25", …] in owner time zone
};

function tzOffsetMs(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Local wall time in `timeZone` → UTC epoch ms. */
export function zonedToUtc(y, m, d, hh, mm, timeZone) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - tzOffsetMs(guess, timeZone);
  const again = guess - tzOffsetMs(ts, timeZone);
  if (again !== ts) ts = again;
  return ts;
}

/** Calendar date (Y, M, D, weekday) of a UTC instant, in `timeZone`. */
export function zonedDate(utcMs, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(new Date(utcMs))
      .map((x) => [x.type, x.value])
  );
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return { y: +p.year, m: +p.month, d: +p.day, wd };
}

const pad = (n) => String(n).padStart(2, "0");

/**
 * Returns [{ date: "YYYY-MM-DD" (owner tz), slots: [{ start, end }] }] for the horizon,
 * excluding slots that overlap `taken` (array of {start,end} ISO) and slots inside min notice.
 */
export function buildSlots(av = DEFAULT_AVAILABILITY, taken = [], now = Date.now()) {
  const tz = av.timezone || "Europe/Belgrade";
  const step = (av.slotMinutes || 30) * 60000;
  const earliest = now + (av.minNoticeHours ?? 12) * 3600000;
  const busy = taken.map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  const blocked = new Set(av.blockedDates || []);
  const result = [];
  const today = zonedDate(now, tz);
  for (let k = 0; k <= (av.horizonDays || 30); k++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + k, 12));
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate(), wd = base.getUTCDay();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    const windows = (av.days && av.days[wd]) || [];
    if (!windows.length || blocked.has(key)) continue;
    const slots = [];
    for (const [a, b] of windows) {
      const [ah, am] = a.split(":").map(Number);
      const [bh, bm] = b.split(":").map(Number);
      const startW = zonedToUtc(y, m, d, ah, am, tz);
      const endW = zonedToUtc(y, m, d, bh, bm, tz);
      for (let t = startW; t + step <= endW; t += step) {
        if (t < earliest) continue;
        const e = t + step;
        if (busy.some(([bs, be]) => t < be && e > bs)) continue;
        slots.push({ start: new Date(t).toISOString(), end: new Date(e).toISOString() });
      }
    }
    if (slots.length) result.push({ date: key, slots });
  }
  return result;
}

export function isBookable(av, taken, startIso, now = Date.now()) {
  return buildSlots(av, taken, now).some((day) => day.slots.some((s) => s.start === startIso));
}
