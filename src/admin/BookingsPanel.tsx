import { useCallback, useEffect, useState } from "react";
import { api, type AdminBooking } from "../lib/api";
import { useFeedback } from "./feedback";

export function BookingsPanel({ timezone }: { timezone: string }) {
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(
    () => api<AdminBooking[]>("/api/admin/bookings").then(setRows),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (b: AdminBooking, status: AdminBooking["status"]) => {
    if (
      status === "cancelled" &&
      !(await confirm("Cancel this call? Let the guest know by email."))
    )
      return;
    try {
      await api(`/api/admin/bookings/${b.id}`, "PATCH", { status });
      load();
    } catch (ex) {
      toast((ex as Error).message);
    }
  };

  const now = new Date().toISOString();
  const list = rows
    .filter((b) => showPast || b.end_utc > now)
    .sort((a, b) => a.start_utc.localeCompare(b.start_utc));

  return (
    <div className='card'>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 10,
        }}>
        <h2 style={{ margin: 0, letterSpacing: "-.03em" }}>Booked calls</h2>
        <label
          style={{
            fontSize: 14,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}>
          <input
            type='checkbox'
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
          />{" "}
          Show past
        </label>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Topic &amp; note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className='help'>
                  No upcoming calls yet.
                </td>
              </tr>
            )}
            {list.map((b) => (
              <tr key={b.id} className={b.status}>
                <td>
                  <strong>
                    {new Date(b.start_utc).toLocaleString("en-GB", {
                      timeZone: timezone,
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  <small>{timezone}</small>
                </td>
                <td>
                  {b.name}
                  <small>
                    <a href={`mailto:${b.email}`}>{b.email}</a>
                  </small>
                </td>
                <td>
                  {b.topic || "-"}
                  <small>{b.note}</small>
                </td>
                <td>
                  {b.status === "confirmed" ? (
                    <button
                      className='btn btn-ghost btn-sm'
                      onClick={() => setStatus(b, "cancelled")}>
                      Cancel
                    </button>
                  ) : (
                    <button
                      className='btn btn-ghost btn-sm'
                      onClick={() => setStatus(b, "confirmed")}>
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
