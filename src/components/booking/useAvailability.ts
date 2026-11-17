import { useEffect, useMemo, useState } from "react";
import { DEFAULT_AVAILABILITY, buildSlots, type Slot } from "../../../shared/slots.js";
import { api, type AvailabilityResponse } from "../../lib/api";

/** Loads free slots from the API (or builds sample slots when the API isn't running). */
export function useAvailability() {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    api<AvailabilityResponse>("/api/availability")
      .then(setData)
      .catch(() => {
        const av = DEFAULT_AVAILABILITY;
        setPreview(true);
        setData({ timezone: av.timezone, slotMinutes: av.slotMinutes, days: buildSlots(av, []) });
      });
  }, []);

  // Group slots by the *visitor's* local date
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    data?.days.flatMap((d) => d.slots).forEach((s) => {
      const k = new Date(s.start).toLocaleDateString("en-CA");
      map.set(k, [...(map.get(k) || []), s]);
    });
    return map;
  }, [data]);

  /** Remove a slot locally after it was booked (or turned out to be taken) */
  const removeSlot = (start: string) =>
    setData((d) => d && { ...d, days: d.days.map((day) => ({ ...day, slots: day.slots.filter((s) => s.start !== start) })) });

  return { data, byDay, preview, removeSlot };
}
