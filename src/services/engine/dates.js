// ─────────────────────────────────────────────────────────────────────────────
// Calendar arithmetic for the engine — pure, UTC, day-granular.
//
// Every function parses a value it is GIVEN; none reads the clock (X-01). The
// machine-clock gate (`src/lib/machineClockGate`) holds that for this folder.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { IsoDate, IsoInstant } from './types' */

export const DAY_MS = 86_400_000;

/**
 * @param {IsoDate} d
 * @returns {number}
 */
const dayMs = (d) => Date.parse(`${d.slice(0, 10)}T00:00:00.000Z`);

/**
 * `d` plus `n` calendar days.
 * @param {IsoDate} d
 * @param {number} n
 * @returns {IsoDate}
 */
export function addDays(d, n) {
  return new Date(dayMs(d) + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Whole days from `a` to `b` (positive when `b` is later).
 * @param {IsoDate} a
 * @param {IsoDate} b
 * @returns {number}
 */
export function daysBetween(a, b) {
  return Math.round((dayMs(b) - dayMs(a)) / DAY_MS);
}

/**
 * The Monday on or before `d`.
 * @param {IsoDate} d
 * @returns {IsoDate}
 */
export function mondayOf(d) {
  const dow = new Date(dayMs(d)).getUTCDay(); // 0 = Sunday
  return addDays(d, -((dow + 6) % 7));
}

/**
 * An instant `hoursUtc` into day `d`.
 * @param {IsoDate} d
 * @param {number} hoursUtc
 * @returns {IsoInstant}
 */
export function instantOn(d, hoursUtc) {
  return new Date(dayMs(d) + hoursUtc * 3_600_000).toISOString();
}

/**
 * The calendar day of an instant (UTC).
 * @param {IsoInstant} i
 * @returns {IsoDate}
 */
export const dayOf = (i) => i.slice(0, 10);

/**
 * Instant `a` plus `hours`.
 * @param {IsoInstant} a
 * @param {number} hours
 * @returns {IsoInstant}
 */
export function addHours(a, hours) {
  return new Date(Date.parse(a) + hours * 3_600_000).toISOString();
}

/**
 * Is `d` a Saturday or Sunday?
 * @param {IsoDate} d
 * @returns {boolean}
 */
export function isWeekend(d) {
  const dow = new Date(dayMs(d)).getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * ISO-8601 week number of `d` (for labels only).
 * @param {IsoDate} d
 * @returns {number}
 */
export function isoWeek(d) {
  const t = new Date(dayMs(d));
  const thursday = new Date(t.getTime() + (3 - ((t.getUTCDay() + 6) % 7)) * DAY_MS);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.floor((thursday.getTime() - yearStart) / DAY_MS / 7) + 1;
}
