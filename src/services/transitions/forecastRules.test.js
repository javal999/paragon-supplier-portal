// ────────────────────────────────────────────────────────────────────────────
// Forecast collaboration rules (REQ-E06-01 to REQ-E06-03), pure: the period
// grid, zones, CR-21 tolerance (with the exact 10% boundary), the below-forecast
// reason rule, the split deadline and its reminder, re-publication carry-
// forward, CR-22 gap colours (0.8 and 1.0 boundaries), exception ranking, the
// demand move, version changes, the spreadsheet check, and the alert rule.
// Every rule is probed with a known-good and a known-bad input.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { ForecastCommitmentLine } from '../data/types' */
/** @import { RequirementResponse } from '../sdc/types' */
import { materialEntry } from '../sdc/materialMaster';
import { bucketEndMs, coverageBands } from '../sdc/consolidation';
import { coverageThresholds } from './inventoryConfig';
import { hubSettingsStore } from './hubSettingsStore';
import { activeReasonCodes } from './reasonCodes';
import {
  commitmentTolerance,
  FORECAST_HORIZON,
  gapColourThresholds,
  zoneLengthsFor
} from './forecastConfig';
import {
  buildCommitmentLines,
  buildVersion,
  commitmentAlertSubjects,
  commitmentDueAt,
  commitmentGap,
  commitmentReminderAt,
  commitmentState,
  commitmentTemplateCsv,
  cumulativeCommitment,
  deadlineState,
  foresightAnswerOf,
  forecastCsv,
  gapColour,
  generatePeriods,
  moveDemandRefusal,
  moveShortfall,
  rankExceptions,
  reassignVersion,
  republishVersion,
  shortfallRefusal,
  toleranceOutcome,
  validateCommitmentRows,
  versionChanges,
  zoneFor
} from './forecastRules';
import { parseCsv } from './inventoryRules';
import { DEFAULT_WORKING_CALENDAR } from '@lib/workingCalendar';
import { deriveAlertConditions } from './inventoryAlertRules';
import { FORECAST_VERSION_SEED, SEEDED_PACKAGING_WEEKS } from '../data/mock/fixtures/forecastHub';

const DAY = 86_400_000;
/** @param {string} d */
const nextDay = (d) => new Date(Date.parse(`${d}T00:00:00.000Z`) + DAY).toISOString().slice(0, 10);

describe('PEX-2 (BL-265) — the period grid: 17 weeks, then months to month 12', () => {
  it('AC-01 — planning week W45 2026 shows W45 2026 to W8 2027 by week, then March to October 2027 by month', () => {
    expect(FORECAST_HORIZON.packaging).toEqual({ weeklyPeriods: 17, horizonMonths: 12 });
    // Monday 2 November 2026, 09:00 WIB — the Monday of ISO week 45.
    const periods = generatePeriods('packaging', '2026-11-02T02:00:00.000Z');
    const weeks = periods.filter((p) => p.kind === 'week');
    expect(weeks).toHaveLength(17);
    expect(weeks[0]).toEqual({
      id: '2026-11-02',
      kind: 'week',
      start: '2026-11-02',
      end: '2026-11-08'
    });
    // 2026 has 53 ISO weeks, so the 17th week is W8 2027 (22–28 February).
    expect(weeks[16]).toEqual({
      id: '2027-02-22',
      kind: 'week',
      start: '2027-02-22',
      end: '2027-02-28'
    });
    expect(periods.filter((p) => p.kind === 'month').map((p) => [p.id, p.start, p.end])).toEqual([
      ['2027-03', '2027-03-01', '2027-03-31'],
      ['2027-04', '2027-04-01', '2027-04-30'],
      ['2027-05', '2027-05-01', '2027-05-31'],
      ['2027-06', '2027-06-01', '2027-06-30'],
      ['2027-07', '2027-07-01', '2027-07-31'],
      ['2027-08', '2027-08-01', '2027-08-31'],
      ['2027-09', '2027-09-01', '2027-09-30'],
      ['2027-10', '2027-10-01', '2027-10-31']
    ]);
  });

  it('raw material takes the packaging grid: 17 weeks, then months to month 12 (BL-282, PEX-2 BR-04)', () => {
    expect(FORECAST_HORIZON.rawMaterial).toEqual({ weeklyPeriods: 17, horizonMonths: 12 });
    const periods = generatePeriods('rawMaterial', '2026-11-02T02:00:00.000Z');
    expect(periods.filter((p) => p.kind === 'week')).toHaveLength(17);
    expect([
      periods[0].id,
      periods[16].id,
      periods[17].id,
      periods[periods.length - 1]?.id
    ]).toEqual(['2026-11-02', '2027-02-22', '2027-03', '2027-10']);
    expect(periods).toEqual(generatePeriods('packaging', '2026-11-02T02:00:00.000Z'));
  });

  it('every day of the horizon belongs to exactly one period (no gap, no overlap)', () => {
    for (const [stream, at] of /** @type {const} */ ([
      ['packaging', '2026-08-21T02:00:00.000Z'],
      ['packaging', '2026-08-28T02:00:00.000Z'],
      ['rawMaterial', '2026-08-03T02:00:00.000Z'],
      ['rawMaterial', '2026-11-02T02:00:00.000Z']
    ])) {
      const periods = generatePeriods(stream, at);
      for (let i = 1; i < periods.length; i++)
        expect(periods[i].start).toBe(nextDay(periods[i - 1].end));
    }
  });

  it('BR-03 [Proposed] — the days after week 17 join the first full month', () => {
    // Published Friday 28 August 2026: week 1 is 31 August, week 17 ends 27 December.
    const periods = generatePeriods('packaging', '2026-08-28T02:00:00.000Z');
    expect(periods.filter((p) => p.kind === 'week').slice(-1)[0]?.end).toBe('2026-12-27');
    const months = periods.filter((p) => p.kind === 'month');
    expect(months[0]).toEqual({
      id: '2027-01',
      kind: 'month',
      start: '2026-12-28',
      end: '2027-01-31'
    });
    // Month 12 from the planning week's month (August 2026) is July 2027.
    expect(months[months.length - 1]).toEqual({
      id: '2027-07',
      kind: 'month',
      start: '2027-07-01',
      end: '2027-07-31'
    });
  });

  it('with no weekly periods the grid is months from the first of the month on or after publication', () => {
    expect(
      generatePeriods('rawMaterial', '2026-08-27T02:00:00.000Z', {
        weeklyPeriods: 0,
        horizonMonths: 6
      }).map((p) => p.id)
    ).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    // Published on the 1st: that month is the first period.
    expect(
      generatePeriods('rawMaterial', '2026-09-01T02:00:00.000Z', {
        weeklyPeriods: 0,
        horizonMonths: 6
      })[0].id
    ).toBe('2026-09');
  });

  it('the publication day is read in WIB, not UTC (Monday 17:30 UTC is Tuesday 00:30 in Jakarta)', () => {
    expect(generatePeriods('packaging', '2026-08-31T17:30:00.000Z')[0].id).toBe('2026-09-07');
    expect(generatePeriods('packaging', '2026-08-31T12:00:00.000Z')[0].id).toBe('2026-08-31');
  });

  it('horizon and cut-over are a setting', () => {
    expect(
      generatePeriods('packaging', '2026-08-28T02:00:00.000Z', {
        weeklyPeriods: 2,
        horizonMonths: 2
      }).map((p) => p.id)
    ).toEqual(['2026-08-31', '2026-09-07', '2026-09']);
  });

  it('a week bucket ends on its Sunday for the coverage read (the SDC bucket model accepts weeks)', () => {
    expect(bucketEndMs('2026-08-31')).toBe(Date.UTC(2026, 8, 6));
    expect(bucketEndMs('2026-08')).toBe(Date.UTC(2026, 7, 31));
  });
});

describe('REQ-E06-01 BR-04 / BR-05 — zones per supplier × material group', () => {
  it('Firm defaults to the supplier lead time for the group; Trade-off follows; Forecast after', () => {
    const lengths = zoneLengthsFor('sup-007', 'MG-20', 'VERP');
    expect(lengths).toEqual({ firmDays: 14, tradeOffDays: 42 });
    expect(zoneFor('2026-09-10', '2026-08-28', lengths)).toBe('firm'); // day 13
    expect(zoneFor('2026-09-11', '2026-08-28', lengths)).toBe('tradeOff'); // day 14
    expect(zoneFor('2026-10-22', '2026-08-28', lengths)).toBe('tradeOff'); // day 55
    expect(zoneFor('2026-10-23', '2026-08-28', lengths)).toBe('forecast'); // day 56
  });

  it('the lead time differs per supplier × group, with a default per material type', () => {
    expect(zoneLengthsFor('sup-002', 'MG-10', 'ROH').firmDays).toBe(45);
    expect(zoneLengthsFor('sup-012', 'MG-20', 'VERP').firmDays).toBe(21);
    expect(zoneLengthsFor('sup-999', 'MG-99', 'ROH')).toEqual({ firmDays: 30, tradeOffDays: 60 });
  });

  it('a built version carries each line’s zone as its commitment class, per supplier', () => {
    const v = buildVersion({
      stream: 'packaging',
      version: 1,
      publishedAt: '2026-08-28T02:00:00.000Z',
      sources: [
        { supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 0.5 },
        { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', share: 0.5 },
        // A raw material never lands in the packaging stream.
        { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300', share: 1 }
      ],
      master: materialEntry,
      demand: () => 1000
    });
    /**
     * @param {string} s
     * @param {string} p
     */
    const cls = (s, p) =>
      v.lines.find((l) => l.supplierId === s && l.periodBucket === p)?.commitmentClass;
    expect(cls('sup-007', '2026-09-14')).toBe('semi-firm'); // sup-007 lead time 14
    expect(cls('sup-012', '2026-09-14')).toBe('firm'); // sup-012 lead time 21
    expect(v.lines.some((l) => l.materialCode === 'RM-STEAR-7300')).toBe(false);
    expect(
      /** @type {import('../sdc/types').ForecastLine} */ (
        v.lines.find((l) => l.commitmentClass === 'firm')
      ).allocation.approvedBy
    ).toBe('planner');
  });
});

describe('REQ-E06-02 BR-04 — below forecast needs a starter reason (the verb calls this)', () => {
  it('known-good: at or above forecast needs nothing; below with a starter code passes', () => {
    // BL-32: the administrator's list in force; with nothing changed, the starter list.
    expect(activeReasonCodes('commitmentShortfall')).toEqual([
      'capacity',
      'material',
      'logistics',
      'quality',
      'force-majeure',
      'discontinued',
      'other'
    ]);
    expect(shortfallRefusal(1000, 1000, undefined)).toBeNull();
    expect(shortfallRefusal(1000, 1200, undefined)).toBeNull();
    expect(shortfallRefusal(1000, 800, { level1: 'material' })).toBeNull();
    expect(shortfallRefusal(1000, 0, { level1: 'other', note: 'Plant shutdown' })).toBeNull();
  });

  it('known-bad: no reason, an unknown code, or "other" without a note', () => {
    expect(shortfallRefusal(1000, 999, undefined)).toBe('reasonRequired');
    expect(shortfallRefusal(1000, 999, { level1: 'weather' })).toBe('reasonRequired');
    expect(shortfallRefusal(1000, 999, { level1: 'other' })).toBe('noteRequired');
    expect(shortfallRefusal(1000, 999, { level1: 'other', note: '   ' })).toBe('noteRequired');
  });
});

describe('CR-21 — tolerance per zone', () => {
  it('Firm: any shortfall is an exception', () => {
    expect(commitmentTolerance().firmShortfall).toBe(0);
    expect(toleranceOutcome('firm', 1000, 1000)).toBe('within');
    expect(toleranceOutcome('firm', 1000, 999)).toBe('outside');
  });

  // PEX-D22 (owner, 2026-11-05) flipped this case: it pinned "up to 10% below
  // is accepted" in Trade-off. A Trade-off period is Zone Capacity, which is
  // acknowledgement only, so no quantity is checked and the 10% setting is gone.
  it('Trade-off (Zone Capacity, PEX-D22): acknowledgement only, at any quantity; no Zone Capacity tolerance is held', () => {
    expect(Object.keys(commitmentTolerance())).toEqual(['firmShortfall']);
    expect(toleranceOutcome('tradeOff', 1000, 1000)).toBe('acknowledgementOnly');
    expect(toleranceOutcome('tradeOff', 1000, 900)).toBe('acknowledgementOnly');
    expect(toleranceOutcome('tradeOff', 1000, 0)).toBe('acknowledgementOnly');
    // Known-good beside it: the same quantities in a Zone Liability period are checked.
    expect(toleranceOutcome('firm', 1000, 1000)).toBe('within');
    expect(toleranceOutcome('firm', 1000, 900)).toBe('outside');
  });

  it('Forecast: acknowledgement only', () => {
    expect(toleranceOutcome('forecast', 1000, 0)).toBe('acknowledgementOnly');
  });

  it('the state of a line: within → accepted, outside → exception, planner decisions win', () => {
    /**
     * @param {number} qty
     * @param {RequirementResponse['status']} [status]
     * @returns {RequirementResponse}
     */
    const r = (qty, status = 'Submitted') => ({
      id: 'r',
      supplierId: 's',
      materialCode: 'm',
      periodBucket: 'p',
      publicationId: 'x',
      planVersion: 'x',
      submissionVersion: 1,
      status,
      forecastConfirmation: { confirmedQty: qty, uom: 'PCS' },
      provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' }
    });
    expect(commitmentState('firm', 1000, null)).toBe('awaiting');
    expect(commitmentState('firm', 1000, r(1000))).toBe('accepted');
    expect(commitmentState('firm', 1000, r(900))).toBe('exception');
    expect(commitmentState('firm', 1000, r(900, 'UnderReview'))).toBe('exception');
    expect(commitmentState('firm', 1000, r(900, 'Accepted'))).toBe('acceptedByPlanner');
    expect(commitmentState('firm', 1000, r(900, 'Disputed'))).toBe('revisionRequested');
    expect(commitmentState('forecast', 1000, r(0))).toBe('acknowledged');
    // PEX-D22 — a Trade-off (Zone Capacity) period too: any answer is an acknowledgement.
    expect(commitmentState('tradeOff', 1000, null)).toBe('awaiting');
    expect(commitmentState('tradeOff', 1000, r(900))).toBe('acknowledged');
    expect(commitmentState('tradeOff', 1000, r(900, 'Disputed'))).toBe('acknowledged');
  });
});

describe('REQ-E06-02 BR-07 — split deadlines, reminders and overdue (derived, never stored)', () => {
  it('Firm: 1 working day after publication on the §3.4 calendar', () => {
    // Friday 09:00 WIB → Monday 09:00 WIB.
    expect(commitmentDueAt('firm', '2026-08-28T02:00:00.000Z')).toBe('2026-08-31T02:00:00.000Z');
    // Friday 19:00 WIB (after hours) → next working hour Monday 08:00 → Tuesday 08:00.
    expect(commitmentDueAt('firm', '2026-08-28T12:00:00.000Z')).toBe('2026-09-01T01:00:00.000Z');
    // Friday 14 Aug → Monday 17 Aug is a national holiday → Tuesday 18 Aug.
    expect(commitmentDueAt('firm', '2026-08-14T02:00:00.000Z')).toBe('2026-08-18T02:00:00.000Z');
  });

  // ⚠️ PREMISE CHANGED BY BL-48 (CR-26, owner 2026-09-21): this case pinned
  // "7 days after publication", a value no rule stated. CR-26 says 3 WORKING
  // days. Friday 09:00 WIB → Monday, Tuesday, Wednesday 09:00.
  // Stated on the public-holiday base calendar: the demo's SAP plant shutdown
  // (Wednesday 2 September) moves the calendar-in-force answer to Thursday, and
  // that case is pinned separately (BL48-DEMO-03).
  it('Trade-off and Forecast: 3 working days after publication (CR-26); the reminder is at half the deadline', () => {
    expect(commitmentDueAt('tradeOff', '2026-08-28T02:00:00.000Z', DEFAULT_WORKING_CALENDAR)).toBe(
      '2026-09-02T02:00:00.000Z'
    );
    expect(commitmentDueAt('forecast', '2026-08-28T02:00:00.000Z', DEFAULT_WORKING_CALENDAR)).toBe(
      '2026-09-02T02:00:00.000Z'
    );
    expect(commitmentReminderAt('2026-08-28T02:00:00.000Z', '2026-09-02T02:00:00.000Z')).toBe(
      '2026-08-30T14:00:00.000Z'
    );
  });

  it('open before the reminder, due soon from it, overdue from the deadline; none once answered', () => {
    const line = {
      state: /** @type {const} */ ('awaiting'),
      reminderAt: '2026-08-31T14:00:00.000Z',
      dueAt: '2026-09-04T02:00:00.000Z'
    };
    expect(deadlineState(line, '2026-08-31T13:59:59.000Z')).toBe('open');
    expect(deadlineState(line, '2026-08-31T14:00:00.000Z')).toBe('dueSoon');
    expect(deadlineState(line, '2026-09-04T01:59:59.000Z')).toBe('dueSoon');
    expect(deadlineState(line, '2026-09-04T02:00:00.000Z')).toBe('overdue');
    expect(deadlineState({ ...line, state: 'accepted' }, '2026-09-10T00:00:00.000Z')).toBeNull();
  });
});

describe('re-publication — unchanged periods keep their commitment, changed ones return to awaiting', () => {
  const src = [{ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 1 }];
  const v1 = buildVersion({
    stream: 'packaging',
    version: 1,
    publishedAt: '2026-08-21T02:00:00.000Z',
    sources: src,
    master: materialEntry,
    demand: () => 49000
  });
  const v2 = buildVersion({
    stream: 'packaging',
    version: 2,
    publishedAt: '2026-08-28T02:00:00.000Z',
    sources: src,
    master: materialEntry,
    demand: (_c, p) => (p.id === '2026-09-07' ? 60000 : 49000)
  });
  /**
   * @param {typeof v1} pub
   * @param {string} period
   * @param {number} qty
   * @param {Partial<RequirementResponse>} [extra]
   * @returns {RequirementResponse}
   */
  const answer = (pub, period, qty, extra = {}) => ({
    id: `r-${pub.publicationId}-${period}-${extra.status ?? 'S'}`,
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8801',
    periodBucket: period,
    publicationId: pub.publicationId,
    planVersion: pub.planVersion,
    submissionVersion: 1,
    status: 'Submitted',
    submittedAt: '2026-08-22T03:00:00.000Z',
    forecastConfirmation: { confirmedQty: qty, uom: 'PCS', committedDate: period },
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...extra
  });
  /**
   * @param {RequirementResponse[]} responses
   * @param {string | null} [draftsFor]
   */
  const lines = (responses, draftsFor = null) =>
    buildCommitmentLines({
      publications: [v2, v1],
      responses,
      master: materialEntry,
      supplierName: (s) => s,
      draftsFor
    });
  /**
   * @param {ForecastCommitmentLine[]} ls
   * @param {string} p
   */
  const at = (ls, p) =>
    /** @type {ForecastCommitmentLine} */ (ls.find((l) => l.periodBucket === p));

  it('a commitment to an unchanged period is carried forward and still stands', () => {
    const l = at(lines([answer(v1, '2026-08-31', 49000)]), '2026-08-31');
    expect(l).toMatchObject({
      state: 'accepted',
      carriedForward: true,
      committedQty: 49000,
      version: 2,
      previousQty: 49000
    });
  });

  it('a commitment to a changed period no longer stands: the period is awaiting again', () => {
    const l = at(lines([answer(v1, '2026-09-07', 49000)]), '2026-09-07');
    expect(l).toMatchObject({
      state: 'awaiting',
      response: null,
      carriedForward: false,
      previousQty: 49000,
      forecastQty: 60000
    });
  });

  it('the deadline counts from the current version', () => {
    expect(at(lines([]), '2026-09-07').publishedAt).toBe('2026-08-28T02:00:00.000Z');
  });

  it('BR-10 — a draft stands for nothing and is shown only to its own supplier', () => {
    const draft = answer(v2, '2026-09-14', 1000, {
      status: 'Draft',
      submittedAt: undefined,
      id: 'draft-1'
    });
    expect(at(lines([draft]), '2026-09-14')).toMatchObject({ state: 'awaiting', draft: null });
    expect(at(lines([draft], 'sup-007'), '2026-09-14').draft?.id).toBe('draft-1');
  });

  it('the newest submission wins; a revision request is kept in the log the supplier sees', () => {
    // PEX-D22 — on a Zone Liability week (7 Sep, firm for sup-007's 14-day
    // lead time); a Trade-off week takes no commitment to revise.
    const disputed = answer(v2, '2026-09-07', 30000, {
      id: 'old',
      status: 'Disputed',
      submittedAt: '2026-08-28T05:00:00.000Z',
      disputeResponse: [
        { kind: 'raised', text: 'Please cover the launch week', at: '2026-08-28T06:00:00.000Z' }
      ]
    });
    expect(at(lines([disputed]), '2026-09-07').state).toBe('revisionRequested');
    const revised = answer(v2, '2026-09-07', 60000, {
      id: 'new',
      submittedAt: '2026-08-29T01:00:00.000Z'
    });
    const l = at(lines([disputed, revised]), '2026-09-07');
    expect(l.state).toBe('accepted');
    expect(l.log.map((e) => e.text)).toEqual(['Please cover the launch week']);
  });

  it('the simulated re-publication never changes a Firm quantity and keeps a planner’s move', () => {
    const moved = /** @type {import('../sdc/types').ForecastPublication} */ (
      reassignVersion(
        v2,
        {
          materialCode: 'PK-PETB-8801',
          periodBucket: '2026-09-21',
          fromSupplierId: 'sup-007',
          allocations: [{ supplierId: 'sup-012', qty: 49000 }],
          note: 'Split'
        },
        '2026-08-29T02:00:00.000Z'
      )
    );
    const next = republishVersion(moved, {
      publishedAt: '2026-09-04T02:00:00.000Z',
      sources: [...src, { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', share: 0 }],
      master: materialEntry,
      baseDemand: () => 49000
    });
    expect(next.version).toBe(4);
    for (const l of next.lines.filter((x) => x.commitmentClass === 'firm')) {
      const before = moved.lines.find(
        (x) => x.supplierId === l.supplierId && x.periodBucket === l.periodBucket
      );
      if (before) expect(l.forecastQty).toBe(before.forecastQty);
    }
    const week = next.lines.filter((l) => l.periodBucket === '2026-09-21');
    expect(week.map((l) => l.supplierId)).toEqual(['sup-012']);
    expect(next.lines.some((l) => l.forecastQty === 0)).toBe(false);
  });

  it('CAP-8 BR-03 — after part of the shortfall moves, the commitment still stands and the rest is an open exception; a re-publication keeps the moves', () => {
    // PEX-D22 — on a Zone Liability week (7 Sep): only a firm period holds a
    // commitment, so only there is a shortfall left to move.
    const committed = answer(v2, '2026-09-07', 30000);
    // Control: before the move, 30 000 against 60 000 is an exception.
    expect(at(lines([committed]), '2026-09-07')).toMatchObject({
      state: 'exception',
      committedQty: 30000,
      moves: []
    });
    const moved = /** @type {import('../sdc/types').ForecastPublication} */ (
      reassignVersion(
        v2,
        {
          materialCode: 'PK-PETB-8801',
          periodBucket: '2026-09-07',
          fromSupplierId: 'sup-007',
          allocations: [{ supplierId: 'sup-012', qty: 10000 }],
          note: 'Second mould shop'
        },
        '2026-08-29T02:00:00.000Z'
      )
    );
    /** @param {readonly import('../sdc/types').ForecastPublication[]} pubs */
    const after = (pubs) =>
      buildCommitmentLines({
        publications: pubs,
        responses: [committed],
        master: materialEntry,
        supplierName: (s) => s
      });
    const source = /** @type {ForecastCommitmentLine} */ (
      after([moved, v2, v1]).find(
        (l) => l.supplierId === 'sup-007' && l.periodBucket === '2026-09-07'
      )
    );
    expect(source).toMatchObject({
      forecastQty: 50000,
      committedQty: 30000,
      carriedForward: true,
      state: 'exception',
      moves: [
        {
          toSupplierId: 'sup-012',
          qty: 10000,
          at: '2026-08-29T02:00:00.000Z',
          note: 'Second mould shop'
        }
      ]
    });
    const next = republishVersion(moved, {
      publishedAt: '2026-09-04T02:00:00.000Z',
      sources: [...src, { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', share: 0 }],
      master: materialEntry,
      baseDemand: () => 49000
    });
    expect(
      next.lines.find((l) => l.supplierId === 'sup-007' && l.periodBucket === '2026-09-07')
        ?.movedOut
    ).toHaveLength(1);
  });
});

describe('CR-22 — gap quantity, percentage and colour', () => {
  it('thresholds: Green from 1.0, Amber from 0.8, Red below', () => {
    expect(gapColourThresholds()).toEqual({ greenFrom: 1, amberFrom: 0.8 });
    expect(gapColour(1)).toBe('green');
    expect(gapColour(0.9999)).toBe('amber');
    expect(gapColour(0.8)).toBe('amber');
    expect(gapColour(0.7999)).toBe('red');
  });

  it('gap = commitment − forecast, as quantity and share of forecast', () => {
    expect(commitmentGap('tradeOff', 1000, 800)).toEqual({
      qty: -200,
      pct: -0.2,
      ratio: 0.8,
      colour: 'amber',
      overCommit: false
    });
    expect(commitmentGap('tradeOff', 1000, 799).colour).toBe('red');
    expect(commitmentGap('tradeOff', 0, 0)).toMatchObject({ ratio: 1, colour: 'green', pct: 0 });
  });

  it('edge case — over-commit in the Firm zone is information, not an error', () => {
    expect(commitmentGap('firm', 1000, 1100)).toMatchObject({
      colour: 'green',
      overCommit: true,
      qty: 100
    });
    expect(commitmentGap('tradeOff', 1000, 1100).overCommit).toBe(false);
    expect(toleranceOutcome('firm', 1000, 1100)).toBe('within');
  });
});

// A minimal line for the ranking, alert and cumulative rules.
/**
 * @param {Partial<ForecastCommitmentLine> & { key: string }} p
 * @returns {ForecastCommitmentLine}
 */
const mk = (p) => ({
  stream: 'packaging',
  publicationId: 'FC-PK-V2',
  planVersion: 'x',
  version: 2,
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  materialLabel: 'Bottle',
  materialGroup: 'MG-20',
  uom: 'PCS',
  periodBucket: '2026-09-07',
  periodStart: '2026-09-07',
  periodEnd: '2026-09-13',
  zone: 'tradeOff',
  forecastQty: 1000,
  previousQty: 1000,
  publishedAt: '2026-08-28T02:00:00.000Z',
  // CR-26 — a Trade-off line of a version published Friday 28 August 09:00 WIB,
  // on the public-holiday base calendar (an input to the ranking, not a pin).
  dueAt: '2026-09-02T02:00:00.000Z',
  reminderAt: '2026-08-30T14:00:00.000Z',
  state: 'awaiting',
  response: null,
  responseDueAt: null,
  carriedForward: false,
  draft: null,
  committedQty: null,
  log: [],
  moves: [],
  otherQualifiedSuppliers: [],
  ...p
});

describe('REQ-E06-03 BR-04 — exceptions ranked: overdue, then Firm, then lowest days of supply', () => {
  const NOW = '2026-09-05T00:00:00.000Z';
  /** @type {Record<string, number | null>} */
  const dos = { A: 2, B: 50, C: 100, D: null, G: 5 };
  const lines = [
    mk({ key: 'A', materialCode: 'A', state: 'exception', committedQty: 700 }),
    mk({ key: 'B', materialCode: 'B', zone: 'firm', state: 'exception', committedQty: 900 }),
    mk({ key: 'C', materialCode: 'C', state: 'awaiting' }),
    mk({
      key: 'D',
      materialCode: 'D',
      zone: 'firm',
      state: 'awaiting',
      dueAt: '2026-08-31T02:00:00.000Z'
    }),
    mk({ key: 'E', materialCode: 'A', state: 'accepted', committedQty: 950 }),
    mk({
      key: 'F',
      materialCode: 'A',
      state: 'awaiting',
      dueAt: '2026-09-10T02:00:00.000Z',
      reminderAt: '2026-09-08T00:00:00.000Z'
    }),
    mk({ key: 'G', materialCode: 'G', zone: 'firm', state: 'exception', committedQty: 500 })
  ];

  it('orders the exceptions and leaves out what needs no action', () => {
    expect(rankExceptions(lines, NOW, (code) => dos[code] ?? null).map((l) => l.key)).toEqual([
      'D',
      'C',
      'G',
      'B',
      'A'
    ]);
  });
});

describe('REQ-E06-03 BR-03 — cumulative commitment against cumulative forecast', () => {
  // PEX-D22 — Zone Capacity (Trade-off and Forecast) periods take no
  // commitment, so the series sums Zone Liability (firm) periods only.
  it('sums Firm periods in period order; Trade-off and Forecast periods are left out; an unanswered period adds no commitment', () => {
    const series = cumulativeCommitment([
      mk({
        key: '2',
        periodBucket: '2026-09-14',
        periodStart: '2026-09-14',
        zone: 'firm',
        state: 'accepted',
        committedQty: 950
      }),
      mk({
        key: '1',
        periodBucket: '2026-09-07',
        periodStart: '2026-09-07',
        zone: 'firm',
        state: 'exception',
        committedQty: 800
      }),
      mk({ key: '3', periodBucket: '2026-09-21', periodStart: '2026-09-21', zone: 'firm' }),
      mk({
        key: '5',
        periodBucket: '2026-09-28',
        periodStart: '2026-09-28',
        state: 'acknowledged',
        committedQty: 700
      }),
      mk({
        key: '4',
        periodBucket: '2026-12',
        periodStart: '2026-11-30',
        zone: 'forecast',
        state: 'acknowledged'
      })
    ]);
    expect(series).toEqual([
      { periodBucket: '2026-09-07', cumulativeForecast: 1000, cumulativeCommitment: 800 },
      { periodBucket: '2026-09-14', cumulativeForecast: 2000, cumulativeCommitment: 1750 },
      { periodBucket: '2026-09-21', cumulativeForecast: 3000, cumulativeCommitment: 1750 }
    ]);
  });
});

describe('REQ-E06-03 BR-05 / CAP-8 — moving demand to one or more suppliers', () => {
  const v = /** @type {import('../sdc/types').ForecastPublication} */ (
    FORECAST_VERSION_SEED.find((p) => p.publicationId === 'FC-PK-V2')
  );
  const rm = /** @type {import('../sdc/types').ForecastPublication} */ (
    FORECAST_VERSION_SEED.find((p) => p.publicationId === 'FC-RM-V2')
  );
  const move = {
    materialCode: 'PK-PETB-8802',
    periodBucket: SEEDED_PACKAGING_WEEKS[3],
    fromSupplierId: 'sup-007',
    allocations: [{ supplierId: 'sup-012', qty: 38500 }],
    note: 'Moulding line down'
  };
  /**
   * @param {import('../sdc/types').ForecastPublication} pub
   * @param {string} supplierId
   * @param {string} materialCode
   * @param {string} periodBucket
   */
  const lineOf = (pub, supplierId, materialCode, periodBucket) =>
    pub.lines.find(
      (l) =>
        l.supplierId === supplierId &&
        l.materialCode === materialCode &&
        l.periodBucket === periodBucket
    );

  it('known-good: the whole quantity moves in a new version; the material × period total is unchanged', () => {
    const before = /** @type {import('../sdc/types').ForecastLine} */ (
      lineOf(v, 'sup-007', move.materialCode, move.periodBucket)
    );
    // Control: the fixture line carries exactly what the move names.
    expect(before.forecastQty).toBe(38500);
    const next = /** @type {import('../sdc/types').ForecastPublication} */ (
      reassignVersion(v, move, '2026-08-31T12:00:00.000Z')
    );
    expect(next).toMatchObject({
      publicationId: 'FC-PK-V3',
      version: 3,
      changeNote: 'Moulding line down',
      publishedAt: '2026-08-31T12:00:00.000Z'
    });
    /** @param {typeof v} pub */
    const period = (pub) =>
      pub.lines.filter(
        (l) => l.materialCode === move.materialCode && l.periodBucket === move.periodBucket
      );
    expect(period(next).map((l) => [l.supplierId, l.forecastQty])).toEqual([
      ['sup-012', before.forecastQty]
    ]);
    expect(period(next)[0].commitmentClass).toBe(before.commitmentClass);
    expect(period(next)[0].movedOut).toBeUndefined();
    expect(next.lines).toHaveLength(v.lines.length);
    // The earlier version is untouched (BR-06: every version is kept).
    expect(period(v).map((l) => l.supplierId)).toEqual(['sup-007']);
  });

  it('CAP-8 AC-01 (rules) — a split to two suppliers in ONE version: each target gains its quantity, the source keeps the rest and records one entry per allocation', () => {
    // BL-282: the first raw-material period is the week of 31 Aug (it was September).
    const M0 = '2026-08-31';
    const src = /** @type {import('../sdc/types').ForecastLine} */ (
      lineOf(rm, 'sup-005', 'RM-EMUL-9410', M0)
    );
    const sup002 = /** @type {import('../sdc/types').ForecastLine} */ (
      lineOf(rm, 'sup-002', 'RM-EMUL-9410', M0)
    );
    // Control: the fixture premise — a week of 1 400 kg, rounded to the 100 kg multiple: sup-005 carries 400, sup-002 1 000, sup-010 none.
    expect([src.forecastQty, sup002.forecastQty, src.uom]).toEqual([400, 1000, 'KG']);
    expect(lineOf(rm, 'sup-010', 'RM-EMUL-9410', M0)).toBeUndefined();
    const next = /** @type {import('../sdc/types').ForecastPublication} */ (
      reassignVersion(
        rm,
        {
          materialCode: 'RM-EMUL-9410',
          periodBucket: M0,
          fromSupplierId: 'sup-005',
          allocations: [
            { supplierId: 'sup-002', qty: 200 },
            { supplierId: 'sup-010', qty: 120 }
          ],
          note: 'Principal late'
        },
        '2026-08-31T12:00:00.000Z'
      )
    );
    expect(next.publicationId).toBe('FC-RM-V3');
    expect(lineOf(next, 'sup-002', 'RM-EMUL-9410', M0)?.forecastQty).toBe(1200);
    expect(lineOf(next, 'sup-010', 'RM-EMUL-9410', M0)).toMatchObject({
      forecastQty: 120,
      uom: 'KG',
      commitmentClass: src.commitmentClass
    });
    expect(lineOf(next, 'sup-005', 'RM-EMUL-9410', M0)).toMatchObject({
      forecastQty: 80,
      movedOut: [
        {
          toSupplierId: 'sup-002',
          qty: 200,
          at: '2026-08-31T12:00:00.000Z',
          note: 'Principal late'
        },
        {
          toSupplierId: 'sup-010',
          qty: 120,
          at: '2026-08-31T12:00:00.000Z',
          note: 'Principal late'
        }
      ]
    });
    /** @param {typeof rm} pub */
    const total = (pub) =>
      pub.lines
        .filter((l) => l.materialCode === 'RM-EMUL-9410' && l.periodBucket === M0)
        .reduce((n, l) => n + l.forecastQty, 0);
    expect(total(next)).toBe(total(rm));
  });

  it('known-good: moving to a supplier that already has the period adds to its line', () => {
    /**
     * @param {typeof v} pub
     * @param {string} s
     */
    const qty = (pub, s) => lineOf(pub, s, 'PK-PETB-8801', SEEDED_PACKAGING_WEEKS[0])?.forecastQty;
    const all = /** @type {number} */ (qty(v, 'sup-012'));
    const next = /** @type {import('../sdc/types').ForecastPublication} */ (
      reassignVersion(
        v,
        {
          materialCode: 'PK-PETB-8801',
          periodBucket: SEEDED_PACKAGING_WEEKS[0],
          fromSupplierId: 'sup-012',
          allocations: [{ supplierId: 'sup-007', qty: all }],
          note: 'x'
        },
        '2026-08-31T12:00:00.000Z'
      )
    );
    expect(qty(next, 'sup-007')).toBe(/** @type {number} */ (qty(v, 'sup-007')) + all);
    expect(qty(next, 'sup-012')).toBeUndefined();
  });

  it('known-bad: the same supplier, a period the supplier does not have, no allocation, 0, or more than the line moves nothing', () => {
    const at = '2026-08-31T12:00:00.000Z';
    // Control: the base move is accepted.
    expect(reassignVersion(v, move, at)).not.toBeNull();
    expect(
      reassignVersion(v, { ...move, allocations: [{ supplierId: 'sup-007', qty: 100 }] }, at)
    ).toBeNull();
    expect(reassignVersion(v, { ...move, fromSupplierId: 'sup-012' }, at)).toBeNull();
    expect(reassignVersion(v, { ...move, allocations: [] }, at)).toBeNull();
    expect(
      reassignVersion(v, { ...move, allocations: [{ supplierId: 'sup-012', qty: 0 }] }, at)
    ).toBeNull();
    expect(
      reassignVersion(v, { ...move, allocations: [{ supplierId: 'sup-012', qty: 38501 }] }, at)
    ).toBeNull();
  });
});

describe('CAP-8 BR-03 — the shortfall rule the verb and the panel share', () => {
  const ctx = { fromSupplierId: 'sup-005', qualified: ['sup-002', 'sup-005', 'sup-010'] };

  it('the shortfall is forecast − commitment; a line awaiting its commitment counts as committing nothing', () => {
    expect(moveShortfall({ forecastQty: 38500, committedQty: 30000, state: 'exception' })).toBe(
      8500
    );
    expect(moveShortfall({ forecastQty: 42400, committedQty: null, state: 'awaiting' })).toBe(
      42400
    );
    // An acknowledgement-only response carries no commitment while awaiting.
    expect(moveShortfall({ forecastQty: 1800, committedQty: 900, state: 'awaiting' })).toBe(1800);
  });

  it('known-good: a total up to and exactly at the shortfall, split or not, passes', () => {
    expect(moveDemandRefusal(12800, [{ supplierId: 'sup-002', qty: 8000 }], ctx)).toBeNull();
    expect(
      moveDemandRefusal(
        12800,
        [
          { supplierId: 'sup-002', qty: 8000 },
          { supplierId: 'sup-010', qty: 4800 }
        ],
        ctx
      )
    ).toBeNull();
  });

  it('known-bad: above the shortfall by one unit, nothing, 0, a negative or text quantity, the same, an unqualified or a repeated supplier', () => {
    expect(
      moveDemandRefusal(
        12800,
        [
          { supplierId: 'sup-002', qty: 8000 },
          { supplierId: 'sup-010', qty: 4801 }
        ],
        ctx
      )
    ).toEqual({ refusal: 'aboveShortfall' });
    expect(moveDemandRefusal(12800, [], ctx)).toEqual({ refusal: 'nothingToMove' });
    for (const qty of [0, -5, '800', Number.NaN]) {
      expect(moveDemandRefusal(12800, [{ supplierId: 'sup-002', qty }], ctx)).toEqual({
        refusal: 'badQty',
        supplierId: 'sup-002'
      });
    }
    expect(moveDemandRefusal(12800, [{ supplierId: 'sup-005', qty: 1 }], ctx)).toEqual({
      refusal: 'sameSupplier',
      supplierId: 'sup-005'
    });
    expect(moveDemandRefusal(12800, [{ supplierId: 'sup-007', qty: 1 }], ctx)).toEqual({
      refusal: 'notQualified',
      supplierId: 'sup-007'
    });
    expect(
      moveDemandRefusal(
        12800,
        [
          { supplierId: 'sup-002', qty: 1 },
          { supplierId: 'sup-002', qty: 1 }
        ],
        ctx
      )
    ).toEqual({ refusal: 'duplicateSupplier', supplierId: 'sup-002' });
  });
});

describe('REQ-E06-01 BR-06 — the changes between versions', () => {
  const [pk1, pk2] = FORECAST_VERSION_SEED.filter((p) => p.stream === 'packaging');

  it('lists moved, new and dropped periods for the supplier — never a period that simply rolled off', () => {
    const changes = versionChanges(pk2, pk1, 'sup-007');
    /**
     * @param {string} code
     * @param {string} period
     */
    const find = (code, period) =>
      changes.find((c) => c.materialCode === code && c.periodBucket === period);
    expect(find('PK-PETB-8802', SEEDED_PACKAGING_WEEKS[0])).toMatchObject({
      kind: 'changed',
      previousQty: 38500,
      currentQty: 42400
    });
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[3])).toMatchObject({
      kind: 'changed',
      previousQty: 34300,
      currentQty: 30900
    });
    // PEX-2 — week 17 of version 2 is new (version 1 was published a week earlier).
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[16])).toMatchObject({
      kind: 'added',
      previousQty: null
    });
    // PEX-2 — both versions end at month 12 (July 2027), so no period is dropped;
    // under the 6-month horizon the November stub of version 1 was.
    expect(changes.filter((c) => c.kind === 'removed')).toEqual([]);
    expect(find('PK-PETB-8801', '2026-08-24')).toBeUndefined(); // rolled off the start
    // An unchanged period is not listed; another supplier's periods are not listed.
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[1])).toBeUndefined();
    expect(changes.every((c) => c.supplierId === 'sup-007')).toBe(true);
    expect(versionChanges(pk1, null)).toEqual([]);
  });

  it('a period the new version no longer has is listed as dropped', () => {
    const last = pk1.lines.find(
      (l) =>
        l.supplierId === 'sup-007' &&
        l.materialCode === 'PK-PETB-8801' &&
        l.periodBucket === '2027-07'
    );
    if (!last) throw new Error('fixture premise: version 1 runs to July 2027');
    const prev = { ...pk1, lines: [...pk1.lines, { ...last, periodBucket: '2027-08' }] };
    expect(versionChanges(pk2, prev, 'sup-007').filter((c) => c.kind === 'removed')).toEqual([
      {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8801',
        periodBucket: '2027-08',
        kind: 'removed',
        previousQty: last.forecastQty,
        currentQty: null
      }
    ]);
  });
});

describe('REQ-E06-02 BR-06 — spreadsheet: download, template and row-by-row upload (CR-18)', () => {
  const lines = [
    mk({
      key: 'a',
      periodBucket: '2026-09-07',
      periodStart: '2026-09-07',
      zone: 'firm',
      forecastQty: 34300
    }),
    mk({
      key: 'b',
      periodBucket: '2026-09-14',
      periodStart: '2026-09-14',
      zone: 'firm',
      forecastQty: 34300
    }),
    mk({
      key: 'c',
      periodBucket: '2026-10-26',
      periodStart: '2026-10-26',
      zone: 'forecast',
      forecastQty: 34300
    }),
    mk({
      key: 'd',
      materialCode: 'PK-PETB-8802',
      periodBucket: '2026-09-14',
      periodStart: '2026-09-14',
      zone: 'firm',
      forecastQty: 1500
    })
  ];
  // An OLDER file's header: it still carries the commitment date column that
  // CAP-6 (BL-175) removed from the template (BR-03 — still parses, ignored).
  const H = [
    'Material code',
    'Period',
    'Zone',
    'Forecast quantity',
    'Unit',
    'Committed quantity',
    'Commitment date (YYYY-MM-DD)',
    'Upside quantity',
    'Reason (capacity, material, logistics, quality, force-majeure, discontinued, other)',
    'Note'
  ];
  /** @param {...string} cells */
  const row = (...cells) => Object.fromEntries(H.map((h, i) => [h, cells[i] ?? '']));

  it('known-good: the template for the current version, untouched, uploads every row', () => {
    for (const lang of /** @type {const} */ (['en', 'id'])) {
      const parsed = parseCsv(commitmentTemplateCsv(lines, lang));
      const { accepted, refused } = validateCommitmentRows(parsed.rows, lines);
      expect(refused).toEqual([]);
      expect(accepted.map((a) => a.kind)).toEqual(['commit', 'commit', 'acknowledge', 'commit']);
      expect(accepted[0]).toMatchObject({ committedQty: 34300 });
    }
  });

  // PEX-D22 — a Trade-off (Zone Capacity) row is an acknowledgement: the
  // template leaves its committed quantity blank, and a typed quantity on it
  // is read as an acknowledgement, never a commitment.
  it('PEX-D22 — a Trade-off row is acknowledged, never committed, even with a quantity typed in', () => {
    const tradeOff = [
      mk({ key: 't', periodBucket: '2026-09-21', periodStart: '2026-09-21', forecastQty: 34300 })
    ];
    const tpl = parseCsv(commitmentTemplateCsv(tradeOff, 'en'));
    expect(tpl.rows[0]['Committed quantity']).toBe('');
    const { accepted, refused } = validateCommitmentRows(
      [row('PK-PETB-8801', '2026-09-21', '', '', 'PCS', '30000', '', '', '', 'Seen')],
      tradeOff
    );
    expect(refused).toEqual([]);
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({ kind: 'acknowledge', note: 'Seen' });
    expect(accepted[0]).not.toHaveProperty('committedQty');
  });

  it('CAP-6 BR-03 — the template has no commitment date column, in EN or ID', () => {
    for (const lang of /** @type {const} */ (['en', 'id'])) {
      const header = commitmentTemplateCsv(lines, lang).split('\n')[0];
      expect(header).not.toMatch(/date|tanggal/i);
      expect(header).toMatch(lang === 'en' ? /Committed quantity/ : /Kuantitas komitmen/);
    }
  });

  it('CAP-6 AC-02 — an old file with a date column uploads: the date, valid, malformed or blank, is ignored', () => {
    const { accepted, refused } = validateCommitmentRows(
      [
        row('PK-PETB-8801', '2026-09-07', 'firm', '', 'PCS', '34300', '2026-09-07'), // 2 valid date
        row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '34300', '14/09/2026'), // 3 malformed date
        row('PK-PETB-8802', '2026-09-14', '', '', 'PCS', '1500', '') // 4 blank date
      ],
      lines
    );
    expect(refused).toEqual([]);
    expect(accepted.map((a) => [a.row, a.kind])).toEqual([
      [2, 'commit'],
      [3, 'commit'],
      [4, 'commit']
    ]);
    // The checked row carries no date at all: the store records the period start.
    expect(accepted.every((a) => !('commitmentDate' in a))).toBe(true);
  });

  it('each row is accepted or refused on its own, with its row number and reason', () => {
    const { accepted, refused } = validateCommitmentRows(
      [
        row('PK-PETB-8801', '2026-09-07', 'firm', '', 'PCS', '34300', '2026-09-07'), // 2 ok
        row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '2026-09-14'), // 3 below, no reason
        row('PK-PETB-8802', '2026-09-14', '', '', 'PCS', '1.500', '2026-09-14'), // 4 ambiguous (CR-18)
        row('PK-PETB-9999', '2026-09-14', '', '', 'PCS', '10', '2026-09-14'), // 5 not in forecast
        row('PK-PETB-8801', '2026-10-26', '', '', '', '', '', '', '', 'Seen'), // 6 acknowledgement
        row('PK-PETB-8801', '2026-09-07', '', '', 'PCS', '34300', '2026-09-07'), // 7 duplicate of row 2
        // 8 malformed date in an old file's date column: ignored since CAP-6 (BR-03)
        row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '14/09/2026', '', 'capacity'),
        row('PK-PETB-8802', '2026-09-14', '', '', 'KG', '1400', '2026-09-14') // 9 unit
      ],
      lines
    );
    expect(accepted.map((a) => [a.row, a.kind])).toEqual([
      [2, 'commit'],
      [6, 'acknowledge'],
      [8, 'commit']
    ]);
    expect(refused.map((r) => [r.row, r.reason])).toEqual([
      [3, 'reasonRequired'],
      [4, 'ambiguousNumber'],
      [5, 'notInForecast'],
      [7, 'duplicateRow'],
      [9, 'unitMismatch']
    ]);
  });

  it('below forecast with a starter reason passes; "other" needs a note', () => {
    const ok = validateCommitmentRows(
      [row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '2026-09-14', '2000', 'Capacity')],
      lines
    );
    expect(ok.accepted[0]).toMatchObject({
      kind: 'commit',
      committedQty: 30000,
      upsideQty: 2000,
      reason: 'capacity'
    });
    const bad = validateCommitmentRows(
      [row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '2026-09-14', '', 'other')],
      lines
    );
    expect(bad.refused.map((r) => r.reason)).toEqual(['noteRequired']);
  });

  it('AC-03 — the forecast download has a header and one row per material × period', () => {
    const csv = forecastCsv(
      lines,
      {
        materialCode: 'Material code',
        material: 'Material',
        period: 'Period',
        periodStart: 'Start',
        zone: 'Zone',
        forecastQty: 'Forecast',
        unit: 'Unit',
        previousQty: 'Previous',
        dueAt: 'Due'
      },
      (z) => z.toUpperCase()
    );
    const parsed = parseCsv(csv);
    expect(parsed.headers[0]).toBe('Material code');
    expect(parsed.rows).toHaveLength(4);
    expect(parsed.rows[0]).toMatchObject({ Period: '2026-09-07', Zone: 'FIRM', Forecast: '34300' });
  });
});

describe('REQ-E08-05 BR-01 — committed below forecast beyond tolerance raises an alert', () => {
  it('High when a Firm period is short, Medium for Trade-off only; within tolerance and over-commit raise nothing', () => {
    const subjects = commitmentAlertSubjects([
      mk({ key: '1', materialCode: 'M1', zone: 'firm', state: 'exception', committedQty: 900 }),
      mk({ key: '2', materialCode: 'M1', zone: 'tradeOff', state: 'exception', committedQty: 700 }),
      mk({
        key: '3',
        materialCode: 'M2',
        zone: 'tradeOff',
        state: 'revisionRequested',
        committedQty: 700
      }),
      mk({ key: '4', materialCode: 'M3', zone: 'tradeOff', state: 'accepted', committedQty: 950 }),
      mk({
        key: '5',
        materialCode: 'M4',
        zone: 'firm',
        state: 'acceptedByPlanner',
        committedQty: 500
      })
    ]);
    expect(subjects.map((s) => [s.materialCode, s.firm])).toEqual([
      ['M1', true],
      ['M2', false]
    ]);
    const conditions = deriveAlertConditions([], [], '2026-08-31T12:00:00.000Z', subjects);
    expect(conditions.map((c) => [c.key, c.riskClass])).toEqual([
      ['commitmentBelowForecast|M1|sup-007', 'high'],
      ['commitmentBelowForecast|M2|sup-007', 'medium']
    ]);
  });
});

describe('REQ-E07-03 — the foresight answer a line gives the Order summary', () => {
  it('Confirmed, Gap, Awaiting, or Not required for a Zone Capacity (Trade-off or Forecast) period', () => {
    const firm = /** @type {const} */ ('firm');
    expect(foresightAnswerOf(mk({ key: '1', zone: firm, state: 'accepted' }))).toBe('confirmed');
    expect(foresightAnswerOf(mk({ key: '2', zone: firm, state: 'acceptedByPlanner' }))).toBe(
      'confirmed'
    );
    expect(foresightAnswerOf(mk({ key: '3', zone: firm, state: 'exception' }))).toBe('gap');
    expect(foresightAnswerOf(mk({ key: '4', zone: firm, state: 'revisionRequested' }))).toBe('gap');
    expect(foresightAnswerOf(mk({ key: '5', zone: firm, state: 'awaiting' }))).toBe('awaiting');
    expect(foresightAnswerOf(mk({ key: '6', zone: 'forecast', state: 'awaiting' }))).toBe(
      'notRequired'
    );
    // PEX-D22 — a Trade-off (Zone Capacity) period needs no commitment either.
    expect(foresightAnswerOf(mk({ key: '7', state: 'acknowledged' }))).toBe('notRequired');
    expect(foresightAnswerOf(mk({ key: '8', state: 'awaiting' }))).toBe('notRequired');
  });
});

describe('settings alignment', () => {
  it('the SDC coverage bands are CR-03’s (the one threshold set)', () => {
    // ⚠️ PREMISE CHANGED AT BL-32: this pinned two CONSTANTS equal
    // (`COVERAGE_AT_RISK_FLOOR` and CR-03's), which held only while nobody
    // could change CR-03. Now the administrator can, so the claim is that the
    // SDC indicator FOLLOWS a change — probed by making one, not by comparing
    // two defaults (which a re-introduced copy would also satisfy).
    expect(coverageBands()).toEqual(coverageThresholds());
    const nobody = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
    try {
      expect(
        hubSettingsStore.append({
          key: 'coverage.atRiskFromPct',
          value: 60,
          setBy: nobody,
          setAt: '2026-09-21T00:00:00.000Z'
        })
      ).toBe(true);
      expect(coverageBands().atRiskFrom).toBe(0.6);
      expect(coverageBands()).toEqual(coverageThresholds());
    } finally {
      hubSettingsStore.reset();
    }
    expect(coverageBands().atRiskFrom).toBe(0.8);
  });
});
