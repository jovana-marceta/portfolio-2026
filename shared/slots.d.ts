export interface Availability {
  timezone: string;
  slotMinutes: number;
  /** 0 = Sunday … 6 = Saturday → list of ["HH:MM", "HH:MM"] windows */
  days: Record<string, [string, string][]>;
  minNoticeHours: number;
  horizonDays: number;
  blockedDates: string[];
}
export interface Slot { start: string; end: string }
export interface DaySlots { date: string; slots: Slot[] }

export const DEFAULT_AVAILABILITY: Availability;
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): number;
export function zonedDate(utcMs: number, timeZone: string): { y: number; m: number; d: number; wd: number };
export function buildSlots(av?: Availability, taken?: Slot[], now?: number): DaySlots[];
export function isBookable(av: Availability, taken: Slot[], startIso: string, now?: number): boolean;
