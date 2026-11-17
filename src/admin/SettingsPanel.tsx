import { useState } from "react";
import type { Availability } from "../../shared/slots.js";
import { api } from "../lib/api";
import { useFeedback } from "./feedback";
import type { AdminMe } from "./AdminApp";

const DAYS: [number, string][] = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]];
const toText = (wins: [string, string][] = []) => wins.map((w) => w.join("-")).join(", ");
const HM = /^\d\d:\d\d$/;

export function SettingsPanel({ me, onSaved }: { me: AdminMe; onSaved: () => Promise<void> }) {
  const { toast, confirm } = useFeedback();
  const a = me.availability;
  const [hours, setHours] = useState<Record<number, string>>(() => Object.fromEntries(DAYS.map(([d]) => [d, toText(a.days[d])])));
  const [form, setForm] = useState({
    timezone: a.timezone, slotMinutes: String(a.slotMinutes), minNoticeHours: String(a.minNoticeHours),
    horizonDays: String(a.horizonDays), blockedDates: (a.blockedDates || []).join(", "),
  });
  const [link, setLink] = useState(me.meetingLink || "");
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveAvailability = async () => {
    const days: Availability["days"] = {};
    for (const [d, name] of DAYS) {
      const txt = hours[d].trim();
      if (!txt) continue;
      const wins = txt.split(",").map((s) => s.trim().split(/\s*-\s*/)).map(([x, y]) => [x?.padStart(5, "0"), y?.padStart(5, "0")] as [string, string]);
      if (wins.some(([x, y]) => !HM.test(x || "") || !HM.test(y || "") || x >= y)) { toast(`Check the hours for ${name}`); return; }
      days[d] = wins;
    }
    const availability = {
      timezone: form.timezone.trim(), slotMinutes: +form.slotMinutes, minNoticeHours: +form.minNoticeHours, horizonDays: +form.horizonDays,
      days, blockedDates: form.blockedDates.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try { await api("/api/admin/settings", "PUT", { availability }); await onSaved(); toast("Availability saved ✓"); }
    catch (ex) { toast((ex as Error).message); }
  };

  const saveLink = async () => {
    try { await api("/api/admin/settings", "PUT", { meetingLink: link }); toast("Link saved ✓"); }
    catch (ex) { toast((ex as Error).message); }
  };

  const copyFeed = async () => {
    try { await navigator.clipboard.writeText(me.calendarFeed); toast("Copied ✓"); }
    catch { toast("Select the address and copy it"); }
  };

  const rotate = async () => {
    if (!(await confirm("Create a new private address? The old one stops working, so you'll need to re-add it in your calendar."))) return;
    await api("/api/admin/settings", "PUT", { rotateCalendarToken: true });
    await onSaved();
    toast("New address created");
  };

  return (
    <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      <div className="card">
        <h2 style={{ margin: "0 0 6px", letterSpacing: "-.03em" }}>Weekly hours</h2>
        <p className="help" style={{ marginTop: 0 }}>Time ranges per day in your time zone, e.g. <code>10:00-13:00, 14:00-17:00</code>. Leave empty for a day off.</p>
        <div className="wk">
          {DAYS.map(([d, name]) => (
            <div className="wk-row field" key={d}>
              <label htmlFor={`d${d}`}>{name}</label>
              <input id={`d${d}`} value={hours[d]} placeholder="day off" onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <div className="field"><label htmlFor="sTz">Time zone</label><input id="sTz" value={form.timezone} onChange={set("timezone")} /></div>
          <div className="field"><label htmlFor="sLen">Call length (min)</label><input id="sLen" type="number" min={15} max={240} step={5} value={form.slotMinutes} onChange={set("slotMinutes")} /></div>
          <div className="field"><label htmlFor="sNotice">Min. notice (hours)</label><input id="sNotice" type="number" min={0} max={720} value={form.minNoticeHours} onChange={set("minNoticeHours")} /></div>
        </div>
        <div className="row">
          <div className="field"><label htmlFor="sHorizon">Book up to (days ahead)</label><input id="sHorizon" type="number" min={1} max={120} value={form.horizonDays} onChange={set("horizonDays")} /></div>
          <div className="field" style={{ gridColumn: "span 2" }}><label htmlFor="sBlocked">Days off (YYYY-MM-DD, comma-separated)</label><input id="sBlocked" placeholder="2026-12-25, 2027-01-01" value={form.blockedDates} onChange={set("blockedDates")} /></div>
        </div>
        <button className="btn btn-primary" onClick={saveAvailability}>Save availability</button>
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 6px", letterSpacing: "-.03em" }}>Calendar &amp; meeting link</h2>
        <div className="field" style={{ margin: "14px 0" }}>
          <label htmlFor="sLink">Video call link (Google Meet, Zoom, Teams…)</label>
          <input id="sLink" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <button className="btn btn-dark" onClick={saveLink}>Save link</button>
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "24px 0" }} />
        <h3 style={{ margin: "0 0 6px" }}>Show bookings in your Google Calendar</h3>
        <p className="help">
          Google Calendar → <b>Other calendars +</b> → <b>From URL</b> → paste this address. New bookings appear automatically
          (Google refreshes it every few hours). Works with Apple Calendar and Outlook too.
        </p>
        <p className="feed">{me.calendarFeed}</p>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={copyFeed}>Copy address</button>
          <button className="btn btn-ghost btn-sm" onClick={rotate}>Generate new private address</button>
        </div>
      </div>
    </div>
  );
}
