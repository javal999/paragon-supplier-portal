import { describe, it, expect, beforeEach } from 'vitest';
import { responseDeadline, isEscalated } from '../data/poResponseProjection';
import type { PurchaseOrder } from '../data/types';
import { confirmationDeadline, isCallOffEscalated } from './callOffRules';
import type { CallOff } from '../data/types';
import { commitmentDueAt } from './forecastRules';
import { workingCalendarStore } from './workingCalendarStore';

// ─────────────────────────────────────────────────────────────────────────────
// BL-50 · A HOLIDAY ADDED BY THE ADMINISTRATOR MOVES EVERY WORKING-DAY DEADLINE.
//
// One test per wired deadline (the derived population in
// `hubCalendarReaders.guard.test.ts`), each with its own control: the deadline
// before the ruling, then after it. A deadline module that still read the
// frozen base calendar would pass the "before" and fail the "after".
// Tuesday 8 September 2026 is an ordinary working day in the SAP load.
// ─────────────────────────────────────────────────────────────────────────────

const ANON = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;
const HOLIDAY = '2026-09-08';
const MONDAY_10_WIB = '2026-09-07T03:00:00.000Z';

const addHoliday = () =>
  workingCalendarStore.append({
    date: HOLIDAY,
    kind: 'non-working',
    reason: 'Collective leave announced after the SAP load',
    setBy: ANON,
    setAt: '2026-09-01T02:00:00.000Z',
  });

beforeEach(() => workingCalendarStore.reset());

describe('BL-50 · every wired deadline reads the hub calendar', () => {
  it('BL50-WIRE-PO · the PO response deadline (REQ-E07-02) moves with a ruled holiday', () => {
    const po = { status: 'Sent', responseRequestedAt: MONDAY_10_WIB, orderDate: '2026-09-07' } as unknown as PurchaseOrder;
    expect(responseDeadline(po).toISOString()).toBe('2026-09-08T03:00:00.000Z');
    addHoliday();
    expect(responseDeadline(po).toISOString()).toBe('2026-09-09T03:00:00.000Z');
    // And the derived Escalated follows it: at Tuesday noon WIB the PO is no
    // longer late, because Tuesday is no longer a working day.
    expect(isEscalated(po, '2026-09-08T05:00:00.000Z')).toBe(false);
  });

  it('BL50-WIRE-CALLOFF · the call-off confirmation deadline (REQ-E09-03) moves with a ruled holiday', () => {
    const c = { status: 'Awaiting Confirmation', releasedAt: MONDAY_10_WIB } as unknown as CallOff;
    expect(confirmationDeadline(c)?.toISOString()).toBe('2026-09-08T03:00:00.000Z');
    expect(isCallOffEscalated(c, '2026-09-08T05:00:00.000Z')).toBe(true); // control: late before the ruling
    addHoliday();
    expect(confirmationDeadline(c)?.toISOString()).toBe('2026-09-09T03:00:00.000Z');
    expect(isCallOffEscalated(c, '2026-09-08T05:00:00.000Z')).toBe(false);
  });

  it('BL50-WIRE-FIRM · the Firm commitment deadline (CR-26) moves with a ruled holiday', () => {
    expect(commitmentDueAt('firm', MONDAY_10_WIB)).toBe('2026-09-08T03:00:00.000Z');
    addHoliday();
    expect(commitmentDueAt('firm', MONDAY_10_WIB)).toBe('2026-09-09T03:00:00.000Z');
  });

  it('BL50-WIRE-REMOVE · removing a SAP holiday moves a deadline EARLIER (the other direction)', () => {
    // Friday 14 August 10:00 WIB. Monday 17 August is Independence Day, so one
    // working day later is Tuesday 18 August.
    const fri = '2026-08-14T03:00:00.000Z';
    expect(commitmentDueAt('firm', fri)).toBe('2026-08-18T03:00:00.000Z');
    workingCalendarStore.append({ date: '2026-08-17', kind: 'working', reason: 'Plant runs on the holiday', setBy: ANON, setAt: '2026-08-01T00:00:00.000Z' });
    expect(commitmentDueAt('firm', fri)).toBe('2026-08-17T03:00:00.000Z');
  });
});
