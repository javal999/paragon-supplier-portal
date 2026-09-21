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
// calendar lives in `services/transitions/workingCalendarStore.ts`
// (`hubWorkingCalendar()`), and EVERY deadline in the hub reads it there — the
// `DEFAULT_WORKING_CALENDAR` below is only the base it is built from, and
// `hubCalendarReaders.guard.test.ts` refuses a deadline module that names it.
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
  /**
   * Dates ruled WORKING by ADM regardless of weekday (BL-50) — a make-up
   * Saturday, say. Absent on a calendar nobody has ruled on.
   */
  readonly extraWorkingDates?: ReadonlySet<string>;
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
  if (cal.extraWorkingDates?.has(date)) return true;
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

// ── BL-50 · A DAY RULED BY THE HUB ADMINISTRATOR (§3.4, Q-18 decided) ─────────
//
// The hub keeps its own calendar: loaded from the SAP factory calendar, then
// ADM can make any single day working or non-working, with a reason. A ruling
// is a FACT about one date, never a derived state — the deadlines that read the
// calendar are still computed at read time from whatever the calendar says.

/** What ADM says one date is. */
export type CalendarDayKind = 'working' | 'non-working';

export const CALENDAR_DAY_KINDS: readonly CalendarDayKind[] = Object.freeze(['working', 'non-working']);

export const isCalendarDayKind = (value: unknown): value is CalendarDayKind =>
  typeof value === 'string' && (CALENDAR_DAY_KINDS as readonly string[]).includes(value);

/** A readable `YYYY-MM-DD` that is a real date (not `2026-02-30`). */
export function isCalendarDate(value: unknown): value is string {
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
 */
export function withDayRulings(
  base: WorkingCalendar,
  rulings: readonly { readonly date: string; readonly kind: CalendarDayKind }[],
): WorkingCalendar {
  if (rulings.length === 0) return base;
  const ruled = new Map<string, CalendarDayKind>();
  for (const r of rulings) ruled.set(r.date, r.kind);
  const holidays = new Set(base.holidays);
  const extraWorking = new Set<string>();
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
