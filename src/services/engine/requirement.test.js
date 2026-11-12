// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-03 — material requirement (METHOD-SPEC M1, M2).
//
// The requirement's worked example VERBATIM, run end to end through the same
// function the Hub serves (and through its parts); AC-01 reconciliation over
// every material × week of the synthetic run; AC-02 (unconfirmed lines) and
// AC-03 (traceability) each with a known-good and a known-bad probe; shared
// packaging summing; the BOM-cycle refusal; forecast consumption; the
// stock-accuracy flag; late to release; yield beside scrap (BR-03, BL-115).
//
// Material codes are real MATERIAL_MASTER codes (PK-CART-9901 stands in for
// the example's bullet case BC-220); finished goods are synthetic SYN-FG ids.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { MaterialRequirementOptions } from './requirement' */
import {
  consumeForecast,
  defaultRequirementOptions,
  explode,
  interimOrderSize,
  lowLevelCodes,
  materialRequirement,
  netMaterial,
  openReceipts
} from './requirement';
import { componentFactor, grossRequirement } from './bom';
import { addDays, isoWeek } from './dates';
import { lineHistories } from './lines';
/** @import { BomLine, EngineDataset, FgPlanSnapshot } from './types' */
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { isKnownMaterial } from '../sdc/materialMaster';
import { SSTP } from '../data/mock/fixtures/walkthroughSstp';

// ── The worked example as a dataset ─────────────────────────────────────────

const MAT = 'PK-CART-9901';
const WEEK1 = '2027-01-04'; // ISO week 1 of 2027
const WEEK10 = '2027-03-08';
const WEEK6 = '2027-02-08';
const SKUS = /** @type {const} */ (['SYN-FG-001', 'SYN-FG-002', 'SYN-FG-003']);

/**
 * @param {string} parent
 * @param {string} component
 * @returns {BomLine}
 */
const bomLine = (parent, component, qtyPer = 1, scrapPct = 0.02, yieldPct = 1) => ({
  parentCode: parent,
  componentCode: component,
  qtyPer,
  uom: 'PCS',
  scrapPct,
  yieldPct,
  validFrom: '2020-01-06'
});

/**
 * @param {{ counted?: number }} [over]
 * @returns {EngineDataset}
 */
function example(over = {}) {
  /** @type {FgPlanSnapshot[]} */
  const plan = [
    { skuCode: SKUS[0], madeAt: WEEK1, weekStart: WEEK10, quantity: 8000 },
    { skuCode: SKUS[1], madeAt: WEEK1, weekStart: WEEK10, quantity: 7000 },
    { skuCode: SKUS[2], madeAt: WEEK1, weekStart: WEEK10, quantity: 5000 }
  ];
  return {
    provenance: { liveness: 'SIMULATED', generator: 'synthetic', seed: 1, present: WEEK1 },
    materials: [{ materialCode: MAT, kind: 'packaging', uom: 'PCS', materialGroup: 'MG-23' }],
    finishedGoods: SKUS.map((skuCode) => ({
      skuCode,
      name: skuCode,
      brand: 'Wardah',
      category: 'Skincare',
      launchDate: '2020-01-06'
    })),
    sales: [],
    bom: SKUS.map((s) => bomLine(s, MAT)),
    sources: [
      {
        materialCode: MAT,
        supplierId: 'sup-007',
        leadTimeDays: 28,
        moq: 10_000,
        orderMultiple: 5_000,
        share: 1
      }
    ],
    warehouses: [{ warehouseId: 'WH', kind: 'packaging', capacityPallets: 100 }],
    volumes: [{ materialCode: MAT, unitsPerPallet: 1000 }],
    stock: [{ materialCode: MAT, warehouseId: 'WH', date: WEEK1, onHandQty: 5000 }],
    cycleCounts: [
      {
        materialCode: MAT,
        warehouseId: 'WH',
        countDate: WEEK1,
        systemQty: 5000,
        countedQty: over.counted ?? 5000
      }
    ],
    poLines: [
      // Confirmed by Supplier A: 6,000 in week 10.
      {
        poNumber: 'T-PO-1',
        line: 10,
        supplierId: 'sup-007',
        materialCode: MAT,
        orderedQty: 6000,
        uom: 'PCS',
        requestedDate: '2027-03-09',
        createdAt: '2027-01-04T02:00:00.000Z',
        confirmDeadline: '2027-01-05T02:00:00.000Z'
      },
      // Never confirmed: 4,000 requested in week 10.
      {
        poNumber: 'T-PO-2',
        line: 10,
        supplierId: 'sup-007',
        materialCode: MAT,
        orderedQty: 4000,
        uom: 'PCS',
        requestedDate: '2027-03-09',
        createdAt: '2027-01-04T02:00:00.000Z',
        confirmDeadline: '2027-01-05T02:00:00.000Z'
      }
    ],
    scheduleChanges: [],
    confirmations: [
      {
        poNumber: 'T-PO-1',
        line: 10,
        confirmedQty: 6000,
        confirmedDate: '2027-03-10',
        confirmedAt: '2027-01-04T08:00:00.000Z'
      }
    ],
    receipts: [],
    planVersions: [],
    fgPlan: plan,
    salesOrders: [],
    sapSafetyStock: [{ materialCode: MAT, quantity: 3000 }],
    materialValues: [{ materialCode: MAT, unitValueIdr: 2500 }]
  };
}

/**
 * @param {string} asOf
 * @param {Partial<MaterialRequirementOptions>} [over]
 * @returns {MaterialRequirementOptions}
 */
const opts = (asOf, over = {}) => ({
  ...defaultRequirementOptions(asOf),
  horizonWeeks: 10,
  safetyStock: new Map([[MAT, { quantity: 3000, source: /** @type {const} */ ('engine') }]]),
  ...over
});

/**
 * @param {EngineDataset} d
 * @param {MaterialRequirementOptions} o
 * @param {string} w
 */
const week = (d, o, w) =>
  /** @type {import('./requirement').MaterialWeek} */ (
    materialRequirement(d, o).materials[0].weeks.find((x) => x.weekStart === w)
  );

describe('REQ-E14-03 — the worked example, verbatim (BC-220 in week 10)', () => {
  it('step 1: gross = 20,000 × 1 case × 1.02 = 20,400, from 3 SKUs', () => {
    const w = week(example(), opts(WEEK1), WEEK10);
    expect(w.gross).toBeCloseTo(20_400, 9);
    expect(new Set(w.pegs.map((p) => p.skuCode))).toEqual(new Set(SKUS));
  });

  it('step 2: net = 20,400 + 3,000 − (5,000 + 6,000) = 12,400', () => {
    const w = week(example(), opts(WEEK1), WEEK10);
    expect(w.projectedStart).toBe(5000);
    expect(w.receipts).toBe(6000);
    expect(w.safetyStock).toBe(3000);
    expect(w.net).toBeCloseTo(12_400, 9);
  });

  it('step 3: MOQ 10,000, multiple 5,000 → planned order 15,000', () => {
    expect(week(example(), opts(WEEK1), WEEK10).plannedReceipt).toBe(15_000);
    expect(interimOrderSize(12_400, 10_000, 5_000)).toBe(15_000);
  });

  it('step 4: release week = week 10 − 4 weeks = week 6', () => {
    const w = week(example(), opts(WEEK1), WEEK10);
    expect(isoWeek(WEEK10)).toBe(10);
    expect(w.releaseWeek).toBe(WEEK6);
    expect(isoWeek(/** @type {NonNullable<typeof w.releaseWeek>} */ (w.releaseWeek))).toBe(6);
    expect(w.lateToRelease).toBe(false);
  });

  it('step 5: projected end = 5,000 + 6,000 + 15,000 − 20,400 = 5,600, above the safety stock of 3,000', () => {
    const w = week(example(), opts(WEEK1), WEEK10);
    expect(w.projectedEnd).toBeCloseTo(5_600, 9);
    expect(w.projectedEnd).toBeGreaterThan(w.safetyStock);
  });

  it('the netting step alone gives the same figures (no hidden input)', () => {
    const [row] = netMaterial({
      weeks: [WEEK10],
      currentWeek: WEEK1,
      startStock: 5000,
      gross: new Map([[WEEK10, 20_400]]),
      receipts: new Map([[WEEK10, 6000]]),
      safetyStock: 3000,
      leadTimeDays: 28,
      safetyLeadTimeDays: 0,
      moq: 10_000,
      orderMultiple: 5_000
    });
    expect([row.net, row.plannedReceipt, row.releaseWeek, row.projectedEnd]).toEqual([
      12_400,
      15_000,
      WEEK6,
      5_600
    ]);
  });

  it('a safety lead time moves the release earlier (BR-05, M7): 28 + 3 days → 5 weeks ahead', () => {
    const [row] = netMaterial({
      weeks: [WEEK10],
      currentWeek: WEEK1,
      startStock: 5000,
      gross: new Map([[WEEK10, 20_400]]),
      receipts: new Map([[WEEK10, 6000]]),
      safetyStock: 3000,
      leadTimeDays: 28,
      safetyLeadTimeDays: 3,
      moq: 10_000,
      orderMultiple: 5_000
    });
    expect(row.releaseWeek).toBe(addDays(WEEK10, -35));
  });
});

describe('REQ-E14-03 — late to release (edge case)', () => {
  it('known-bad: run in week 7, the week-6 release is late, with its shortfall week — not moved', () => {
    const asOf = '2027-02-15';
    const w = week(example(), opts(asOf), WEEK10);
    expect(w.releaseWeek).toBe(WEEK6);
    expect(w.lateToRelease).toBe(true);
    expect(w.weekStart).toBe(WEEK10);
    expect(materialRequirement(example(), opts(asOf)).materials[0].totals.lateToRelease).toBe(1);
  });

  it('known-good: run in week 6 itself, releasing now is not late', () => {
    expect(week(example(), opts(WEEK6), WEEK10).lateToRelease).toBe(false);
  });
});

// ── AC-01 · reconciliation over the synthetic run ───────────────────────────

describe('REQ-E14-03 AC-01 — every material × week reconciles by the formula', () => {
  const data = engineDataset();
  const ss = new Map(
    data.sapSafetyStock.map((s) => [
      s.materialCode,
      { quantity: s.quantity, source: /** @type {const} */ ('sapPlaceholder') }
    ])
  );
  const run = materialRequirement(data, {
    ...defaultRequirementOptions(data.provenance.present),
    safetyStock: ss
  });

  it('examined something: every master material, 26 weeks, some positive net requirement', () => {
    expect(run.materials.map((m) => m.materialCode)).toEqual(
      data.materials.map((m) => m.materialCode).sort()
    );
    for (const m of run.materials) expect(isKnownMaterial(m.materialCode)).toBe(true);
    expect(run.weeks.length).toBe(26);
    expect(run.planMadeAt).toBe(data.provenance.present);
    expect(run.materials.filter((m) => m.totals.net > 0).length).toBeGreaterThan(0);
    expect(run.sizing).toBe('interim');
  });

  it('gross, stock, receipts, safety stock, net and planned order reconcile, week by week', () => {
    let checked = 0;
    for (const m of run.materials) {
      let prevEnd = m.startStock;
      for (const w of m.weeks) {
        expect(w.projectedStart).toBeCloseTo(prevEnd, 6);
        expect(w.net).toBeCloseTo(
          Math.max(0, w.gross + w.safetyStock - (w.projectedStart + w.receipts)),
          6
        );
        expect(w.projectedEnd).toBeCloseTo(
          w.projectedStart + w.receipts + w.plannedReceipt - w.gross,
          6
        );
        if (w.plannedReceipt > 0) {
          expect(w.plannedReceipt).toBeGreaterThanOrEqual(w.net);
          expect(w.plannedReceipt).toBeGreaterThanOrEqual(m.moq);
          expect(w.plannedReceipt % m.orderMultiple).toBe(0);
          // Covered: the order lifts the week back to the safety stock.
          expect(w.projectedEnd).toBeGreaterThanOrEqual(w.safetyStock - 1e-6);
        } else {
          expect(w.net).toBe(0);
        }
        prevEnd = w.projectedEnd;
        checked += 1;
      }
    }
    expect(checked).toBe(run.materials.length * 26);
  });

  it('the reconciliation is not vacuous: a tampered net fails the same formula', () => {
    const w = /** @type {import('./requirement').MaterialWeek} */ (
      /** @type {import('./requirement').MaterialPlan} */ (
        run.materials.find((m) => m.totals.net > 0)
      ).weeks.find((x) => x.net > 0)
    );
    const tampered = w.net + 1;
    expect(
      Math.abs(tampered - Math.max(0, w.gross + w.safetyStock - (w.projectedStart + w.receipts)))
    ).toBeGreaterThan(0.5);
  });

  it('a material whose latest cycle count failed the 2% check is marked for review (E14-01 BR-03), and a looser tolerance clears it', () => {
    const flagged = run.materials.filter((m) => m.reviewRequired);
    expect(flagged.length).toBeGreaterThan(0);
    const loose = materialRequirement(data, {
      ...defaultRequirementOptions(data.provenance.present),
      stockAccuracyTolerance: 1
    });
    // The E2E walkthrough material has no engine stock record at all (it is
    // added after generation), so it stays flagged whatever the tolerance.
    expect(loose.materials.filter((m) => m.reviewRequired).map((m) => m.materialCode)).toEqual([
      SSTP.materialCode
    ]);
  });
});

// ── AC-02 · unconfirmed lines ───────────────────────────────────────────────

describe('REQ-E14-03 AC-02 — an unconfirmed line counts only when the planner includes it, and is then marked', () => {
  it('excluded by default: only the confirmed 6,000 is a receipt', () => {
    const w = week(example(), opts(WEEK1), WEEK10);
    expect(w.receipts).toBe(6000);
    expect(w.unconfirmedReceipts).toBe(0);
    expect(
      materialRequirement(example(), opts(WEEK1)).materials[0].receipts.map((r) => r.poNumber)
    ).toEqual(['T-PO-1']);
  });

  it('included: +4,000 at the requested date, marked unconfirmed, and the net falls by it', () => {
    const o = opts(WEEK1, { receipts: { includeUnconfirmed: true, overdueGraceDays: 14 } });
    const w = week(example(), o, WEEK10);
    expect(w.receipts).toBe(10_000);
    expect(w.unconfirmedReceipts).toBe(4000);
    expect(w.net).toBeCloseTo(8_400, 9);
    const marked = /** @type {import('./requirement').OpenReceipt} */ (
      materialRequirement(example(), o).materials[0].receipts.find((r) => r.poNumber === 'T-PO-2')
    );
    expect(marked.confirmed).toBe(false);
    expect(marked.date).toBe('2027-03-09');
  });

  it('on the synthetic data: unconfirmed open lines exist, none is counted by default', () => {
    const data = engineDataset();
    const asOf = data.provenance.present;
    const off = openReceipts(lineHistories(data), asOf);
    const on = openReceipts(lineHistories(data), asOf, {
      includeUnconfirmed: true,
      overdueGraceDays: 14
    });
    expect(off.every((r) => r.confirmed)).toBe(true);
    expect(on.filter((r) => !r.confirmed).length).toBeGreaterThan(0);
  });

  it('a receipt nets at the CONFIRMED date and quantity, not the requested ones', () => {
    const d = example();
    /** @type {EngineDataset} */
    const moved = {
      ...d,
      confirmations: [{ ...d.confirmations[0], confirmedQty: 5000, confirmedDate: '2027-03-17' }]
    };
    const run = materialRequirement(moved, opts(WEEK1, { horizonWeeks: 12 }));
    const r = run.materials[0].receipts[0];
    expect([r.quantity, r.date, r.weekStart]).toEqual([5000, '2027-03-17', '2027-03-15']);
    expect(
      /** @type {import('./requirement').MaterialWeek} */ (
        run.materials[0].weeks.find((w) => w.weekStart === WEEK10)
      ).receipts
    ).toBe(0);
  });
});

// ── AC-03 · traceability ────────────────────────────────────────────────────

describe('REQ-E14-03 AC-03 — every gross requirement traces to the finished goods behind it', () => {
  it('on the synthetic run, the pegs of every material × week sum to its gross, and each names a finished good whose BOM holds the material', () => {
    const data = engineDataset();
    const run = materialRequirement(data, defaultRequirementOptions(data.provenance.present));
    const parents = /** @type {Map<string, Set<string>>} */ (new Map());
    for (const b of data.bom)
      parents.set(b.componentCode, (parents.get(b.componentCode) ?? new Set()).add(b.parentCode));
    let traced = 0;
    for (const m of run.materials) {
      for (const w of m.weeks) {
        expect(w.pegs.reduce((s, p) => s + p.quantity, 0)).toBeCloseTo(w.gross, 6);
        for (const p of w.pegs) expect(parents.get(m.materialCode)?.has(p.skuCode)).toBe(true);
        if (w.gross > 0) traced += 1;
      }
    }
    expect(traced).toBeGreaterThan(100);
  });

  it('shared packaging: two finished goods on one material — the gross is their sum, each part kept', () => {
    const g = explode(
      [
        { skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 1000 },
        { skuCode: 'SYN-FG-002', weekStart: WEEK10, quantity: 500 }
      ],
      [bomLine('SYN-FG-001', MAT, 1, 0.02), bomLine('SYN-FG-002', MAT, 1, 0.04)],
      (c) => c === MAT
    );
    const cell = /** @type {import('./requirement').GrossCell} */ (
      /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get(MAT)).get(WEEK10)
    );
    expect(cell.quantity).toBeCloseTo(1000 * 1.02 + 500 * 1.04, 9);
    expect(cell.pegs.map((p) => [p.skuCode, p.fgQuantity, Math.round(p.quantity)])).toEqual([
      ['SYN-FG-001', 1000, 1020],
      ['SYN-FG-002', 500, 520]
    ]);
  });

  it('a bulk between finished good and material passes its gross on, and the peg still names the finished good', () => {
    const g = explode(
      [{ skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 1000 }],
      [
        bomLine('SYN-FG-001', 'SYN-BULK-01', 0.05, 0),
        bomLine('SYN-BULK-01', 'RM-EMUL-9410', 0.2, 0.01)
      ],
      (c) => c === 'RM-EMUL-9410'
    );
    const cell = /** @type {import('./requirement').GrossCell} */ (
      /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get('RM-EMUL-9410')).get(WEEK10)
    );
    expect(cell.quantity).toBeCloseTo(1000 * 0.05 * 0.2 * 1.01, 9);
    expect(cell.pegs[0].skuCode).toBe('SYN-FG-001');
  });

  it('the BOM line valid in each week is used (a closure changed mid-horizon)', () => {
    /** @type {BomLine[]} */
    const lines = [
      { ...bomLine('SYN-FG-001', 'PK-CAPF-8820', 1, 0), validTo: '2027-03-01' },
      { ...bomLine('SYN-FG-001', 'PK-ALCP-2441', 1, 0), validFrom: '2027-03-01' }
    ];
    const g = explode(
      [
        { skuCode: 'SYN-FG-001', weekStart: '2027-02-22', quantity: 10 },
        { skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 20 }
      ],
      lines,
      (c) => c !== 'SYN-FG-001'
    );
    expect(
      /** @type {import('./requirement').GrossCell} */ (
        /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get('PK-CAPF-8820')).get(
          '2027-02-22'
        )
      ).quantity
    ).toBe(10);
    expect(
      /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get('PK-CAPF-8820')).has(WEEK10)
    ).toBe(false);
    expect(
      /** @type {import('./requirement').GrossCell} */ (
        /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get('PK-ALCP-2441')).get(WEEK10)
      ).quantity
    ).toBe(20);
  });
});

// ── BR-03 · yield beside scrap (BL-115) ─────────────────────────────────────

describe('REQ-E14-03 BR-03 — yield divides the requirement, beside scrap (BL-115)', () => {
  /**
   * @param {number} y
   * @returns {EngineDataset}
   */
  const withYield = (y) => {
    const d = example();
    return { ...d, bom: d.bom.map((b) => ({ ...b, yieldPct: y })) };
  };

  it('the worked example at 85% yield: gross 20,000 × 1.02 ÷ 0.85 = 24,000; net 16,000; order 20,000; end 7,000', () => {
    const w = week(withYield(0.85), opts(WEEK1), WEEK10);
    expect(w.gross).toBeCloseTo(24_000, 9);
    expect(w.net).toBeCloseTo(24_000 + 3_000 - (5_000 + 6_000), 9);
    expect(w.plannedReceipt).toBe(20_000); // 16,000 → MOQ 10,000, multiple 5,000
    expect(w.projectedEnd).toBeCloseTo(5_000 + 6_000 + 20_000 - 24_000, 9);
    // Each finished good's part carries the yield it came through (the page shows it).
    expect(w.pegs.map((p) => p.yieldPct)).toEqual([0.85, 0.85, 0.85]);
    expect(w.pegs.reduce((s, p) => s + p.quantity, 0)).toBeCloseTo(w.gross, 9);
  });

  it('known-good: at 100% yield every figure is the scrap-only figure, bit for bit (÷ 1 is exact)', () => {
    const w = week(withYield(1), opts(WEEK1), WEEK10);
    expect(w.gross).toBe(
      8000 * (1 * (1 + 0.02)) + 7000 * (1 * (1 + 0.02)) + 5000 * (1 * (1 + 0.02))
    );
    expect(componentFactor({ qtyPer: 0.0833, scrapPct: 0.0137, yieldPct: 1 })).toBe(
      0.0833 * (1 + 0.0137)
    );
    // The history path (E14-04's errors, E14-02) keeps its old order of operations too.
    const sales = [{ skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 1234, stockout: false }];
    expect(
      /** @type {Map<string, number>} */ (
        grossRequirement(sales, [bomLine('SYN-FG-001', MAT, 0.0833, 0.0137, 1)]).get(MAT)
      ).get(WEEK10)
    ).toBe(1234 * 0.0833 * (1 + 0.0137));
  });

  it('known-bad direction: a lower yield always needs more, never less (monotone)', () => {
    /** @param {number} y */
    const at = (y) => week(withYield(y), opts(WEEK1), WEEK10).gross;
    expect(at(0.95)).toBeGreaterThan(at(1));
    expect(at(0.8)).toBeGreaterThan(at(0.95));
  });

  it('per BOM line: a material shared by two finished goods with different yields keeps each part at its own yield', () => {
    const g = explode(
      [
        { skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 900 },
        { skuCode: 'SYN-FG-002', weekStart: WEEK10, quantity: 800 }
      ],
      [bomLine('SYN-FG-001', MAT, 1, 0, 0.9), bomLine('SYN-FG-002', MAT, 1, 0, 0.8)],
      (c) => c === MAT
    );
    const cell = /** @type {import('./requirement').GrossCell} */ (
      /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get(MAT)).get(WEEK10)
    );
    expect(cell.quantity).toBeCloseTo(1000 + 1000, 9);
    expect(cell.pegs.map((p) => [p.skuCode, Math.round(p.quantity), p.yieldPct])).toEqual([
      ['SYN-FG-001', 1000, 0.9],
      ['SYN-FG-002', 1000, 0.8]
    ]);
  });

  it('through a bulk, both lines divide: 1,000 × 0.05 ÷ 0.95 × 0.2 × 1.01 ÷ 0.9', () => {
    const g = explode(
      [{ skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 1000 }],
      [
        bomLine('SYN-FG-001', 'SYN-BULK-01', 0.05, 0, 0.95),
        bomLine('SYN-BULK-01', 'RM-EMUL-9410', 0.2, 0.01, 0.9)
      ],
      (c) => c === 'RM-EMUL-9410'
    );
    const cell = /** @type {import('./requirement').GrossCell} */ (
      /** @type {NonNullable<ReturnType<typeof g.get>>} */ (g.get('RM-EMUL-9410')).get(WEEK10)
    );
    expect(cell.quantity).toBeCloseTo((1000 * 0.05 * 0.2 * 1.01) / 0.95 / 0.9, 9);
    // The part names the finished good, and the last line's scrap and yield.
    expect([cell.pegs[0].skuCode, cell.pegs[0].scrapPct, cell.pegs[0].yieldPct]).toEqual([
      'SYN-FG-001',
      0.01,
      0.9
    ]);
  });

  it('the history path divides too: E14-04 measures errors on the same requirement E14-03 plans', () => {
    const sales = [{ skuCode: 'SYN-FG-001', weekStart: WEEK10, quantity: 900, stockout: false }];
    expect(
      /** @type {Map<string, number>} */ (
        grossRequirement(sales, [bomLine('SYN-FG-001', MAT, 1, 0, 0.9)]).get(MAT)
      ).get(WEEK10)
    ).toBeCloseTo(1000, 9);
  });
});

// ── BR-02 · low-level codes and the cycle refusal ───────────────────────────

describe('REQ-E14-03 BR-02 — low-level codes; a BOM cycle is refused by name', () => {
  it('known-good: finished good 0, bulk 1, material 2 (its deepest position)', () => {
    const llc = lowLevelCodes([
      bomLine('SYN-FG-001', 'SYN-BULK-01'),
      bomLine('SYN-BULK-01', 'RM-EMUL-9410'),
      bomLine('SYN-FG-002', 'RM-EMUL-9410')
    ]);
    expect(Object.fromEntries(llc)).toEqual({
      'SYN-FG-001': 0,
      'SYN-FG-002': 0,
      'SYN-BULK-01': 1,
      'RM-EMUL-9410': 2
    });
  });

  it('known-bad: a cycle throws BOM_CYCLE and names the path', () => {
    expect(() =>
      lowLevelCodes([
        bomLine('SYN-FG-001', 'SYN-BULK-01'),
        bomLine('SYN-BULK-01', 'SYN-BULK-02'),
        bomLine('SYN-BULK-02', 'SYN-BULK-01')
      ])
    ).toThrow(/BOM_CYCLE: SYN-BULK-01 → SYN-BULK-02 → SYN-BULK-01/);
    expect(() => explode([], [bomLine('SYN-BULK-01', 'SYN-BULK-01')], () => false)).toThrow(
      /BOM_CYCLE/
    );
  });

  it('a purchased material that is also a BOM parent is refused, not exploded from an un-netted gross', () => {
    expect(() => explode([], [bomLine(MAT, 'RM-EMUL-9410')], () => true)).toThrow(
      /BOM_PURCHASED_PARENT: 'PK-CART-9901'/
    );
  });
});

// ── BR-01 · forecast consumption (M1) ───────────────────────────────────────

describe('REQ-E14-03 BR-01 — sales orders consume the forecast (M1)', () => {
  const F = [
    { skuCode: 'SYN-FG-001', weekStart: WEEK1, quantity: 1000 },
    { skuCode: 'SYN-FG-001', weekStart: '2027-01-11', quantity: 1000 }
  ];

  it('orders below the forecast: demand stays the forecast (not counted twice)', () => {
    const [w1] = consumeForecast(F, [{ skuCode: 'SYN-FG-001', weekStart: WEEK1, quantity: 600 }]);
    expect([w1.orders, w1.consumed, w1.demand]).toEqual([600, 600, 1000]);
  });

  it('orders above the forecast: demand is the orders', () => {
    const [w1] = consumeForecast(F, [{ skuCode: 'SYN-FG-001', weekStart: WEEK1, quantity: 1300 }]);
    expect(w1.demand).toBe(1300);
  });

  it('with a backward window, the excess consumes the previous week too', () => {
    const rows = consumeForecast(
      F,
      [{ skuCode: 'SYN-FG-001', weekStart: '2027-01-11', quantity: 1300 }],
      {
        backwardWeeks: 1,
        forwardWeeks: 0
      }
    );
    expect(rows.map((r) => r.demand)).toEqual([700, 1300]);
    // Without the window the previous week keeps its full forecast.
    expect(
      consumeForecast(F, [{ skuCode: 'SYN-FG-001', weekStart: '2027-01-11', quantity: 1300 }]).map(
        (r) => r.demand
      )
    ).toEqual([1000, 1300]);
  });

  it('on the synthetic data, open orders change the demand the run explodes (consumption is not a no-op)', () => {
    const data = engineDataset();
    const asOf = data.provenance.present;
    const withOrders = materialRequirement(data, defaultRequirementOptions(asOf));
    const without = materialRequirement(
      { ...data, salesOrders: [] },
      defaultRequirementOptions(asOf)
    );
    /** @param {typeof withOrders} r */
    const g = (r) => r.materials.reduce((s, m) => s + m.weeks[0].gross, 0);
    expect(data.salesOrders.length).toBeGreaterThan(0);
    expect(g(withOrders)).toBeGreaterThan(g(without));
  });
});

describe('REQ-E14-03 BR-06 — interim sizing (E14-05 not built)', () => {
  it('MOQ dominates a small net; a net on a multiple is not rounded up; float noise is guarded', () => {
    expect(interimOrderSize(1, 10_000, 5_000)).toBe(10_000);
    expect(interimOrderSize(15_000, 10_000, 5_000)).toBe(15_000);
    expect(interimOrderSize(15_000.0000000001, 10_000, 5_000)).toBe(15_000);
    expect(interimOrderSize(15_001, 10_000, 5_000)).toBe(20_000);
    expect(interimOrderSize(0, 10_000, 5_000)).toBe(0);
  });

  it('a stock-accuracy failure in the example marks it for review; an exact count does not', () => {
    expect(
      materialRequirement(example({ counted: 4600 }), opts(WEEK1)).materials[0].reviewRequired
    ).toBe(true);
    expect(materialRequirement(example(), opts(WEEK1)).materials[0].reviewRequired).toBe(false);
  });
});
