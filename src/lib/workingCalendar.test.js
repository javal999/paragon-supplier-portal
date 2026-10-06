import { describe, expect, it } from 'vitest';
/** @import { WorkingCalendar } from './workingCalendar' */
import {
  DEFAULT_WORKING_CALENDAR,
  addWorkingDays,
  documentInstant,
  isWorkingDay,
  nextWorkingInstant
} from './workingCalendar';

// WIB is UTC+7: 08:00 WIB = 01:00Z, 17:00 WIB = 10:00Z.
/**
 * @param {string} date
 * @param {string} hhmm
 */
const wib = (date, hhmm) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

describe('isWorkingDay', () => {
  it('Monday to Friday are working days; the weekend is not', () => {
    expect(isWorkingDay('2026-09-14')).toBe(true); // Monday
    expect(isWorkingDay('2026-09-18')).toBe(true); // Friday
    expect(isWorkingDay('2026-09-19')).toBe(false); // Saturday
    expect(isWorkingDay('2026-09-20')).toBe(false); // Sunday
  });

  it('a seeded public holiday is not a working day', () => {
    expect(isWorkingDay('2026-08-17')).toBe(false); // Independence Day, a Monday
    expect(isWorkingDay('2026-08-18')).toBe(true);
  });
});

describe('addWorkingDays — 1 working day (REQUIREMENTS §3.4)', () => {
  it('normal: inside working hours on a weekday → same time the next day', () => {
    expect(addWorkingDays(wib('2026-09-15', '10:30'), 1).toISOString()).toBe(
      wib('2026-09-16', '10:30')
    );
  });

  it('weekend: Friday afternoon → Monday afternoon', () => {
    expect(addWorkingDays(wib('2026-09-18', '14:00'), 1).toISOString()).toBe(
      wib('2026-09-21', '14:00')
    );
  });

  it('a PO created on a Saturday counts from Monday 08:00', () => {
    expect(addWorkingDays(wib('2026-09-19', '11:00'), 1).toISOString()).toBe(
      wib('2026-09-22', '08:00')
    );
  });

  it('holiday: the day before Independence Day skips the holiday', () => {
    // Friday 14 Aug 2026 → Monday 17 Aug is a holiday → Tuesday 18 Aug.
    expect(addWorkingDays(wib('2026-08-14', '09:15'), 1).toISOString()).toBe(
      wib('2026-08-18', '09:15')
    );
  });

  it('after hours: a 19:00 PO moves to the next working hour, then one working day', () => {
    expect(nextWorkingInstant(wib('2026-09-15', '19:00')).toISOString()).toBe(
      wib('2026-09-16', '08:00')
    );
    expect(addWorkingDays(wib('2026-09-15', '19:00'), 1).toISOString()).toBe(
      wib('2026-09-17', '08:00')
    );
  });

  it('before hours: 06:00 moves to 08:00 the same day; 17:00 exactly is already after hours', () => {
    expect(nextWorkingInstant(wib('2026-09-15', '06:00')).toISOString()).toBe(
      wib('2026-09-15', '08:00')
    );
    expect(nextWorkingInstant(wib('2026-09-15', '17:00')).toISOString()).toBe(
      wib('2026-09-16', '08:00')
    );
    expect(nextWorkingInstant(wib('2026-09-15', '16:59')).toISOString()).toBe(
      wib('2026-09-15', '16:59')
    );
  });

  it('a date-only document date starts at 00:00 WIB, so it is due 08:00 the next working day', () => {
    const start = documentInstant('2026-09-15');
    expect(start.toISOString()).toBe(wib('2026-09-15', '00:00'));
    expect(addWorkingDays(start, 1).toISOString()).toBe(wib('2026-09-16', '08:00'));
  });

  it('the holiday list is configurable', () => {
    /** @type {WorkingCalendar} */
    const noHolidays = { ...DEFAULT_WORKING_CALENDAR, holidays: new Set() };
    expect(addWorkingDays(wib('2026-08-14', '09:15'), 1, noHolidays).toISOString()).toBe(
      wib('2026-08-17', '09:15')
    );
  });
});
