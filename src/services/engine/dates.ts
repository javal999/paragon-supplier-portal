// ─────────────────────────────────────────────────────────────────────────────
// Calendar arithmetic for the engine — pure, UTC, day-granular.
//
// Every function parses a value it is GIVEN; none reads the clock (X-01). The
// machine-clock gate (`src/lib/machineClockGate`) holds that for this folder.
// ─────────────────────────────────────────────────────────────────────────────

import type { IsoDate, IsoInstant } from './types';

export const DAY_MS = 86_400_000;

const dayMs = (d: IsoDate): number => Date.parse(`${d.slice(0, 10)}T00:00:00.000Z`);

/** `d` plus `n` calendar days. */
export function addDays(d: IsoDate, n: number): IsoDate {
  return new Date(dayMs(d) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((dayMs(b) - dayMs(a)) / DAY_MS);
}

/** The Monday on or before `d`. */
export function mondayOf(d: IsoDate): IsoDate {
  const dow = new Date(dayMs(d)).getUTCDay(); // 0 = Sunday
  return addDays(d, -((dow + 6) % 7));
}

/** An instant `hoursUtc` into day `d`. */
export function instantOn(d: IsoDate, hoursUtc: number): IsoInstant {
  return new Date(dayMs(d) + hoursUtc * 3_600_000).toISOString();
}

/** The calendar day of an instant (UTC). */
export const dayOf = (i: IsoInstant): IsoDate => i.slice(0, 10);

/** Instant `a` plus `hours`. */
export function addHours(a: IsoInstant, hours: number): IsoInstant {
  return new Date(Date.parse(a) + hours * 3_600_000).toISOString();
}

/** Is `d` a Saturday or Sunday? */
export function isWeekend(d: IsoDate): boolean {
  const dow = new Date(dayMs(d)).getUTCDay();
  return dow === 0 || dow === 6;
}

/** ISO-8601 week number of `d` (for labels only). */
export function isoWeek(d: IsoDate): number {
  const t = new Date(dayMs(d));
  const thursday = new Date(t.getTime() + (3 - ((t.getUTCDay() + 6) % 7)) * DAY_MS);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / DAY_MS / 7) + 1;
}
