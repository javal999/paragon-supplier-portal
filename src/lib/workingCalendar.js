// ─────────────────────────────────────────────────────────────────────────────
// THE WORKING CALENDAR ARITHMETIC — REQUIREMENTS §3.4.
//
// Monday to Friday, 08:00 to 17:00 WIB (UTC+7, no daylight saving), excluding
// the holidays below. A deadline that falls outside working hours moves to the
// next working hour. The 2026 list is the national holidays plus collective
// leave (cuti bersama) as published for 2026.
//
// ⚠️ **THIS FILE IS THE ARITHMETIC, NOT THE CALENDAR IN FORCE.** Q-18 was
// decided on 2026-09-21: the hub keeps its own calendar, loaded from the SAP
// factory calendar and maintained by the Hub administrator (BL-50). That
// calendar lives in `services/transitions/workingCalendarStore.js`
// (`hubWorkingCalendar()`), and EVERY deadline in the hub reads it there — the
// `DEFAULT_WORKING_CALENDAR` below is only the base it is built from, and
// `hubCalendarReaders.guard.test.js` refuses a deadline module that names it.
//
// Pure: every function takes the instant it reasons about. Nothing here reads
// a clock, so a deadline is the same answer in a spec and in the browser.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} WorkingCalendar
 * @property {number} utcOffsetHours -  Offset of the calendar's wall clock from UTC, in hours (WIB = 7).
 * @property {number} startHour -  First working hour of a working day (inclusive).
 * @property {number} endHour -  End of the working day (exclusive): 17 means work stops at 17:00.
 * @property {ReadonlySet<number>} workingWeekdays -  ISO weekday numbers that are working days (1 = Monday … 7 = Sunday).
 * @property {ReadonlySet<string>} holidays -  Non-working dates, `YYYY-MM-DD` in the calendar's own wall-clock date.
 * @property {ReadonlySet<string>} [extraWorkingDates] Dates ruled WORKING by ADM regardless of weekday (BL-50) — a make-up
 *   Saturday, say. Absent on a calendar nobody has ruled on.
 */

/**
 * Indonesian public holidays and collective leave, 2026 (seed; ADM-editable).
 * @type {readonly string[]}
 */
export const INDONESIA_HOLIDAYS_2026 = [
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
  '2026-12-25'
];

/** @type {WorkingCalendar} */
export const DEFAULT_WORKING_CALENDAR = {
  utcOffsetHours: 7,
  startHour: 8,
  endHour: 17,
  workingWeekdays: new Set([1, 2, 3, 4, 5]),
  holidays: new Set(INDONESIA_HOLIDAYS_2026)
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The wall-clock parts of an instant in the calendar's zone.
 * @param {number} instantMs
 * @param {WorkingCalendar} cal
 */
function wall(instantMs, cal) {
  const d = new Date(instantMs + cal.utcOffsetHours * HOUR_MS);
  const iso = d.toISOString();
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return {
    date: iso.slice(0, 10),
    weekday,
    minutesOfDay: d.getUTCHours() * 60 + d.getUTCMinutes()
  };
}

/**
 * The UTC instant of `hh:00` wall-clock on a calendar date.
 * @param {string} date
 * @param {number} hour
 * @param {WorkingCalendar} cal
 * @returns {number}
 */
function instantAt(date, hour, cal) {
  return Date.parse(`${date}T00:00:00.000Z`) + (hour - cal.utcOffsetHours) * HOUR_MS;
}

/**
 * @param {string} date
 * @returns {string}
 */
function nextDate(date) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * True when `date` (`YYYY-MM-DD`, wall clock) is a working day.
 * @param {string} date
 * @param {WorkingCalendar} [cal]
 * @returns {boolean}
 */
export function isWorkingDay(date, cal = DEFAULT_WORKING_CALENDAR) {
  if (cal.extraWorkingDates?.has(date)) return true;
  const d = new Date(`${date}T00:00:00.000Z`);
  const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return cal.workingWeekdays.has(weekday) && !cal.holidays.has(date);
}

/**
 * The first working date on or after `date`.
 * @param {string} date
 * @param {WorkingCalendar} cal
 * @returns {string}
 */
function workingDateOnOrAfter(date, cal) {
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
 * @param {string | Date} instant
 * @param {WorkingCalendar} [cal]
 * @returns {Date}
 */
export function nextWorkingInstant(instant, cal = DEFAULT_WORKING_CALENDAR) {
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
 * @param {string | Date} instant
 * @param {number} days
 * @param {WorkingCalendar} [cal]
 * @returns {Date}
 */
export function addWorkingDays(instant, days, cal = DEFAULT_WORKING_CALENDAR) {
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
 * @param {string} value
 * @param {WorkingCalendar} [cal]
 * @returns {Date}
 */
export function documentInstant(value, cal = DEFAULT_WORKING_CALENDAR) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(instantAt(value, 0, cal));
  return new Date(value);
}

// ── BL-50 · A DAY RULED BY THE HUB ADMINISTRATOR (§3.4, Q-18 decided) ─────────
//
// The hub keeps its own calendar: loaded from the SAP factory calendar, then
// ADM can make any single day working or non-working, with a reason. A ruling
// is a FACT about one date, never a derived state — the deadlines that read the
// calendar are still computed at read time from whatever the calendar says.

/** What ADM says one date is. */
/** @typedef {'working' | 'non-working'} CalendarDayKind */

/** @type {readonly CalendarDayKind[]} */
export const CALENDAR_DAY_KINDS = Object.freeze(['working', 'non-working']);

/**
 * @param {unknown} value
 * @returns {value is CalendarDayKind}
 */
export const isCalendarDayKind = (value) =>
  typeof value === 'string' &&
  /** @type {readonly string[]} */ (CALENDAR_DAY_KINDS).includes(value);

/**
 * A readable `YYYY-MM-DD` that is a real date (not `2026-02-30`).
 * @param {unknown} value
 * @returns {value is string}
 */
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

/**
 * The calendar after ADM's rulings. Each ruling decides its date outright,
 * whatever the base said and whatever weekday it is: a `non-working` Tuesday is
 * a holiday, a `working` Saturday is a make-up day. Later rulings for the same
 * date replace earlier ones, so pass them oldest first.
 *
 * A working Saturday cannot be expressed as a holiday removal — the base treats
 * weekends by weekday, not by list — so a ruled day is carried as an explicit
 * per-date answer rather than folded into `holidays`.
 * @param {WorkingCalendar} base
 * @param {readonly { readonly date: string; readonly kind: CalendarDayKind }[]} rulings
 * @returns {WorkingCalendar}
 */
export function withDayRulings(base, rulings) {
  if (rulings.length === 0) return base;
  const ruled = /** @type {Map<string, CalendarDayKind>} */ (new Map());
  for (const r of rulings) ruled.set(r.date, r.kind);
  const holidays = new Set(base.holidays);
  const extraWorking = /** @type {Set<string>} */ (new Set());
  for (const [date, kind] of ruled) {
    if (kind === 'non-working') {
      holidays.add(date);
    } else {
      holidays.delete(date);
      extraWorking.add(date);
    }
  }
  return { ...base, holidays, extraWorkingDates: extraWorking };
}
