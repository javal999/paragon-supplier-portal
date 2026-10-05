// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-02 (BL-99) — supplier reliability and PTI plan-change measures.
//
// The requirement's worked examples verbatim, a known-good AND a known-bad
// probe for every branch of the miss classifier, the partition (AC-01) over
// the synthetic dataset, and the dataset's calibration on the measures this
// module owns (never-confirmed the largest class; PTI changes inside lead time
// on 15–20% of schedules; confirmation identical to BL-102's derivation).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { MeasureWindow } from './reliability' */
import {
  DEFAULT_TOLERANCE_BAND,
  MISS_CLASSES,
  assessAll,
  assessLine,
  breachesToleranceBand,
  commitmentMeasure,
  isInsideLeadTime,
  isMissed,
  masc,
  missSplit,
  planChangeForMaterial,
  portfolioReliability,
  seasonalNaiveScale,
  supplierReliability,
  trailingWindow
} from './reliability';
/** @import { LineHistory } from './lines' */
import { confirmedByDeadline, lineHistories } from './lines';
/** @import { Confirmation, EngineDataset, PlanVersion, PoLine, Receipt, ScheduleChange } from './types' */
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { SDC_SIMULATED_NOW } from '../sdc/clock';
import { addDays, dayOf } from './dates';

// ── A line built by hand ────────────────────────────────────────────────────

const LT = 14;
/** @type {PoLine} */
const PO = {
  poNumber: 'T-PO-1',
  line: 10,
  supplierId: 'sup-A',
  materialCode: 'PK-PETB-8801',
  orderedQty: 8000,
  uom: 'PCS',
  requestedDate: '2026-10-10',
  createdAt: '2026-09-18T02:00:00.000Z',
  confirmDeadline: '2026-09-21T02:00:00.000Z'
};
const AS_OF = '2026-10-31T12:00:00.000Z';
/** @type {MeasureWindow} */
const WINDOW = { from: '2026-09-01', to: '2026-10-31', asOf: AS_OF };

/**
 * @param {number} qty
 * @param {string} date
 * @param {string} at
 * @returns {Confirmation}
 */
const conf = (qty, date, at) => ({
  poNumber: PO.poNumber,
  line: PO.line,
  confirmedQty: qty,
  confirmedDate: date,
  confirmedAt: at
});
/**
 * @param {number} qty
 * @param {string} date
 * @returns {Receipt}
 */
const rec = (qty, date, n = 1) => ({
  grNumber: `T-GR-${n}`,
  poNumber: PO.poNumber,
  line: PO.line,
  receivedQty: qty,
  receivedDate: date
});
/**
 * @param {number} from
 * @param {number} to
 * @param {string} at
 * @returns {ScheduleChange}
 */
const qtyChange = (from, to, at) => ({
  poNumber: PO.poNumber,
  line: PO.line,
  at,
  field: 'quantity',
  from,
  to,
  by: 'PTI'
});
/**
 * @param {Partial<LineHistory>} [over]
 * @param {Partial<PoLine>} [po]
 * @returns {LineHistory}
 */
const line = (over = {}, po = {}) => ({
  line: { ...PO, ...po },
  changes: [],
  confirmations: [],
  receipts: [],
  ...over
});
/** @param {LineHistory} h */
const assess = (h) => assessLine(h, LT, AS_OF);

// ── The requirement's worked examples ───────────────────────────────────────

describe('REQ-E14-02 — the worked examples, verbatim', () => {
  it('commitment reliability: committed 10,000 by 10 October; 6,000 on 9 October and 4,000 on 14 October → 60%', () => {
    const h = line(
      {
        confirmations: [conf(10_000, '2026-10-10', '2026-09-18T05:00:00.000Z')],
        receipts: [rec(6000, '2026-10-09', 1), rec(4000, '2026-10-14', 2)]
      },
      { orderedQty: 10_000 }
    );
    const m = commitmentMeasure([{ a: assess(h), h }], WINDOW);
    expect(m.committedQty).toBe(10_000);
    expect(m.onTimeQty).toBe(6000);
    expect(m.rate).toBe(0.6);
  });

  // PO 8,000; on 3 October, inside the 14-day lead time, PTI raised it to 10,000.
  /** @param {boolean} reconfirmed */
  const raised = (reconfirmed) =>
    line({
      confirmations: [
        conf(8000, '2026-10-10', '2026-09-18T05:00:00.000Z'),
        ...(reconfirmed ? [conf(10_000, '2026-10-10', '2026-10-04T03:00:00.000Z')] : [])
      ],
      changes: [qtyChange(8000, 10_000, '2026-10-03T03:00:00.000Z')],
      receipts: [rec(6000, '2026-10-09', 1), rec(4000, '2026-10-14', 2)]
    });

  it('the supplier re-confirmed 10,000 on 4 October: the late 4,000 is SUPPLIER-caused (BR-04)', () => {
    const a = assess(raised(true));
    expect(isInsideLeadTime('2026-10-03T03:00:00.000Z', '2026-10-10', LT)).toBe(true);
    expect(isMissed(a, AS_OF)).toBe(true);
    expect(a.branch).toBe('supplierCaused');
    expect(a.basisQty).toBe(10_000);
    expect(a.onTimeQty).toBe(6000);
  });

  it('had the supplier not re-confirmed, the line is PTI-caused', () => {
    const a = assess(raised(false));
    expect(isMissed(a, AS_OF)).toBe(true);
    expect(a.branch).toBe('ptiCaused');
  });

  it('share of schedules changed inside lead time: 9 of 50 → 18%', () => {
    /** @type {PoLine[]} */
    const lines = Array.from({ length: 50 }, (_, i) => ({ ...PO, poNumber: `T-PO-${i + 1}` }));
    /** @type {ScheduleChange[]} */
    const changes = lines.slice(0, 9).map((l) => ({
      ...qtyChange(8000, 8400, '2026-10-03T03:00:00.000Z'),
      poNumber: l.poNumber
    }));
    /** @type {EngineDataset} */
    const data = {
      provenance: { liveness: 'SIMULATED', generator: 'synthetic', seed: 0, present: '2026-10-31' },
      materials: [{ materialCode: PO.materialCode, kind: 'packaging', uom: 'PCS' }],
      finishedGoods: [],
      sales: [],
      bom: [],
      sources: [
        {
          materialCode: PO.materialCode,
          supplierId: 'sup-A',
          leadTimeDays: LT,
          moq: 1000,
          orderMultiple: 1000,
          share: 1
        }
      ],
      warehouses: [],
      volumes: [],
      stock: [],
      cycleCounts: [],
      poLines: lines,
      scheduleChanges: changes,
      confirmations: [],
      receipts: [],
      planVersions: [],
      fgPlan: [],
      salesOrders: [],
      sapSafetyStock: [],
      materialValues: []
    };
    const [row] = supplierReliability(data, WINDOW);
    expect(row.planChange.schedules).toBe(50);
    expect(row.planChange.changedInsideLeadTime).toBe(9);
    expect(row.planChange.share).toBe(0.18);
    // No plan history and no sales: MASC has nothing to measure — null, never 0.
    expect(row.planChange.masc).toBeNull();
  });

  it('MASC: weeks 5–8 moved 1,000/1,200/1,100/900 → 1,000/1,500/1,100/700; mean change 125 ÷ normal movement 250 = 0.5', () => {
    const prev = new Map([
      ['w5', 1000],
      ['w6', 1200],
      ['w7', 1100],
      ['w8', 900]
    ]);
    const next = new Map([
      ['w5', 1000],
      ['w6', 1500],
      ['w7', 1100],
      ['w8', 700]
    ]);
    expect(masc(prev, next, 250)).toBe(0.5);
  });

  it('MASC-I measures against the FIRST version the supplier saw, not the last step', () => {
    /**
     * @param {number} versionNo
     * @param {string} periodBucket
     * @param {number} quantity
     * @returns {PlanVersion}
     */
    const v = (versionNo, periodBucket, quantity) => ({
      supplierId: 'sup-A',
      materialCode: PO.materialCode,
      periodBucket,
      versionNo,
      publishedAt: `2026-10-0${versionNo}T02:00:00.000Z`,
      quantity
    });
    // Week W drifts 1,000 → 1,100 → 1,200: each step is 100, the total drift 200.
    const versions = [v(1, 'W', 1000), v(2, 'W', 1100), v(3, 'W', 1200)];
    const r = planChangeForMaterial(versions, 100, WINDOW);
    expect(r.masc).toEqual([1, 1]);
    expect(r.mascI).toBe(2);
  });
});

// ── The MASC scale ──────────────────────────────────────────────────────────

describe('REQ-E14-02 — the MASC scale is the in-sample seasonal-naive MAE', () => {
  it('two seasons of a series that moves by exactly 250 a season → 250', () => {
    const season = Array.from({ length: 52 }, (_, i) => 1000 + i);
    const series = [...season, ...season.map((x) => x + 250)];
    expect(seasonalNaiveScale(series)).toBe(250);
  });

  it('refuses to scale: one season only, or no seasonal movement → null (MASC then null, never 0)', () => {
    expect(seasonalNaiveScale(Array.from({ length: 52 }, () => 5))).toBeNull();
    expect(seasonalNaiveScale(Array.from({ length: 104 }, () => 5))).toBeNull();
    expect(masc(new Map([['w', 1]]), new Map([['w', 2]]), null)).toBeNull();
  });
});

// ── Every classifier branch, probed both ways ───────────────────────────────

describe('REQ-E14-02 BR-03 — each class, a known-good and a known-bad probe', () => {
  const onTimeConf = conf(8000, '2026-10-10', '2026-09-18T05:00:00.000Z');

  it('never confirmed: no confirmation → never confirmed; a confirmation after the deadline → still never confirmed', () => {
    const none = assess(line({ receipts: [rec(8000, '2026-10-15')] }));
    expect(none.branch).toBe('neverConfirmed');
    expect(isMissed(none, AS_OF)).toBe(true);
    const late = line({
      confirmations: [conf(8000, '2026-10-10', '2026-09-22T05:00:00.000Z')],
      receipts: [rec(8000, '2026-10-15')]
    });
    expect(confirmedByDeadline(late)).toBe(false);
    expect(assess(late).branch).toBe('neverConfirmed');
  });

  it('never confirmed — known-good: confirmed by the deadline is NOT never-confirmed', () => {
    const h = line({ confirmations: [onTimeConf], receipts: [rec(8000, '2026-10-15')] });
    expect(confirmedByDeadline(h)).toBe(true);
    expect(assess(h).branch).not.toBe('neverConfirmed');
  });

  it('supplier-caused: confirmed, unchanged, received late → supplier; received on time → not missed at all', () => {
    const late = assess(line({ confirmations: [onTimeConf], receipts: [rec(8000, '2026-10-12')] }));
    expect(late.branch).toBe('supplierCaused');
    expect(isMissed(late, AS_OF)).toBe(true);
    const onTime = assess(
      line({ confirmations: [onTimeConf], receipts: [rec(8000, '2026-10-10')] })
    );
    expect(isMissed(onTime, AS_OF)).toBe(false);
  });

  it('PTI-caused — inside the lead time without re-confirmation → PTI; the same change OUTSIDE the lead time and inside the band → supplier', () => {
    const inside = line({
      confirmations: [onTimeConf],
      changes: [qtyChange(8000, 8400, '2026-10-01T03:00:00.000Z')],
      receipts: [rec(8000, '2026-10-10')]
    });
    expect(assess(inside).branch).toBe('ptiCaused');
    expect(isMissed(assess(inside), AS_OF)).toBe(true);
    const outside = line({
      confirmations: [onTimeConf],
      changes: [qtyChange(8000, 8400, '2026-09-24T03:00:00.000Z')],
      receipts: [rec(8000, '2026-10-10')]
    });
    expect(isInsideLeadTime('2026-09-24T03:00:00.000Z', '2026-10-10', LT)).toBe(false);
    expect(assess(outside).branch).toBe('supplierCaused');
    // Outside the lead time the supplier absorbs a change within the band: measured against 8,400.
    expect(assess(outside).basisQty).toBe(8400);
  });

  it('PTI-caused — beyond ±10% per version (ENG-D8) outside the lead time → PTI; within it → supplier', () => {
    const breach = line({
      confirmations: [onTimeConf],
      changes: [qtyChange(8000, 9000, '2026-09-24T03:00:00.000Z')],
      receipts: [rec(8000, '2026-10-10')]
    });
    expect(breachesToleranceBand(8000, 9000, 8000)).toBe(true);
    expect(assess(breach).branch).toBe('ptiCaused');
    expect(breachesToleranceBand(8000, 8800, 8000)).toBe(false); // exactly 10% is inside
  });

  it('PTI-caused — beyond the ±20% cumulative cap even when every step is inside ±10%', () => {
    // 8,000 → 8,720 → 9,504 → 10,360: each step +9%, the total +29.5%.
    expect(breachesToleranceBand(8000, 8720, 8000)).toBe(false);
    expect(breachesToleranceBand(8720, 9504, 8000)).toBe(false); // +18.8% total
    expect(breachesToleranceBand(9504, 10_360, 8000)).toBe(true); // +29.5% total
    const drift = line({
      confirmations: [onTimeConf],
      changes: [
        qtyChange(8000, 8720, '2026-09-22T03:00:00.000Z'),
        qtyChange(8720, 9504, '2026-09-23T03:00:00.000Z'),
        qtyChange(9504, 10_360, '2026-09-24T03:00:00.000Z')
      ],
      receipts: [rec(8000, '2026-10-10')]
    });
    expect(assess(drift).branch).toBe('ptiCaused');
    const twoSteps = line({ ...drift, changes: drift.changes.slice(0, 2) });
    expect(assess(twoSteps).branch).toBe('supplierCaused');
  });

  it('the band itself is the owner’s: ±10% per version, ±20% cumulative', () => {
    expect(DEFAULT_TOLERANCE_BAND).toEqual({ perVersion: 0.1, cumulative: 0.2 });
  });

  it('inside lead time is strictly "less than lead-time days before the requested date then in force"', () => {
    expect(isInsideLeadTime('2026-09-26T03:00:00.000Z', '2026-10-10', LT)).toBe(false); // 14 days before
    expect(isInsideLeadTime('2026-09-27T03:00:00.000Z', '2026-10-10', LT)).toBe(true); // 13 days before
  });

  it('a line PTI cancelled inside the lead time is PTI-caused and excluded from the supplier’s reliability', () => {
    const h = line({
      confirmations: [onTimeConf],
      changes: [qtyChange(8000, 0, '2026-10-05T03:00:00.000Z')]
    });
    const a = assess(h);
    expect(a.cancelledInsideLeadTime).toBe(true);
    expect(a.branch).toBe('ptiCaused');
    expect(isMissed(a, AS_OF)).toBe(true);
    expect(commitmentMeasure([{ a, h }], WINDOW).lines).toBe(0);
  });

  it('a partial confirmation (8,000 of 10,000) is a commitment for 8,000: delivering 8,000 on time is not a miss', () => {
    const h = line(
      {
        confirmations: [conf(8000, '2026-10-10', '2026-09-18T05:00:00.000Z')],
        receipts: [rec(8000, '2026-10-10')]
      },
      { orderedQty: 10_000 }
    );
    const a = assess(h);
    expect(isMissed(a, AS_OF)).toBe(false);
    expect(commitmentMeasure([{ a, h }], WINDOW).rate).toBe(1);
  });

  it('a line not yet due is not a miss', () => {
    const a = assessLine(line({ confirmations: [onTimeConf] }), LT, '2026-10-05T00:00:00.000Z');
    expect(isMissed(a, '2026-10-05T00:00:00.000Z')).toBe(false);
  });
});

// ── AC-01 and the calibration, on the synthetic dataset ─────────────────────

describe('REQ-E14-02 on the synthetic dataset (BL-102 calibration, measured by BL-99)', () => {
  const data = engineDataset();
  const w = trailingWindow(SDC_SIMULATED_NOW, 26);
  const rows = supplierReliability(data, w);
  const total = portfolioReliability(rows);

  it('examined something: every supplier in the dataset has a row, and misses exist in every class', () => {
    expect(rows.map((r) => r.supplierId)).toContain('sup-007');
    expect(rows.map((r) => r.supplierId)).not.toContain('sup-999');
    for (const c of MISS_CLASSES) expect(total.misses[c]).toBeGreaterThan(0);
  });

  it('AC-01 — every missed line has exactly one class, and the classes add up to all misses', () => {
    const assessed = assessAll(data, w.asOf).map((x) => x.a);
    const missed = assessed.filter(
      (a) => a.basisDate >= w.from && a.basisDate <= w.to && isMissed(a, w.asOf)
    );
    for (const a of missed) expect(MISS_CLASSES.filter((c) => c === a.branch)).toHaveLength(1);
    const split = missSplit(assessed, w);
    expect(split.total).toBe(missed.length);
    expect(split.neverConfirmed + split.ptiCaused + split.supplierCaused).toBe(split.total);
    for (const r of rows) {
      expect(r.misses.neverConfirmed + r.misses.ptiCaused + r.misses.supplierCaused).toBe(
        r.misses.total
      );
    }
  });

  it('never confirmed is the LARGEST class of missed line — and relabelling it away makes it not', () => {
    const m = total.misses;
    expect(m.neverConfirmed).toBeGreaterThan(m.supplierCaused);
    expect(m.neverConfirmed).toBeGreaterThan(m.ptiCaused);
    // Known-bad: the same data with every line confirmed on time loses the class entirely.
    /** @type {EngineDataset} */
    const allConfirmed = {
      ...data,
      confirmations: lineHistories(data).map((h) => ({
        poNumber: h.line.poNumber,
        line: h.line.line,
        confirmedQty: h.line.orderedQty,
        confirmedDate: h.line.requestedDate,
        confirmedAt: h.line.createdAt
      }))
    };
    expect(portfolioReliability(supplierReliability(allConfirmed, w)).misses.neverConfirmed).toBe(
      0
    );
  });

  it('PTI changed inside the lead time on 15–20% of schedules — and a PTI that never changes leaves the band', () => {
    expect(
      /** @type {NonNullable<typeof total.planChange.share>} */ (total.planChange.share)
    ).toBeGreaterThanOrEqual(0.15);
    expect(
      /** @type {NonNullable<typeof total.planChange.share>} */ (total.planChange.share)
    ).toBeLessThanOrEqual(0.2);
    const stable = { ...data, scheduleChanges: [] };
    expect(portfolioReliability(supplierReliability(stable, w)).planChange.share).toBe(0);
  });

  it('the confirmation rate is the owner’s ≈ 67% (±3 pts), and equals BL-102’s own derivation', () => {
    const rate = /** @type {NonNullable<typeof total.confirmation.rate>} */ (
      total.confirmation.rate
    );
    expect(rate).toBeGreaterThanOrEqual(0.64);
    expect(rate).toBeLessThanOrEqual(0.7);
    const due = lineHistories(data).filter(
      (h) => h.line.confirmDeadline <= w.asOf && dayOf(h.line.confirmDeadline) >= w.from
    );
    expect(rate).toBe(due.filter(confirmedByDeadline).length / due.length);
  });

  it('suppliers differ: some good, some bad', () => {
    const rates = rows
      .map((r) => /** @type {NonNullable<typeof r.confirmation.rate>} */ (r.confirmation.rate))
      .filter((x) => x !== null);
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(0.25);
  });

  it('MASC is measured for suppliers with plan history, and is a scaled number, not a raw quantity', () => {
    const measured = rows.filter((r) => r.planChange.masc !== null);
    expect(measured.length).toBeGreaterThan(0);
    for (const r of measured) {
      expect(
        /** @type {NonNullable<typeof r.planChange.masc>} */ (r.planChange.masc)
      ).toBeGreaterThan(0);
      expect(/** @type {NonNullable<typeof r.planChange.masc>} */ (r.planChange.masc)).toBeLessThan(
        10
      );
    }
  });

  it('nothing after the window’s instant counts', () => {
    const early = trailingWindow(
      addDays(dayOf(SDC_SIMULATED_NOW), -70) + SDC_SIMULATED_NOW.slice(10),
      13
    );
    const r = portfolioReliability(supplierReliability(data, early));
    expect(r.confirmation.due).toBeGreaterThan(0);
    expect(r.confirmation.due).toBeLessThan(total.confirmation.due);
  });
});
