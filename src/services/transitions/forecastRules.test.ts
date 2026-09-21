// ────────────────────────────────────────────────────────────────────────────
// Forecast collaboration rules (REQ-E06-01 to REQ-E06-03), pure: the period
// grid, zones, CR-21 tolerance (with the exact 10% boundary), the below-forecast
// reason rule, the split deadline and its reminder, re-publication carry-
// forward, CR-22 gap colours (0.8 and 1.0 boundaries), exception ranking, the
// demand move, version changes, the spreadsheet check, and the alert rule.
// Every rule is probed with a known-good and a known-bad input.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ForecastCommitmentLine } from '../data/types';
import type { RequirementResponse } from '../sdc/types';
import { materialEntry } from '../sdc/materialMaster';
import { bucketEndMs, COVERAGE_AT_RISK_FLOOR } from '../sdc/consolidation';
import { COVERAGE_THRESHOLDS } from './inventoryConfig';
import {
  COMMITMENT_REASONS,
  COMMITMENT_TOLERANCE,
  FORECAST_HORIZON,
  GAP_COLOUR_THRESHOLDS,
  zoneLengthsFor,
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
  rankExceptions,
  reassignVersion,
  republishVersion,
  shortfallRefusal,
  toleranceOutcome,
  validateCommitmentRows,
  versionChanges,
  zoneFor,
} from './forecastRules';
import { parseCsv } from './inventoryRules';
import { deriveAlertConditions } from './inventoryAlertRules';
import { FORECAST_VERSION_SEED, SEEDED_PACKAGING_WEEKS } from '../data/mock/fixtures/forecastHub';

const DAY = 86_400_000;
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00.000Z`) + DAY).toISOString().slice(0, 10);

describe('REQ-E06-01 BR-03 — the period grid', () => {
  it('packaging: 13 weekly periods from the Monday on or after publication, then monthly up to 6 months', () => {
    expect(FORECAST_HORIZON.packaging).toEqual({ weeklyPeriods: 13, horizonMonths: 6 });
    const periods = generatePeriods('packaging', '2026-08-28T02:00:00.000Z');
    const weeks = periods.filter((p) => p.kind === 'week');
    expect(weeks).toHaveLength(13);
    expect(weeks[0]).toEqual({ id: '2026-08-31', kind: 'week', start: '2026-08-31', end: '2026-09-06' });
    expect(weeks[12].id).toBe('2026-11-23');
    // The 1-day stub (30 Nov) joins December; the horizon ends 6 months after the first period.
    expect(periods.filter((p) => p.kind === 'month')).toEqual([
      { id: '2026-12', kind: 'month', start: '2026-11-30', end: '2026-12-31' },
      { id: '2027-01', kind: 'month', start: '2027-01-01', end: '2027-01-31' },
      { id: '2027-02', kind: 'month', start: '2027-02-01', end: '2027-02-28' },
    ]);
  });

  it('every day of the horizon belongs to exactly one period (no gap, no overlap)', () => {
    for (const [stream, at] of [
      ['packaging', '2026-08-21T02:00:00.000Z'],
      ['packaging', '2026-08-28T02:00:00.000Z'],
      ['rawMaterial', '2026-08-03T02:00:00.000Z'],
    ] as const) {
      const periods = generatePeriods(stream, at);
      for (let i = 1; i < periods.length; i++) expect(periods[i].start).toBe(nextDay(periods[i - 1].end));
    }
  });

  it('a stub of 7 days or more stays its own month', () => {
    const nov = generatePeriods('packaging', '2026-08-21T02:00:00.000Z').find((p) => p.kind === 'month');
    expect(nov).toEqual({ id: '2026-11', kind: 'month', start: '2026-11-23', end: '2026-11-30' });
  });

  it('raw material: 6 monthly periods from the first of the month on or after publication', () => {
    expect(generatePeriods('rawMaterial', '2026-08-27T02:00:00.000Z').map((p) => p.id)).toEqual([
      '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02',
    ]);
    // Published on the 1st: that month is the first period.
    expect(generatePeriods('rawMaterial', '2026-09-01T02:00:00.000Z')[0].id).toBe('2026-09');
  });

  it('the publication day is read in WIB, not UTC (Monday 17:30 UTC is Tuesday 00:30 in Jakarta)', () => {
    expect(generatePeriods('packaging', '2026-08-31T17:30:00.000Z')[0].id).toBe('2026-09-07');
    expect(generatePeriods('packaging', '2026-08-31T12:00:00.000Z')[0].id).toBe('2026-08-31');
  });

  it('horizon and cut-over are a setting', () => {
    expect(generatePeriods('packaging', '2026-08-28T02:00:00.000Z', { weeklyPeriods: 2, horizonMonths: 1 }).map((p) => p.id)).toEqual([
      '2026-08-31', '2026-09-07', '2026-09',
    ]);
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
        { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300', share: 1 },
      ],
      master: materialEntry,
      demand: () => 1000,
    });
    const cls = (s: string, p: string) => v.lines.find((l) => l.supplierId === s && l.periodBucket === p)?.commitmentClass;
    expect(cls('sup-007', '2026-09-14')).toBe('semi-firm'); // sup-007 lead time 14
    expect(cls('sup-012', '2026-09-14')).toBe('firm'); // sup-012 lead time 21
    expect(v.lines.some((l) => l.materialCode === 'RM-STEAR-7300')).toBe(false);
    expect(v.lines.find((l) => l.commitmentClass === 'firm')!.allocation.approvedBy).toBe('planner');
  });
});

describe('REQ-E06-02 BR-04 — below forecast needs a starter reason (the verb calls this)', () => {
  it('known-good: at or above forecast needs nothing; below with a starter code passes', () => {
    expect(COMMITMENT_REASONS).toEqual(['capacity', 'material', 'logistics', 'quality', 'other']);
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
    expect(COMMITMENT_TOLERANCE.firmShortfall).toBe(0);
    expect(toleranceOutcome('firm', 1000, 1000)).toBe('within');
    expect(toleranceOutcome('firm', 1000, 999)).toBe('outside');
  });

  it('Trade-off: up to 10% below is accepted — exactly 10% is within, a unit more is outside', () => {
    expect(COMMITMENT_TOLERANCE.tradeOffShortfall).toBe(0.1);
    expect(toleranceOutcome('tradeOff', 1000, 900)).toBe('within');
    expect(toleranceOutcome('tradeOff', 38500, 34650)).toBe('within');
    expect(toleranceOutcome('tradeOff', 1000, 899)).toBe('outside');
    expect(toleranceOutcome('tradeOff', 1000, 899.9)).toBe('outside');
  });

  it('Forecast: acknowledgement only', () => {
    expect(toleranceOutcome('forecast', 1000, 0)).toBe('acknowledgementOnly');
  });

  it('the state of a line: within → accepted, outside → exception, planner decisions win', () => {
    const r = (qty: number, status: RequirementResponse['status'] = 'Submitted'): RequirementResponse => ({
      id: 'r', supplierId: 's', materialCode: 'm', periodBucket: 'p', publicationId: 'x', planVersion: 'x',
      submissionVersion: 1, status, forecastConfirmation: { confirmedQty: qty, uom: 'PCS' },
      provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    });
    expect(commitmentState('tradeOff', 1000, null)).toBe('awaiting');
    expect(commitmentState('tradeOff', 1000, r(900))).toBe('accepted');
    expect(commitmentState('firm', 1000, r(900))).toBe('exception');
    expect(commitmentState('firm', 1000, r(900, 'UnderReview'))).toBe('exception');
    expect(commitmentState('firm', 1000, r(900, 'Accepted'))).toBe('acceptedByPlanner');
    expect(commitmentState('firm', 1000, r(900, 'Disputed'))).toBe('revisionRequested');
    expect(commitmentState('forecast', 1000, r(0))).toBe('acknowledged');
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
  it('Trade-off and Forecast: 3 working days after publication (CR-26); the reminder is at half the deadline', () => {
    expect(commitmentDueAt('tradeOff', '2026-08-28T02:00:00.000Z')).toBe('2026-09-02T02:00:00.000Z');
    expect(commitmentDueAt('forecast', '2026-08-28T02:00:00.000Z')).toBe('2026-09-02T02:00:00.000Z');
    expect(commitmentReminderAt('2026-08-28T02:00:00.000Z', '2026-09-02T02:00:00.000Z')).toBe('2026-08-30T14:00:00.000Z');
  });

  it('open before the reminder, due soon from it, overdue from the deadline; none once answered', () => {
    const line = { state: 'awaiting' as const, reminderAt: '2026-08-31T14:00:00.000Z', dueAt: '2026-09-04T02:00:00.000Z' };
    expect(deadlineState(line, '2026-08-31T13:59:59.000Z')).toBe('open');
    expect(deadlineState(line, '2026-08-31T14:00:00.000Z')).toBe('dueSoon');
    expect(deadlineState(line, '2026-09-04T01:59:59.000Z')).toBe('dueSoon');
    expect(deadlineState(line, '2026-09-04T02:00:00.000Z')).toBe('overdue');
    expect(deadlineState({ ...line, state: 'accepted' }, '2026-09-10T00:00:00.000Z')).toBeNull();
  });
});

describe('re-publication — unchanged periods keep their commitment, changed ones return to awaiting', () => {
  const src = [{ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 1 }];
  const v1 = buildVersion({ stream: 'packaging', version: 1, publishedAt: '2026-08-21T02:00:00.000Z', sources: src, master: materialEntry, demand: () => 49000 });
  const v2 = buildVersion({
    stream: 'packaging', version: 2, publishedAt: '2026-08-28T02:00:00.000Z', sources: src, master: materialEntry,
    demand: (_c, p) => (p.id === '2026-09-07' ? 60000 : 49000),
  });
  const answer = (pub: typeof v1, period: string, qty: number, extra: Partial<RequirementResponse> = {}): RequirementResponse => ({
    id: `r-${pub.publicationId}-${period}-${extra.status ?? 'S'}`,
    supplierId: 'sup-007', materialCode: 'PK-PETB-8801', periodBucket: period,
    publicationId: pub.publicationId, planVersion: pub.planVersion, submissionVersion: 1,
    status: 'Submitted', submittedAt: '2026-08-22T03:00:00.000Z',
    forecastConfirmation: { confirmedQty: qty, uom: 'PCS', committedDate: period },
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    ...extra,
  });
  const lines = (responses: RequirementResponse[], draftsFor: string | null = null) =>
    buildCommitmentLines({ publications: [v2, v1], responses, master: materialEntry, supplierName: (s) => s, draftsFor });
  const at = (ls: ForecastCommitmentLine[], p: string) => ls.find((l) => l.periodBucket === p)!;

  it('a commitment to an unchanged period is carried forward and still stands', () => {
    const l = at(lines([answer(v1, '2026-08-31', 49000)]), '2026-08-31');
    expect(l).toMatchObject({ state: 'accepted', carriedForward: true, committedQty: 49000, version: 2, previousQty: 49000 });
  });

  it('a commitment to a changed period no longer stands: the period is awaiting again', () => {
    const l = at(lines([answer(v1, '2026-09-07', 49000)]), '2026-09-07');
    expect(l).toMatchObject({ state: 'awaiting', response: null, carriedForward: false, previousQty: 49000, forecastQty: 60000 });
  });

  it('the deadline counts from the current version', () => {
    expect(at(lines([]), '2026-09-07').publishedAt).toBe('2026-08-28T02:00:00.000Z');
  });

  it('BR-10 — a draft stands for nothing and is shown only to its own supplier', () => {
    const draft = answer(v2, '2026-09-14', 1000, { status: 'Draft', submittedAt: undefined, id: 'draft-1' });
    expect(at(lines([draft]), '2026-09-14')).toMatchObject({ state: 'awaiting', draft: null });
    expect(at(lines([draft], 'sup-007'), '2026-09-14').draft?.id).toBe('draft-1');
  });

  it('the newest submission wins; a revision request is kept in the log the supplier sees', () => {
    const disputed = answer(v2, '2026-09-14', 30000, {
      id: 'old', status: 'Disputed', submittedAt: '2026-08-28T05:00:00.000Z',
      disputeResponse: [{ kind: 'raised', text: 'Please cover the launch week', at: '2026-08-28T06:00:00.000Z' }],
    });
    expect(at(lines([disputed]), '2026-09-14').state).toBe('revisionRequested');
    const revised = answer(v2, '2026-09-14', 49000, { id: 'new', submittedAt: '2026-08-29T01:00:00.000Z' });
    const l = at(lines([disputed, revised]), '2026-09-14');
    expect(l.state).toBe('accepted');
    expect(l.log.map((e) => e.text)).toEqual(['Please cover the launch week']);
  });

  it('the simulated re-publication never changes a Firm quantity and keeps a planner’s move', () => {
    const moved = reassignVersion(v2, { materialCode: 'PK-PETB-8801', periodBucket: '2026-09-21', fromSupplierId: 'sup-007', toSupplierId: 'sup-012', note: 'Split' }, '2026-08-29T02:00:00.000Z')!;
    const next = republishVersion(moved, {
      publishedAt: '2026-09-04T02:00:00.000Z',
      sources: [...src, { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', share: 0 }],
      master: materialEntry,
      baseDemand: () => 49000,
    });
    expect(next.version).toBe(4);
    for (const l of next.lines.filter((x) => x.commitmentClass === 'firm')) {
      const before = moved.lines.find((x) => x.supplierId === l.supplierId && x.periodBucket === l.periodBucket);
      if (before) expect(l.forecastQty).toBe(before.forecastQty);
    }
    const week = next.lines.filter((l) => l.periodBucket === '2026-09-21');
    expect(week.map((l) => l.supplierId)).toEqual(['sup-012']);
    expect(next.lines.some((l) => l.forecastQty === 0)).toBe(false);
  });
});

describe('CR-22 — gap quantity, percentage and colour', () => {
  it('thresholds: Green from 1.0, Amber from 0.8, Red below', () => {
    expect(GAP_COLOUR_THRESHOLDS).toEqual({ greenFrom: 1, amberFrom: 0.8 });
    expect(gapColour(1)).toBe('green');
    expect(gapColour(0.9999)).toBe('amber');
    expect(gapColour(0.8)).toBe('amber');
    expect(gapColour(0.7999)).toBe('red');
  });

  it('gap = commitment − forecast, as quantity and share of forecast', () => {
    expect(commitmentGap('tradeOff', 1000, 800)).toEqual({ qty: -200, pct: -0.2, ratio: 0.8, colour: 'amber', overCommit: false });
    expect(commitmentGap('tradeOff', 1000, 799).colour).toBe('red');
    expect(commitmentGap('tradeOff', 0, 0)).toMatchObject({ ratio: 1, colour: 'green', pct: 0 });
  });

  it('edge case — over-commit in the Firm zone is information, not an error', () => {
    expect(commitmentGap('firm', 1000, 1100)).toMatchObject({ colour: 'green', overCommit: true, qty: 100 });
    expect(commitmentGap('tradeOff', 1000, 1100).overCommit).toBe(false);
    expect(toleranceOutcome('firm', 1000, 1100)).toBe('within');
  });
});

// A minimal line for the ranking, alert and cumulative rules.
const mk = (p: Partial<ForecastCommitmentLine> & { key: string }): ForecastCommitmentLine => ({
  stream: 'packaging', publicationId: 'FC-PK-V2', planVersion: 'x', version: 2,
  supplierId: 'sup-007', supplierName: 'PT Sample Packaging Indonesia', materialCode: 'PK-PETB-8801', materialLabel: 'Bottle',
  materialGroup: 'MG-20', uom: 'PCS', periodBucket: '2026-09-07', periodStart: '2026-09-07', periodEnd: '2026-09-13',
  zone: 'tradeOff', forecastQty: 1000, previousQty: 1000, publishedAt: '2026-08-28T02:00:00.000Z',
  // CR-26 — a Trade-off line of a version published Friday 28 August 09:00 WIB.
  dueAt: '2026-09-02T02:00:00.000Z', reminderAt: '2026-08-30T14:00:00.000Z', state: 'awaiting', response: null,
  responseDueAt: null, carriedForward: false, draft: null, committedQty: null, log: [], otherQualifiedSuppliers: [],
  ...p,
});

describe('REQ-E06-03 BR-04 — exceptions ranked: overdue, then Firm, then lowest days of supply', () => {
  const NOW = '2026-09-05T00:00:00.000Z';
  const dos: Record<string, number | null> = { A: 2, B: 50, C: 100, D: null, G: 5 };
  const lines = [
    mk({ key: 'A', materialCode: 'A', state: 'exception', committedQty: 700 }),
    mk({ key: 'B', materialCode: 'B', zone: 'firm', state: 'exception', committedQty: 900 }),
    mk({ key: 'C', materialCode: 'C', state: 'awaiting' }),
    mk({ key: 'D', materialCode: 'D', zone: 'firm', state: 'awaiting', dueAt: '2026-08-31T02:00:00.000Z' }),
    mk({ key: 'E', materialCode: 'A', state: 'accepted', committedQty: 950 }),
    mk({ key: 'F', materialCode: 'A', state: 'awaiting', dueAt: '2026-09-10T02:00:00.000Z', reminderAt: '2026-09-08T00:00:00.000Z' }),
    mk({ key: 'G', materialCode: 'G', zone: 'firm', state: 'exception', committedQty: 500 }),
  ];

  it('orders the exceptions and leaves out what needs no action', () => {
    expect(rankExceptions(lines, NOW, (code) => dos[code] ?? null).map((l) => l.key)).toEqual(['D', 'C', 'G', 'B', 'A']);
  });
});

describe('REQ-E06-03 BR-03 — cumulative commitment against cumulative forecast', () => {
  it('sums Firm and Trade-off periods in period order; an unanswered period adds no commitment', () => {
    const series = cumulativeCommitment([
      mk({ key: '2', periodBucket: '2026-09-14', periodStart: '2026-09-14', state: 'accepted', committedQty: 950 }),
      mk({ key: '1', periodBucket: '2026-09-07', periodStart: '2026-09-07', zone: 'firm', state: 'exception', committedQty: 800 }),
      mk({ key: '3', periodBucket: '2026-09-21', periodStart: '2026-09-21' }),
      mk({ key: '4', periodBucket: '2026-12', periodStart: '2026-11-30', zone: 'forecast', state: 'acknowledged' }),
    ]);
    expect(series).toEqual([
      { periodBucket: '2026-09-07', cumulativeForecast: 1000, cumulativeCommitment: 800 },
      { periodBucket: '2026-09-14', cumulativeForecast: 2000, cumulativeCommitment: 1750 },
      { periodBucket: '2026-09-21', cumulativeForecast: 3000, cumulativeCommitment: 1750 },
    ]);
  });
});

describe('REQ-E06-03 BR-05 — moving demand to another supplier', () => {
  const v = FORECAST_VERSION_SEED.find((p) => p.publicationId === 'FC-PK-V2')!;
  const move = { materialCode: 'PK-PETB-8802', periodBucket: SEEDED_PACKAGING_WEEKS[3], fromSupplierId: 'sup-007', toSupplierId: 'sup-012', note: 'Moulding line down' };

  it('known-good: the period’s quantity moves in a new version; the material × period total is unchanged', () => {
    const before = v.lines.find((l) => l.supplierId === 'sup-007' && l.materialCode === move.materialCode && l.periodBucket === move.periodBucket)!;
    const next = reassignVersion(v, move, '2026-08-31T12:00:00.000Z')!;
    expect(next).toMatchObject({ publicationId: 'FC-PK-V3', version: 3, changeNote: 'Moulding line down', publishedAt: '2026-08-31T12:00:00.000Z' });
    const period = (pub: typeof v) => pub.lines.filter((l) => l.materialCode === move.materialCode && l.periodBucket === move.periodBucket);
    expect(period(next).map((l) => [l.supplierId, l.forecastQty])).toEqual([['sup-012', before.forecastQty]]);
    expect(period(next)[0].commitmentClass).toBe(before.commitmentClass);
    expect(next.lines).toHaveLength(v.lines.length);
    // The earlier version is untouched (BR-06: every version is kept).
    expect(period(v).map((l) => l.supplierId)).toEqual(['sup-007']);
  });

  it('known-good: moving to a supplier that already has the period adds to its line', () => {
    const shared = { materialCode: 'PK-PETB-8801', periodBucket: SEEDED_PACKAGING_WEEKS[0], fromSupplierId: 'sup-012', toSupplierId: 'sup-007', note: 'x' };
    const qty = (pub: typeof v, s: string) => pub.lines.find((l) => l.supplierId === s && l.materialCode === shared.materialCode && l.periodBucket === shared.periodBucket)?.forecastQty;
    const next = reassignVersion(v, shared, '2026-08-31T12:00:00.000Z')!;
    expect(qty(next, 'sup-007')).toBe(qty(v, 'sup-007')! + qty(v, 'sup-012')!);
    expect(qty(next, 'sup-012')).toBeUndefined();
  });

  it('known-bad: the same supplier, or a period the supplier does not have, moves nothing', () => {
    expect(reassignVersion(v, { ...move, toSupplierId: 'sup-007' }, '2026-08-31T12:00:00.000Z')).toBeNull();
    expect(reassignVersion(v, { ...move, fromSupplierId: 'sup-012' }, '2026-08-31T12:00:00.000Z')).toBeNull();
  });
});

describe('REQ-E06-01 BR-06 — the changes between versions', () => {
  const [pk1, pk2] = FORECAST_VERSION_SEED.filter((p) => p.stream === 'packaging');

  it('lists moved, new and dropped periods for the supplier — never a period that simply rolled off', () => {
    const changes = versionChanges(pk2, pk1, 'sup-007');
    const find = (code: string, period: string) => changes.find((c) => c.materialCode === code && c.periodBucket === period);
    expect(find('PK-PETB-8802', SEEDED_PACKAGING_WEEKS[0])).toMatchObject({ kind: 'changed', previousQty: 38500, currentQty: 42400 });
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[3])).toMatchObject({ kind: 'changed', previousQty: 34300, currentQty: 30900 });
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[12])).toMatchObject({ kind: 'added', previousQty: null });
    expect(find('PK-PETB-8801', '2026-11')).toMatchObject({ kind: 'removed', currentQty: null });
    expect(find('PK-PETB-8801', '2026-08-24')).toBeUndefined(); // rolled off the start
    // An unchanged period is not listed; another supplier's periods are not listed.
    expect(find('PK-PETB-8801', SEEDED_PACKAGING_WEEKS[1])).toBeUndefined();
    expect(changes.every((c) => c.supplierId === 'sup-007')).toBe(true);
    expect(versionChanges(pk1, null)).toEqual([]);
  });
});

describe('REQ-E06-02 BR-06 — spreadsheet: download, template and row-by-row upload (CR-18)', () => {
  const lines = [
    mk({ key: 'a', periodBucket: '2026-09-07', periodStart: '2026-09-07', zone: 'firm', forecastQty: 34300 }),
    mk({ key: 'b', periodBucket: '2026-09-14', periodStart: '2026-09-14', forecastQty: 34300 }),
    mk({ key: 'c', periodBucket: '2026-10-26', periodStart: '2026-10-26', zone: 'forecast', forecastQty: 34300 }),
    mk({ key: 'd', materialCode: 'PK-PETB-8802', periodBucket: '2026-09-14', periodStart: '2026-09-14', forecastQty: 1500 }),
  ];
  const H = ['Material code', 'Period', 'Zone', 'Forecast quantity', 'Unit', 'Committed quantity', 'Commitment date (YYYY-MM-DD)', 'Upside quantity', 'Reason (capacity, material, logistics, quality, other)', 'Note'];
  const row = (...cells: string[]) => Object.fromEntries(H.map((h, i) => [h, cells[i] ?? '']));

  it('known-good: the template for the current version, untouched, uploads every row', () => {
    for (const lang of ['en', 'id'] as const) {
      const parsed = parseCsv(commitmentTemplateCsv(lines, lang));
      const { accepted, refused } = validateCommitmentRows(parsed.rows, lines);
      expect(refused).toEqual([]);
      expect(accepted.map((a) => a.kind)).toEqual(['commit', 'commit', 'acknowledge', 'commit']);
      expect(accepted[0]).toMatchObject({ committedQty: 34300, commitmentDate: '2026-09-07' });
    }
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
        row('PK-PETB-8802', '2026-09-14', '', '', 'PCS', '1400', '14/09/2026', '', 'capacity'), // 8 bad date
        row('PK-PETB-8802', '2026-09-14', '', '', 'KG', '1400', '2026-09-14'), // 9 unit
      ],
      lines,
    );
    expect(accepted.map((a) => [a.row, a.kind])).toEqual([[2, 'commit'], [6, 'acknowledge']]);
    expect(refused.map((r) => [r.row, r.reason])).toEqual([
      [3, 'reasonRequired'],
      [4, 'ambiguousNumber'],
      [5, 'notInForecast'],
      [7, 'duplicateRow'],
      [8, 'invalidDate'],
      [9, 'unitMismatch'],
    ]);
  });

  it('below forecast with a starter reason passes; "other" needs a note', () => {
    const ok = validateCommitmentRows([row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '2026-09-14', '2000', 'Capacity')], lines);
    expect(ok.accepted[0]).toMatchObject({ kind: 'commit', committedQty: 30000, upsideQty: 2000, reason: 'capacity' });
    const bad = validateCommitmentRows([row('PK-PETB-8801', '2026-09-14', '', '', 'PCS', '30000', '2026-09-14', '', 'other')], lines);
    expect(bad.refused.map((r) => r.reason)).toEqual(['noteRequired']);
  });

  it('AC-03 — the forecast download has a header and one row per material × period', () => {
    const csv = forecastCsv(
      lines,
      { materialCode: 'Material code', material: 'Material', period: 'Period', periodStart: 'Start', zone: 'Zone', forecastQty: 'Forecast', unit: 'Unit', previousQty: 'Previous', dueAt: 'Due' },
      (z) => z.toUpperCase(),
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
      mk({ key: '3', materialCode: 'M2', zone: 'tradeOff', state: 'revisionRequested', committedQty: 700 }),
      mk({ key: '4', materialCode: 'M3', zone: 'tradeOff', state: 'accepted', committedQty: 950 }),
      mk({ key: '5', materialCode: 'M4', zone: 'firm', state: 'acceptedByPlanner', committedQty: 500 }),
    ]);
    expect(subjects.map((s) => [s.materialCode, s.firm])).toEqual([['M1', true], ['M2', false]]);
    const conditions = deriveAlertConditions([], [], '2026-08-31T12:00:00.000Z', subjects);
    expect(conditions.map((c) => [c.key, c.riskClass])).toEqual([
      ['commitmentBelowForecast|M1|sup-007', 'high'],
      ['commitmentBelowForecast|M2|sup-007', 'medium'],
    ]);
  });
});

describe('REQ-E07-03 — the foresight answer a line gives the Order summary', () => {
  it('Confirmed, Gap, Awaiting, or Not required for a Forecast-zone period', () => {
    expect(foresightAnswerOf(mk({ key: '1', state: 'accepted' }))).toBe('confirmed');
    expect(foresightAnswerOf(mk({ key: '2', state: 'acceptedByPlanner' }))).toBe('confirmed');
    expect(foresightAnswerOf(mk({ key: '3', state: 'exception' }))).toBe('gap');
    expect(foresightAnswerOf(mk({ key: '4', state: 'revisionRequested' }))).toBe('gap');
    expect(foresightAnswerOf(mk({ key: '5', state: 'awaiting' }))).toBe('awaiting');
    expect(foresightAnswerOf(mk({ key: '6', zone: 'forecast', state: 'awaiting' }))).toBe('notRequired');
  });
});

describe('settings alignment', () => {
  it('the SDC coverage bands are CR-03’s (the one threshold set)', () => {
    expect(COVERAGE_AT_RISK_FLOOR).toBe(COVERAGE_THRESHOLDS.atRiskFrom);
  });
});
