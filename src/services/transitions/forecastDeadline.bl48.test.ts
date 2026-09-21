import { describe, it, expect, beforeEach } from 'vitest';
import type { ForecastCommitmentLine } from '../data/types';
import type { RequirementResponse } from '../sdc/types';
import { materialEntry } from '../sdc/materialMaster';
import { buildCommitmentLines, buildVersion, commitmentDueAt, commitmentTiming } from './forecastRules';
import { workingCalendarStore } from './workingCalendarStore';

// ─────────────────────────────────────────────────────────────────────────────
// BL-48 · CR-26 — THE FORECAST COMMITMENT DEADLINE.
//   Firm periods: 1 working day after publication.
//   Trade-off and Forecast periods: 3 working days after publication.
// Counted on the hub's working calendar (BL-50). Late is DERIVED at read.
// Cases are pinned by id (BL48-…) so the build-gap table can name them.
// ─────────────────────────────────────────────────────────────────────────────

const ANON = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;
const FRI_21_AUG_09_WIB = '2026-08-21T02:00:00.000Z';
const FRI_28_AUG_09_WIB = '2026-08-28T02:00:00.000Z';
const MON_31_AUG_10_WIB = '2026-08-31T03:00:00.000Z';

beforeEach(() => workingCalendarStore.reset());

describe('BL-48 · CR-26 — the deadline rule on the working calendar', () => {
  it('BL48-RULE-01 · Firm: 1 working day (Friday 09:00 → Monday 09:00)', () => {
    expect(commitmentDueAt('firm', FRI_28_AUG_09_WIB)).toBe('2026-08-31T02:00:00.000Z');
  });

  it('BL48-RULE-02 · Trade-off and Forecast: 3 working days spanning a weekend (Friday → Wednesday)', () => {
    expect(commitmentDueAt('tradeOff', FRI_28_AUG_09_WIB)).toBe('2026-09-02T02:00:00.000Z');
    expect(commitmentDueAt('forecast', FRI_28_AUG_09_WIB)).toBe('2026-09-02T02:00:00.000Z');
  });

  it('BL48-RULE-03 · a weekend AND a holiday: the calendar visibly changes the date', () => {
    // Friday 21 August 09:00 WIB. Saturday, Sunday off; Monday 24 counts;
    // Tuesday 25 August is a national holiday in the SAP load; Wednesday 26 and
    // Thursday 27 count → Thursday 27 August 09:00.
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB)).toBe('2026-08-27T02:00:00.000Z');
    // Controls — the answers the calendar is NOT giving: 3 calendar days would
    // be Monday 24; the retired 7-calendar-day rule would be Friday 28.
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB)).not.toBe('2026-08-24T02:00:00.000Z');
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB)).not.toBe('2026-08-28T02:00:00.000Z');
  });

  it('BL48-HOLIDAY-01 · A HOLIDAY ADDED BY THE ADMINISTRATOR MOVES THE TRADE-OFF DEADLINE', () => {
    // Monday 31 August 10:00 WIB → Tuesday, Wednesday, Thursday → Thursday 3 Sep.
    expect(commitmentDueAt('tradeOff', MON_31_AUG_10_WIB)).toBe('2026-09-03T03:00:00.000Z');
    workingCalendarStore.append({
      date: '2026-09-02',
      kind: 'non-working',
      reason: 'Collective leave',
      setBy: ANON,
      setAt: '2026-08-31T01:00:00.000Z',
    });
    // Wednesday is now off → Tuesday, Thursday, Friday → Friday 4 Sep.
    expect(commitmentDueAt('tradeOff', MON_31_AUG_10_WIB)).toBe('2026-09-04T03:00:00.000Z');
    // The Firm deadline (Tuesday) is untouched: the ruling is outside its window.
    expect(commitmentDueAt('firm', MON_31_AUG_10_WIB)).toBe('2026-09-01T03:00:00.000Z');
  });

  it('BL48-BOUND-PUB · published at the last working minute vs just after working hours', () => {
    // Monday 16:59 WIB is inside working hours → Tuesday 16:59.
    expect(commitmentDueAt('firm', '2026-08-31T09:59:00.000Z')).toBe('2026-09-01T09:59:00.000Z');
    // Monday 17:00 WIB is past it → next working hour Tuesday 08:00 → Wednesday 08:00.
    expect(commitmentDueAt('firm', '2026-08-31T10:00:00.000Z')).toBe('2026-09-02T01:00:00.000Z');
  });
});

describe('BL-48 · time left and late — derived at read, never stored', () => {
  const DUE = '2026-08-31T02:00:00.000Z';
  const awaiting = { state: 'awaiting' as const, dueAt: DUE, response: null, responseDueAt: null };
  const ms = (iso: string, delta: number) => new Date(Date.parse(iso) + delta).toISOString();

  it('BL48-BOUND-01 · awaiting: the last on-time moment is open; the deadline instant and after are late', () => {
    expect(commitmentTiming(awaiting, ms(DUE, -1))).toEqual({ kind: 'open', msLeft: 1 });
    expect(commitmentTiming(awaiting, DUE)).toEqual({ kind: 'late', msLate: 0 });
    expect(commitmentTiming(awaiting, ms(DUE, 1))).toEqual({ kind: 'late', msLate: 1 });
  });

  it('BL48-LEFT-01 · time left is the distance to the deadline instant', () => {
    expect(commitmentTiming(awaiting, '2026-08-30T02:00:00.000Z')).toEqual({ kind: 'open', msLeft: 86_400_000 });
  });

  const submittedAt = (at: string): Pick<ForecastCommitmentLine, 'state' | 'dueAt' | 'response' | 'responseDueAt'> => ({
    state: 'accepted',
    dueAt: DUE,
    responseDueAt: DUE,
    response: { submittedAt: at } as RequirementResponse,
  });

  it('BL48-BOUND-02 · submitted one millisecond before the deadline is on time; at it, late', () => {
    expect(commitmentTiming(submittedAt(ms(DUE, -1)), '2026-09-10T00:00:00.000Z')).toEqual({ kind: 'submittedOnTime' });
    expect(commitmentTiming(submittedAt(DUE), '2026-09-10T00:00:00.000Z')).toEqual({ kind: 'submittedLate', msLate: 0 });
  });

  it('BL48-LATE-01 · a submitted commitment is judged by when it arrived, not by the clock now', () => {
    const onTime = submittedAt(ms(DUE, -3_600_000));
    expect(commitmentTiming(onTime, ms(DUE, 99 * 86_400_000))).toEqual({ kind: 'submittedOnTime' });
  });
});

describe('BL-48 · a carried-forward commitment keeps the verdict of the version it answered', () => {
  const src = [{ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 1 }];
  const v1 = buildVersion({ stream: 'packaging', version: 1, publishedAt: FRI_21_AUG_09_WIB, sources: src, master: materialEntry, demand: () => 49000 });
  const v2 = buildVersion({ stream: 'packaging', version: 2, publishedAt: FRI_28_AUG_09_WIB, sources: src, master: materialEntry, demand: () => 49000 });
  const answer = (submitted: string): RequirementResponse => ({
    id: 'r-v1',
    supplierId: 'sup-007', materialCode: 'PK-PETB-8801', periodBucket: '2026-08-31',
    publicationId: v1.publicationId, planVersion: v1.planVersion, submissionVersion: 1,
    status: 'Submitted', submittedAt: submitted,
    forecastConfirmation: { confirmedQty: 49000, uom: 'PCS', committedDate: '2026-08-31' },
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
  });
  const line = (r: RequirementResponse) =>
    buildCommitmentLines({ publications: [v2, v1], responses: [r], master: materialEntry, supplierName: (s) => s })
      .find((l) => l.periodBucket === '2026-08-31')!;

  it('BL48-LATE-02 · answered v1 AFTER v1\'s Firm deadline (Mon 24 Aug 09:00) → submitted late, though v2\'s is later', () => {
    const l = line(answer('2026-08-25T03:00:00.000Z'));
    expect(l.carriedForward).toBe(true);
    expect(l.responseDueAt).toBe('2026-08-24T02:00:00.000Z');
    expect(l.dueAt).toBe('2026-08-31T02:00:00.000Z'); // v2's own Firm deadline
    expect(commitmentTiming(l, '2026-08-31T12:00:00.000Z')).toEqual({ kind: 'submittedLate', msLate: 25 * 3_600_000 });
  });

  it('BL48-LATE-03 · answered v1 before its deadline → on time (the control)', () => {
    const l = line(answer('2026-08-22T03:00:00.000Z'));
    expect(commitmentTiming(l, '2026-08-31T12:00:00.000Z')).toEqual({ kind: 'submittedOnTime' });
  });
});
