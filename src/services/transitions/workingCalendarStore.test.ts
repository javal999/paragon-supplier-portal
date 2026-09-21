import { describe, it, expect, beforeEach } from 'vitest';
import { addWorkingDays, isWorkingDay, withDayRulings, DEFAULT_WORKING_CALENDAR } from '../../lib/workingCalendar';
import {
  SAP_BASE_CALENDAR,
  SAP_FACTORY_CALENDAR,
  WORKING_CALENDAR_KEY,
  calendarCovers,
  calendarDay,
  calendarRulingRefusal,
  hubWorkingCalendar,
  listedCalendarDays,
  workingCalendarStore,
  type CalendarDayRuling,
} from './workingCalendarStore';

// ─────────────────────────────────────────────────────────────────────────────
// BL-50 · THE HUB WORKING CALENDAR — the SAP load plus the administrator's
// rulings, and the ONE calendar every deadline counts working days on.
// Cases are pinned by id (BL50-CAL-nn) so the build-gap table can name them.
// ─────────────────────────────────────────────────────────────────────────────

const ANON = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const ruling = (date: string, kind: CalendarDayRuling['kind'], setAt = '2026-08-31T02:00:00.000Z'): CalendarDayRuling => ({
  date,
  kind,
  reason: 'Plant shutdown for maintenance',
  setBy: ANON,
  setAt,
});

beforeEach(() => workingCalendarStore.reset());

describe('BL-50 · the pure ruling application (lib)', () => {
  it('BL50-CAL-01 · no rulings → the base calendar, untouched', () => {
    expect(withDayRulings(DEFAULT_WORKING_CALENDAR, [])).toBe(DEFAULT_WORKING_CALENDAR);
  });

  it('BL50-CAL-02 · a non-working ruling on a weekday makes it a holiday', () => {
    const cal = withDayRulings(DEFAULT_WORKING_CALENDAR, [{ date: '2026-09-02', kind: 'non-working' }]);
    expect(isWorkingDay('2026-09-02', DEFAULT_WORKING_CALENDAR)).toBe(true); // control: SAP says working
    expect(isWorkingDay('2026-09-02', cal)).toBe(false);
  });

  it('BL50-CAL-03 · a working ruling on a listed holiday makes it a working day', () => {
    const cal = withDayRulings(DEFAULT_WORKING_CALENDAR, [{ date: '2026-08-17', kind: 'working' }]);
    expect(isWorkingDay('2026-08-17', DEFAULT_WORKING_CALENDAR)).toBe(false); // control: Independence Day
    expect(isWorkingDay('2026-08-17', cal)).toBe(true);
  });

  it('BL50-CAL-04 · a working ruling on a Saturday makes it a make-up working day', () => {
    const cal = withDayRulings(DEFAULT_WORKING_CALENDAR, [{ date: '2026-09-05', kind: 'working' }]);
    expect(isWorkingDay('2026-09-05', DEFAULT_WORKING_CALENDAR)).toBe(false); // control: a Saturday
    expect(isWorkingDay('2026-09-05', cal)).toBe(true);
    expect(isWorkingDay('2026-09-06', cal)).toBe(false); // the Sunday beside it is untouched
  });

  it('BL50-CAL-05 · the latest ruling for a date decides it', () => {
    const cal = withDayRulings(DEFAULT_WORKING_CALENDAR, [
      { date: '2026-09-02', kind: 'non-working' },
      { date: '2026-09-02', kind: 'working' },
    ]);
    expect(isWorkingDay('2026-09-02', cal)).toBe(true);
  });
});

describe('BL-50 · the calendar in force (store)', () => {
  it('BL50-CAL-06 · with no rulings the hub calendar is the SAP load', () => {
    const cal = hubWorkingCalendar();
    for (const date of SAP_FACTORY_CALENDAR.nonWorkingDates) expect(isWorkingDay(date, cal), date).toBe(false);
    expect(isWorkingDay('2026-09-01', cal)).toBe(true);
  });

  it('BL50-CAL-07 · A HOLIDAY ADDED BY THE ADMINISTRATOR MOVES A DEADLINE', () => {
    // Monday 31 August 2026, 10:00 WIB. One working day later is Tuesday 10:00.
    const published = '2026-08-31T03:00:00.000Z';
    expect(addWorkingDays(published, 1, hubWorkingCalendar()).toISOString()).toBe('2026-09-01T03:00:00.000Z');
    workingCalendarStore.append(ruling('2026-09-01', 'non-working'));
    // Tuesday is now a holiday, so the deadline moves to Wednesday 10:00.
    expect(addWorkingDays(published, 1, hubWorkingCalendar()).toISOString()).toBe('2026-09-02T03:00:00.000Z');
  });

  it('BL50-CAL-08 · removing a day (ruling it working) moves a deadline earlier', () => {
    // Friday 14 August 17:00+ → next working hour skips the weekend and Monday
    // 17 August (Independence Day) to Tuesday 18 August 08:00.
    const friEvening = '2026-08-14T11:00:00.000Z';
    expect(addWorkingDays(friEvening, 0, hubWorkingCalendar()).toISOString()).toBe('2026-08-18T01:00:00.000Z');
    workingCalendarStore.append(ruling('2026-08-17', 'working'));
    expect(addWorkingDays(friEvening, 0, hubWorkingCalendar()).toISOString()).toBe('2026-08-17T01:00:00.000Z');
  });

  it('BL50-CAL-09 · a ruling survives a reload (persisted in this browser)', () => {
    workingCalendarStore.append(ruling('2026-09-02', 'non-working'));
    workingCalendarStore.rehydrate();
    expect(isWorkingDay('2026-09-02', hubWorkingCalendar())).toBe(false);
    expect(workingCalendarStore.rulings().map((r) => r.date)).toContain('2026-09-02');
  });

  it('BL50-CAL-10 · an unparseable store reads as UNREADABLE, never as "no rulings"', () => {
    window.localStorage.setItem(WORKING_CALENDAR_KEY, '{not json');
    workingCalendarStore.rehydrate();
    expect(workingCalendarStore.readState().unreadable).toBe(true);
  });

  it('BL50-CAL-11 · a hand-edited row the verb would refuse is refused on read, with its reason', () => {
    window.localStorage.setItem(
      WORKING_CALENDAR_KEY,
      JSON.stringify({
        v: 1,
        rulings: [
          { ...ruling('2026-09-02', 'non-working') },
          { ...ruling('2027-01-04', 'non-working') }, // outside the SAP load
          { ...ruling('2026-09-03', 'non-working'), reason: '  ' }, // no reason
        ],
      }),
    );
    workingCalendarStore.rehydrate();
    const state = workingCalendarStore.readState();
    expect(state.unreadable).toBe(false);
    expect(state.rulings.map((r) => r.date)).toEqual(['2026-09-02']);
    expect(state.rejected.map((r) => r.row)).toEqual(['2027-01-04', '2026-09-03']);
    expect(state.rejected[0].reason).toMatch(/outside the calendar loaded from SAP/);
  });

  it('BL50-CAL-12 · the verb\'s refusals, both ways (known-good passes, each bad input names itself)', () => {
    expect(calendarRulingRefusal('2026-09-02', 'non-working', 'Plant shutdown')).toBeNull();
    expect(calendarRulingRefusal('2026-02-30', 'non-working', 'Plant shutdown')).toMatch(/not a date/);
    expect(calendarRulingRefusal('2027-01-04', 'non-working', 'Plant shutdown')).toMatch(/outside/);
    expect(calendarRulingRefusal('2026-09-02', 'holiday', 'Plant shutdown')).toMatch(/kind/);
    expect(calendarRulingRefusal('2026-09-02', 'working', ' ')).toMatch(/reason/);
  });

  it('BL50-CAL-13 · coverage is the year the SAP load carries', () => {
    expect(calendarCovers(SAP_FACTORY_CALENDAR.coversFrom)).toBe(true);
    expect(calendarCovers(SAP_FACTORY_CALENDAR.coversTo)).toBe(true);
    expect(calendarCovers('2025-12-31')).toBe(false);
    expect(calendarCovers('2027-01-01')).toBe(false);
  });

  it('BL50-CAL-14 · the page list names where each day came from, and shows an override as one', () => {
    workingCalendarStore.append(ruling('2026-09-02', 'non-working'));
    const days = listedCalendarDays();
    const sap = days.find((d) => d.date === '2026-08-17');
    const ruled = days.find((d) => d.date === '2026-09-02');
    expect(sap).toMatchObject({ source: 'sap', working: false, sapWorking: false, ruling: null });
    expect(ruled).toMatchObject({ source: 'administrator', working: false, sapWorking: true });
    expect(ruled?.ruling?.reason).toBe('Plant shutdown for maintenance');
    // An ordinary working day is not listed.
    expect(days.find((d) => d.date === '2026-09-01')).toBeUndefined();
    expect(calendarDay('2026-09-01')).toMatchObject({ working: true, source: 'sap', weekday: 2 });
  });

  it('BL50-CAL-15 · the SAP base is DEFAULT plus the load, and is not mutated by a ruling', () => {
    workingCalendarStore.append(ruling('2026-09-02', 'non-working'));
    hubWorkingCalendar();
    expect(isWorkingDay('2026-09-02', SAP_BASE_CALENDAR)).toBe(true);
  });

  it('BL50-CAL-16 · subscribers hear a ruling, and the version moves', () => {
    let heard = 0;
    const off = workingCalendarStore.subscribe(() => (heard += 1));
    const before = workingCalendarStore.version();
    workingCalendarStore.append(ruling('2026-09-02', 'non-working'));
    off();
    expect(heard).toBe(1);
    expect(workingCalendarStore.version()).toBeGreaterThan(before);
  });
});
