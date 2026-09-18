// ─────────────────────────────────────────────────────────────────────────────
// THE WORKING CALENDAR — REQUIREMENTS §3.4 (recommended default until Q-18).
//
// Monday to Friday, 08:00 to 17:00 WIB (UTC+7, no daylight saving), excluding
// the holidays below. A deadline that falls outside working hours moves to the
// next working hour. ADM maintains the holiday list [Proposed]; the 2026 seed is
// the national holidays plus collective leave (cuti bersama) as published for
// 2026, and is configurable by passing a different calendar.
//
// Pure: every function takes the instant it reasons about. Nothing here reads
// a clock, so a deadline is the same answer in a spec and in the browser.
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkingCalendar {
  /** Offset of the calendar's wall clock from UTC, in hours (WIB = 7). */
  readonly utcOffsetHours: number;
  /** First working hour of a working day (inclusive). */
  readonly startHour: number;
  /** End of the working day (exclusive): 17 means work stops at 17:00. */
  readonly endHour: number;
  /** ISO weekday numbers that are working days (1 = Monday … 7 = Sunday). */
  readonly workingWeekdays: ReadonlySet<number>;
  /** Non-working dates, `YYYY-MM-DD` in the calendar's own wall-clock date. */
  readonly holidays: ReadonlySet<string>;
}

/** Indonesian public holidays and collective leave, 2026 (seed; ADM-editable). */
export const INDONESIA_HOLIDAYS_2026: readonly string[] = [
  '2026-01-01',
  '2026-01-16',
  '2026-02-16',
  '2026-02-17',
  '2026-03-18',
  '2026-03-19',
  '2026-03-20',
  '2026-03-23',
  '2026-03-24',
  '2026-04-03',
  '2026-05-01',
  '2026-05-14',
  '2026-05-15',
  '2026-05-27',
  '2026-05-28',
  '2026-05-31',
  '2026-06-01',
  '2026-06-16',
  '2026-08-17',
  '2026-08-25',
  '2026-12-24',
  '2026-12-25',
];

export const DEFAULT_WORKING_CALENDAR: WorkingCalendar = {
  utcOffsetHours: 7,
  startHour: 8,
  endHour: 17,
  workingWeekdays: new Set([1, 2, 3, 4, 5]),
  holidays: new Set(INDONESIA_HOLIDAYS_2026),
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** The wall-clock parts of an instant in the calendar's zone. */
function wall(instantMs: number, cal: WorkingCalendar) {
  const d = new Date(instantMs + cal.utcOffsetHours * HOUR_MS);
  const iso = d.toISOString();
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return { date: iso.slice(0, 10), weekday, minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** The UTC instant of `hh:00` wall-clock on a calendar date. */
function instantAt(date: string, hour: number, cal: WorkingCalendar): number {
  return Date.parse(`${date}T00:00:00.000Z`) + (hour - cal.utcOffsetHours) * HOUR_MS;
}

function nextDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}

/** True when `date` (`YYYY-MM-DD`, wall clock) is a working day. */
export function isWorkingDay(date: string, cal: WorkingCalendar = DEFAULT_WORKING_CALENDAR): boolean {
  const d = new Date(`${date}T00:00:00.000Z`);
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return cal.workingWeekdays.has(weekday) && !cal.holidays.has(date);
}

/** The first working date on or after `date`. */
function workingDateOnOrAfter(date: string, cal: WorkingCalendar): string {
  let d = date;
  // A calendar with no working weekday would loop for ever; a year is plenty.
  for (let i = 0; i < 366; i++) {
    if (isWorkingDay(d, cal)) return d;
    d = nextDate(d);
  }
  throw new Error('working calendar has no working day within a year');
}

/**
 * The instant itself when it falls inside working hours; otherwise the next
 * working hour (the start of the next working day, or of today if it is a
 * working day and work has not started yet).
 */
export function nextWorkingInstant(
  instant: string | Date,
  cal: WorkingCalendar = DEFAULT_WORKING_CALENDAR,
): Date {
  const ms = typeof instant === 'string' ? Date.parse(instant) : instant.getTime();
  const w = wall(ms, cal);
  if (isWorkingDay(w.date, cal)) {
    if (w.minutesOfDay < cal.startHour * 60) return new Date(instantAt(w.date, cal.startHour, cal));
    if (w.minutesOfDay < cal.endHour * 60) return new Date(ms);
  }
  const day = workingDateOnOrAfter(nextDate(w.date), cal);
  return new Date(instantAt(day, cal.startHour, cal));
}

/**
 * `days` working days after `instant`. The start is first moved to the next
 * working hour, then carried to the same working time on each following
 * working day — one working day is one full working day of hours later.
 */
export function addWorkingDays(
  instant: string | Date,
  days: number,
  cal: WorkingCalendar = DEFAULT_WORKING_CALENDAR,
): Date {
  const start = nextWorkingInstant(instant, cal);
  const w = wall(start.getTime(), cal);
  let date = w.date;
  for (let i = 0; i < days; i++) date = workingDateOnOrAfter(nextDate(date), cal);
  const midnight = instantAt(date, 0, cal);
  return new Date(midnight + w.minutesOfDay * 60_000);
}

/**
 * Read a document date as an instant. A bare `YYYY-MM-DD` is the start of that
 * day in the calendar's zone (so a PO dated on a weekend counts from the next
 * working day, REQ-E07-02 edge case); a full timestamp is used as given.
 */
export function documentInstant(value: string, cal: WorkingCalendar = DEFAULT_WORKING_CALENDAR): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(instantAt(value, 0, cal));
  return new Date(value);
}
