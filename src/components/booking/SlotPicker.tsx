import { useEffect, useMemo, useState } from "react";
import type { Slot } from "../../../shared/slots.js";
import { fmtLong, fmtTime, localKey } from "../../lib/format";

interface Props {
  byDay: Map<string, Slot[]>;
  timezoneLabel: string;
  selected: Slot | null;
  onSelect: (slot: Slot) => void;
  onContinue: () => void;
}

const DAY = 864e5;
const noon = (d: Date) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
};
const mondayOf = (d: Date) => {
  const x = noon(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/** Step 1: a week strip of days and a grid of free times. */
export function SlotPicker({
  byDay,
  timezoneLabel,
  selected,
  onSelect,
  onContinue,
}: Props) {
  const keys = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const today = noon(new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [day, setDay] = useState<string | null>(null);

  // Jump to the first week that has free slots
  useEffect(() => {
    if (!keys.length) return;
    const first = noon(new Date(`${keys[0]}T12:00:00`));
    setWeekStart((ws) =>
      first.getTime() - ws.getTime() >= 7 * DAY ? mondayOf(first) : ws,
    );
  }, [keys]);

  const days = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekKeys = days.map(localKey);

  // Keep a day selected inside the visible week
  useEffect(() => {
    if (!day || !weekKeys.includes(day) || !byDay.get(day)?.length)
      setDay(weekKeys.find((k) => byDay.get(k)?.length) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.getTime(), byDay]);

  const shift = (n: number) =>
    setWeekStart((ws) => {
      const x = new Date(ws);
      x.setDate(x.getDate() + 7 * n);
      return x;
    });
  const slots = (day && byDay.get(day)) || [];
  const last = keys[keys.length - 1];
  const short = (d: Date) =>
    d.toLocaleDateString([], { day: "numeric", month: "short" });

  return (
    <>
      <div className='bk-head'>
        <h3>
          {short(days[0])} – {short(days[6])}
        </h3>
        <div className='bk-nav'>
          <button
            aria-label='Previous week'
            disabled={weekStart <= today}
            onClick={() => shift(-1)}>
            ←
          </button>
          <button
            aria-label='Next week'
            disabled={!last || weekKeys[6] >= last}
            onClick={() => shift(1)}>
            →
          </button>
        </div>
      </div>

      <div className='days' role='group' aria-label='Days'>
        {days.map((d, i) => {
          const k = weekKeys[i],
            n = byDay.get(k)?.length ?? 0;
          const long = d.toLocaleDateString([], {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return (
            <button
              key={k}
              className='day'
              disabled={!n}
              aria-pressed={k === day}
              aria-label={`${long}${n ? `, ${n} times available` : ", unavailable"}`}
              onClick={() => setDay(k)}>
              <small>{d.toLocaleDateString([], { weekday: "short" })}</small>
              <b>{d.getDate()}</b>
              <em>{n ? `${n} slots` : "-"}</em>
            </button>
          );
        })}
      </div>

      <p className='times-label'>
        <span>
          {day
            ? new Date(`${day}T12:00:00`).toLocaleDateString([], {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : "No times this week"}
        </span>
        <span>Your time zone: {timezoneLabel}</span>
      </p>
      <div className='times' role='group' aria-label='Times'>
        {slots.length ? (
          slots.map((s) => (
            <button
              key={s.start}
              className='time'
              aria-pressed={selected?.start === s.start}
              onClick={() => onSelect(s)}>
              {fmtTime(s.start)}
            </button>
          ))
        ) : (
          <p style={{ color: "var(--mute)", margin: "6px 0" }}>
            Try the next week →
          </p>
        )}
      </div>

      <div className='bk-foot'>
        <p>
          {selected ? (
            <strong>{fmtLong(selected.start)}</strong>
          ) : (
            "No time selected yet."
          )}
        </p>
        <button
          className='btn btn-primary'
          disabled={!selected}
          onClick={onContinue}>
          Continue →
        </button>
      </div>
    </>
  );
}
