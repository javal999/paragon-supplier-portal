import { describe, it, expect, beforeEach } from 'vitest';
/** @import { ForecastCommitmentLine } from '../data/types' */
/** @import { RequirementResponse } from '../sdc/types' */
import { materialEntry } from '../sdc/materialMaster';
import { DEFAULT_WORKING_CALENDAR } from '@lib/workingCalendar';
import {
  buildCommitmentLines,
  buildVersion,
  commitmentDueAt,
  commitmentTiming,
  deadlineState
} from './forecastRules';
import { POStatus } from '../data/types';
import { isEscalated, responseDeadline } from '../data/poResponseProjection';
import { confirmationDeadline, isCallOffEscalated } from './callOffRules';
import { workingCalendarStore } from './workingCalendarStore';
import { FORECAST_VERSION_SEED } from '../data/mock/fixtures/forecastHub';
import { sdcClock } from '../sdc';

// ─────────────────────────────────────────────────────────────────────────────
// BL-48 · CR-26 — THE FORECAST COMMITMENT DEADLINE.
//   Firm periods: 1 working day after publication.
//   Trade-off and Forecast periods: 3 working days after publication.
// Counted on the hub's working calendar (BL-50). Late is DERIVED at read.
// Cases are pinned by id (BL48-…) so the build-gap table can name them.
// ─────────────────────────────────────────────────────────────────────────────

const ANON = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
const FRI_21_AUG_09_WIB = '2026-08-21T02:00:00.000Z';
const FRI_28_AUG_09_WIB = '2026-08-28T02:00:00.000Z';
const MON_31_AUG_10_WIB = '2026-08-31T03:00:00.000Z';

beforeEach(() => workingCalendarStore.reset());

// The RULE cases are pinned on the public-holiday base calendar, stated, so the
// arithmetic of CR-26 is tested apart from the demo's plant shutdown and its
// seeded ruling. The DEMO cases below run on the calendar in force.
const BASE = DEFAULT_WORKING_CALENDAR;

describe('BL-48 · CR-26 — the deadline rule on a working calendar', () => {
  it('BL48-RULE-01 · Firm: 1 working day (Friday 09:00 → Monday 09:00)', () => {
    expect(commitmentDueAt('firm', FRI_28_AUG_09_WIB, BASE)).toBe('2026-08-31T02:00:00.000Z');
  });

  it('BL48-RULE-02 · Trade-off and Forecast: 3 working days spanning a weekend (Friday → Wednesday)', () => {
    expect(commitmentDueAt('tradeOff', FRI_28_AUG_09_WIB, BASE)).toBe('2026-09-02T02:00:00.000Z');
    expect(commitmentDueAt('forecast', FRI_28_AUG_09_WIB, BASE)).toBe('2026-09-02T02:00:00.000Z');
  });

  it('BL48-RULE-03 · a weekend AND a national holiday: the calendar visibly changes the date', () => {
    // Friday 21 August 09:00 WIB. Saturday, Sunday off; Monday 24 counts;
    // Tuesday 25 August is a national holiday; Wednesday 26 and Thursday 27
    // count → Thursday 27 August 09:00.
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB, BASE)).toBe('2026-08-27T02:00:00.000Z');
    // Controls — the answers the calendar is NOT giving: 3 calendar days would
    // be Monday 24; the retired 7-calendar-day rule would be Friday 28.
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB, BASE)).not.toBe(
      '2026-08-24T02:00:00.000Z'
    );
    expect(commitmentDueAt('tradeOff', FRI_21_AUG_09_WIB, BASE)).not.toBe(
      '2026-08-28T02:00:00.000Z'
    );
  });

  it('BL48-HOLIDAY-01 · A HOLIDAY ADDED BY THE ADMINISTRATOR MOVES THE TRADE-OFF DEADLINE (calendar in force)', () => {
    // Monday 7 September 10:00 WIB → Tuesday, Wednesday, Thursday → Thursday 10 Sep.
    const monday = '2026-09-07T03:00:00.000Z';
    expect(commitmentDueAt('tradeOff', monday)).toBe('2026-09-10T03:00:00.000Z');
    workingCalendarStore.append({
      date: '2026-09-09',
      kind: 'non-working',
      reason: 'Collective leave',
      setBy: ANON,
      setAt: '2026-09-01T01:00:00.000Z'
    });
    // Wednesday is now off → Tuesday, Thursday, Friday → Friday 11 Sep.
    expect(commitmentDueAt('tradeOff', monday)).toBe('2026-09-11T03:00:00.000Z');
    // The Firm deadline (Tuesday) is untouched: the ruling is outside its window.
    expect(commitmentDueAt('firm', monday)).toBe('2026-09-08T03:00:00.000Z');
  });

  it('BL48-BOUND-PUB · published at the last working minute vs just after working hours', () => {
    // Monday 16:59 WIB is inside working hours → Tuesday 16:59.
    expect(commitmentDueAt('firm', '2026-08-31T09:59:00.000Z', BASE)).toBe(
      '2026-09-01T09:59:00.000Z'
    );
    // Monday 17:00 WIB is past it → next working hour Tuesday 08:00 → Wednesday 08:00.
    expect(commitmentDueAt('firm', '2026-08-31T10:00:00.000Z', BASE)).toBe(
      '2026-09-02T01:00:00.000Z'
    );
  });
});

// ─── THE DEMO DATA — on the calendar in force, at the declared present ───────
//
// Present: Monday 31 August 2026, 19:00 WIB. Packaging v2 was published Friday
// 28 August 09:00 WIB; raw-material v2 this morning, Monday 10:00 WIB. The SAP
// load carries a plant shutdown on Wednesday 2 September; the administrator
// ruled Friday 4 September non-working (`SEEDED_CALENDAR_RULINGS`).
describe('BL-48 · the demo deadlines (fixture × hub calendar)', () => {
  /** @param {'packaging' | 'rawMaterial'} stream */
  const current = (stream) =>
    FORECAST_VERSION_SEED.filter((v) => v.stream === stream).sort(
      (a, b) => (b.version ?? 0) - (a.version ?? 0)
    )[0];
  const PK = current('packaging');
  const RM = current('rawMaterial');

  it('BL48-DEMO-01 · a Firm period due TOMORROW (raw material, Tuesday 1 September 10:00 WIB)', () => {
    expect(RM.publishedAt).toBe(MON_31_AUG_10_WIB);
    expect(commitmentDueAt('firm', RM.publishedAt)).toBe('2026-09-01T03:00:00.000Z');
    expect(sdcClock.now().slice(0, 10)).toBe('2026-08-31');
  });

  it('BL48-DEMO-02 · a Firm period already LATE (packaging, due Monday 09:00, now 19:00)', () => {
    const due = commitmentDueAt('firm', PK.publishedAt);
    expect(due).toBe('2026-08-31T02:00:00.000Z');
    expect(
      commitmentTiming(
        { state: 'awaiting', dueAt: due, response: null, responseDueAt: null },
        sdcClock.now()
      )
    ).toEqual({
      kind: 'late',
      msLate: 10 * 3_600_000
    });
  });

  it('BL48-DEMO-03 · 3 working days over a weekend AND the SAP plant shutdown (packaging Trade-off → Thursday 3 Sep)', () => {
    expect(commitmentDueAt('tradeOff', PK.publishedAt)).toBe('2026-09-03T02:00:00.000Z');
    // Control: on the base calendar (no plant shutdown) it is Wednesday 2 Sep.
    expect(commitmentDueAt('tradeOff', PK.publishedAt, BASE)).toBe('2026-09-02T02:00:00.000Z');
  });

  it('BL48-DEMO-04 · the ADMINISTRATOR OVERRIDE moves a deadline (raw-material Trade-off: Friday 4 → Monday 7 Sep)', () => {
    expect(commitmentDueAt('tradeOff', RM.publishedAt)).toBe('2026-09-07T03:00:00.000Z');
    // Reverse the override (rule Friday working again) and the deadline returns.
    workingCalendarStore.append({
      date: '2026-09-04',
      kind: 'working',
      reason: 'Collective leave withdrawn',
      setBy: ANON,
      setAt: '2026-09-01T00:00:00.000Z'
    });
    expect(commitmentDueAt('tradeOff', RM.publishedAt)).toBe('2026-09-04T03:00:00.000Z');
  });
});

describe('BL-48 · time left and late — derived at read, never stored', () => {
  const DUE = '2026-08-31T02:00:00.000Z';
  const awaiting = {
    state: /** @type {const} */ ('awaiting'),
    dueAt: DUE,
    response: null,
    responseDueAt: null
  };
  /**
   * @param {string} iso
   * @param {number} delta
   */
  const ms = (iso, delta) => new Date(Date.parse(iso) + delta).toISOString();

  it('BL81-LATE-01 · awaiting: the deadline instant is still open; late strictly after it', () => {
    // BL-81 / DL-1 (owner, 2026-11-02) — late ONLY after the deadline, the PO
    // and call-off convention. BL48-BOUND-01 pinned the retired reading (at the
    // deadline instant → late, msLate 0); the instant before is unchanged.
    expect(commitmentTiming(awaiting, ms(DUE, -1))).toEqual({ kind: 'open', msLeft: 1 });
    expect(commitmentTiming(awaiting, DUE)).toEqual({ kind: 'open', msLeft: 0 });
    expect(commitmentTiming(awaiting, ms(DUE, 1))).toEqual({ kind: 'late', msLate: 1 });
  });

  it('BL48-LEFT-01 · time left is the distance to the deadline instant', () => {
    expect(commitmentTiming(awaiting, '2026-08-30T02:00:00.000Z')).toEqual({
      kind: 'open',
      msLeft: 86_400_000
    });
  });

  /**
   * @param {string} at
   * @returns {Pick<ForecastCommitmentLine, 'state' | 'dueAt' | 'response' | 'responseDueAt'>}
   */
  const submittedAt = (at) => ({
    state: 'accepted',
    dueAt: DUE,
    responseDueAt: DUE,
    response: /** @type {RequirementResponse} */ ({ submittedAt: at })
  });

  it('BL81-LATE-02 · submitted AT the deadline is on time; one millisecond after is late', () => {
    // BL-81 / DL-1 — the retired reading pinned `at due → submittedLate, 0`
    // (BL48-BOUND-02). The instant before is unchanged.
    expect(commitmentTiming(submittedAt(ms(DUE, -1)), '2026-09-10T00:00:00.000Z')).toEqual({
      kind: 'submittedOnTime'
    });
    expect(commitmentTiming(submittedAt(DUE), '2026-09-10T00:00:00.000Z')).toEqual({
      kind: 'submittedOnTime'
    });
    expect(commitmentTiming(submittedAt(ms(DUE, 1)), '2026-09-10T00:00:00.000Z')).toEqual({
      kind: 'submittedLate',
      msLate: 1
    });
  });

  it('BL48-LATE-01 · a submitted commitment is judged by when it arrived, not by the clock now', () => {
    const onTime = submittedAt(ms(DUE, -3_600_000));
    expect(commitmentTiming(onTime, ms(DUE, 99 * 86_400_000))).toEqual({ kind: 'submittedOnTime' });
  });
});

describe('BL-81 · DL-1 — one late convention across the three response families', () => {
  // The owner ruling of 2026-11-02 (DL-1, BL-69): late only AFTER the deadline,
  // for forecast commitments, PO responses and call-off responses. The PO and
  // call-off readers already asked `deadline < now`; the forecast reader used
  // `now >= deadline` and is the member this batch changes. This case fires
  // every FORECAST reader at the same instant the other two are read at, so the
  // three cannot drift apart without a red test.
  const RELEASED = '2026-09-07T02:00:00.000Z'; // Monday 09:00 WIB
  const DEADLINE = '2026-09-08T02:00:00.000Z'; // 1 working day later, Tuesday 09:00 WIB
  /** @param {number} delta */
  const at = (delta) => new Date(Date.parse(DEADLINE) + delta).toISOString();
  /** @type {import('../data/types').PurchaseOrder} */
  const po = /** @type {import('../data/types').PurchaseOrder} */ ({
    status: POStatus.SENT,
    orderDate: RELEASED,
    responseRequestedAt: RELEASED
  });
  /** @type {import('../data/types').CallOff} */
  const callOff = /** @type {import('../data/types').CallOff} */ ({
    status: 'Awaiting Confirmation',
    releasedAt: RELEASED
  });
  const awaiting = {
    state: /** @type {const} */ ('awaiting'),
    dueAt: DEADLINE,
    reminderAt: '2026-09-07T12:00:00.000Z',
    response: null,
    responseDueAt: null
  };

  it('all three deadlines are the same instant, and all three are on time AT it', () => {
    expect(commitmentDueAt('firm', RELEASED)).toBe(DEADLINE);
    expect(responseDeadline(po).toISOString()).toBe(DEADLINE);
    expect(confirmationDeadline(callOff)?.toISOString()).toBe(DEADLINE);
    // AT the deadline: no family is late yet.
    expect(commitmentTiming(awaiting, DEADLINE)).toEqual({ kind: 'open', msLeft: 0 });
    expect(deadlineState(awaiting, DEADLINE)).not.toBe('overdue');
    expect(isEscalated(po, DEADLINE)).toBe(false);
    expect(isCallOffEscalated(callOff, DEADLINE)).toBe(false);
  });

  it('one millisecond later, all three are late', () => {
    expect(commitmentTiming(awaiting, at(1))).toEqual({ kind: 'late', msLate: 1 });
    expect(deadlineState(awaiting, at(1))).toBe('overdue');
    expect(isEscalated(po, at(1))).toBe(true);
    expect(isCallOffEscalated(callOff, at(1))).toBe(true);
  });
});

describe('BL-48 · a carried-forward commitment keeps the verdict of the version it answered', () => {
  const src = [{ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 1 }];
  const v1 = buildVersion({
    stream: 'packaging',
    version: 1,
    publishedAt: FRI_21_AUG_09_WIB,
    sources: src,
    master: materialEntry,
    demand: () => 49000
  });
  const v2 = buildVersion({
    stream: 'packaging',
    version: 2,
    publishedAt: FRI_28_AUG_09_WIB,
    sources: src,
    master: materialEntry,
    demand: () => 49000
  });
  /**
   * @param {string} submitted
   * @returns {RequirementResponse}
   */
  const answer = (submitted) => ({
    id: 'r-v1',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8801',
    periodBucket: '2026-08-31',
    publicationId: v1.publicationId,
    planVersion: v1.planVersion,
    submissionVersion: 1,
    status: 'Submitted',
    submittedAt: submitted,
    forecastConfirmation: { confirmedQty: 49000, uom: 'PCS', committedDate: '2026-08-31' },
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' }
  });
  /** @param {RequirementResponse} r */
  const line = (r) =>
    /** @type {ForecastCommitmentLine} */ (
      buildCommitmentLines({
        publications: [v2, v1],
        responses: [r],
        master: materialEntry,
        supplierName: (s) => s
      }).find((l) => l.periodBucket === '2026-08-31')
    );

  it("BL48-LATE-02 · answered v1 AFTER v1's Firm deadline (Mon 24 Aug 09:00) → submitted late, though v2's is later", () => {
    const l = line(answer('2026-08-25T03:00:00.000Z'));
    expect(l.carriedForward).toBe(true);
    expect(l.responseDueAt).toBe('2026-08-24T02:00:00.000Z');
    expect(l.dueAt).toBe('2026-08-31T02:00:00.000Z'); // v2's own Firm deadline
    expect(commitmentTiming(l, '2026-08-31T12:00:00.000Z')).toEqual({
      kind: 'submittedLate',
      msLate: 25 * 3_600_000
    });
  });

  it('BL48-LATE-03 · answered v1 before its deadline → on time (the control)', () => {
    const l = line(answer('2026-08-22T03:00:00.000Z'));
    expect(commitmentTiming(l, '2026-08-31T12:00:00.000Z')).toEqual({ kind: 'submittedOnTime' });
  });
});
