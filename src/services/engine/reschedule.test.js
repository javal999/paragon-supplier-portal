// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 — reschedule or cancel open orders (warehouse relief).
//
// The requirement's worked example VERBATIM (CT-10: 40,000 on hand, safety
// stock 8,000, 8,000 a week; a 20,000-unit call-off due in week 3 is needed in
// week 5 → reschedule out, 20 pallet-weeks, Rp 700,000; 21 days ahead of a
// 14-day lead time → no penalty) and its inside-lead-time twin (Rp 1,500,000
// penalty, ranked last). Then the business rules probed both ways: ENG-D15's
// threshold, the ENG-D8 band on a Trade-off reduction, the ENG-D17 liability
// flag, zone and lead-time ranking, joint valuation (BR-06, AC-04), the
// selection recomputed independently (AC-03), and — on the synthetic dataset —
// the reconciliation with E14-03/E14-05 and the stability guard (BR-09)
// against a full E14-02 recomputation.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { LineTerms, OpenOrderLine, RescheduleInput, RescheduleMaterial } from './reschedule' */
import {
  freedPalletsOf,
  needWeekIndex,
  neededWithinHorizon,
  planChangeAfter,
  planChangeGuard,
  poOrderLines,
  reschedule,
  selectionEffect,
  termsKey,
  weekIndex,
  zoneOf
} from './reschedule';
import { addDays, instantOn } from './dates';
import { sizedRequirement } from './orderSizing';
import { defaultRequirementOptions, materialRequirement } from './requirement';
import { DEFAULT_SAFETY_STOCK_OPTIONS, requirementInputs, safetyStockRun } from './safetyStock';
import { portfolioReliability, supplierReliability, trailingWindow } from './reliability';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
/** @import { EngineDataset, ScheduleChange } from './types' */
import { lineKey } from './types';

// ── The worked example ──────────────────────────────────────────────────────

/**
 * The day the change would be made; the plan's week 1 starts a week later, so
 * week 3 is 21 days away. The example's table shows six weeks; the horizon runs
 * eight at the same use, so the whole call-off is needed within it (else BR-03
 * would read its tail as not needed and propose a reduction).
 */
const AS_OF = '2026-09-07';
const WEEKS = Array.from({ length: 8 }, (_, i) => addDays('2026-09-14', 7 * i));
const CT10 = 'PK-CART-9910';

/**
 * @param {Partial<RescheduleMaterial>} [over]
 * @returns {RescheduleMaterial}
 */
const ct10 = (over = {}) => ({
  materialCode: CT10,
  kind: 'packaging',
  uom: 'PCS',
  startStock: 40_000,
  safetyStock: 8_000,
  gross: WEEKS.map(() => 8_000),
  planned: WEEKS.map(() => 0),
  unitsPerPallet: 2_000,
  ...over
});

/**
 * @param {Partial<OpenOrderLine>} [over]
 * @returns {OpenOrderLine}
 */
const line = (over = {}) => ({
  id: 'co:co-0141',
  kind: 'callOff',
  reference: 'CO-2026-0141',
  callOffId: 'co-0141',
  poNumber: 'PO-2025-00117',
  poLine: null,
  supplierId: 'sup-008',
  materialCode: CT10,
  quantity: 20_000,
  receivedQuantity: 0,
  firstQuantity: 20_000,
  date: WEEKS[2],
  confirmed: true,
  info: null,
  ...over
});

/** @type {LineTerms} */
const TERMS = { leadTimeDays: 14, firmDays: 14, tradeOffDays: 42, moq: 0, orderMultiple: 1 };

/**
 * @param {Partial<RescheduleInput>} [over]
 * @returns {RescheduleInput}
 */
const input = (over = {}) => ({
  asOf: AS_OF,
  weeks: WEEKS,
  // 4 pallets of room: weeks 3 and 4 are over capacity by at least 10 pallets with the call-off in.
  warehouses: [{ warehouseId: 'WH-PK', kind: 'packaging', capacityPallets: 4 }],
  materials: [ct10()],
  lines: [line()],
  terms: new Map([[termsKey('sup-008', CT10), TERMS]]),
  costs: { rentIdrPerPalletWeek: 35_000, changePenaltyIdrPerPallet: 150_000 },
  thresholdWeeks: 1,
  ...over
});

describe('REQ-E14-13 — the worked example, verbatim', () => {
  it('BR-02: without the call-off, stock falls below safety stock first in week 5 (32,000 / 24,000 / 16,000 / 8,000 / 0 / −8,000)', () => {
    const cg = [8_000, 16_000, 24_000, 32_000, 40_000, 48_000];
    expect(cg.map((c) => 40_000 - c)).toEqual([32_000, 24_000, 16_000, 8_000, 0, -8_000]);
    // Index 4 is week 5: week 4 ends exactly AT safety stock, not below it.
    expect(needWeekIndex(40_000, cg, 8_000)).toBe(4);
  });

  it('BR-03 / BR-05: reschedule out week 3 → week 5, 10 pallets × 2 weeks = 20 pallet-weeks, Rp 700,000, outside the lead time, no penalty', () => {
    const run = reschedule(input());
    const [w] = run.warehouses;
    const [p] = w.proposals;
    expect(p.type).toBe('rescheduleOut');
    expect(p.currentWeek).toBe(WEEKS[2]);
    expect(p.needWeek).toBe(WEEKS[4]);
    expect(p.proposedDate).toBe(WEEKS[4]);
    expect(p.weeksEarly).toBe(2);
    expect(p.proposedQuantity).toBe(20_000);
    expect(p.palletsChanged).toBe(10);
    expect(p.palletWeeksFreed).toBe(20);
    expect(p.freedPallets).toEqual([0, 0, 10, 10, 0, 0, 0, 0]);
    expect(p.overCapacityPalletWeeksFreed).toBe(20);
    expect(p.rentSavedIdr).toBe(700_000);
    // 21 days before the original date, against a 14-day lead time.
    expect(p.daysAhead).toBe(21);
    expect(p.insideLeadTime).toBe(false);
    expect(p.zone).toBe('tradeOff');
    expect(p.changePenaltyIdr).toBe(0);
    expect(p.netSavingIdr).toBe(700_000);
    expect(p.needsSupplierAgreement).toBe(false);
    expect(p.rank).toBe(1);
  });

  it('…and inside the lead time the penalty of 10 pallets × Rp 150,000 = Rp 1,500,000 makes the net saving negative; it ranks last, needing supplier agreement', () => {
    // The same call-off, 10 days away (needed in week 5 still); and a small one outside the lead time.
    const near = line({ id: 'co:near', date: addDays(AS_OF, 10) });
    const far = line({ id: 'co:far', date: WEEKS[2], quantity: 2_000, firstQuantity: 2_000 });
    const run = reschedule(input({ lines: [near, far] }));
    const ranked = run.warehouses[0].proposals.filter((p) => p.rank !== null);
    const inside = /** @type {import('./reschedule').Proposal} */ (
      ranked.find((p) => p.id === 'co:near')
    );
    expect(inside.type).toBe('rescheduleOut');
    expect(inside.needWeek).toBe(WEEKS[4]);
    expect(inside.insideLeadTime).toBe(true);
    expect(inside.zone).toBe('firm');
    expect(inside.changePenaltyIdr).toBe(1_500_000);
    expect(inside.netSavingIdr).toBe(inside.rentSavedIdr - 1_500_000);
    expect(inside.netSavingIdr).toBeLessThan(0);
    expect(inside.needsSupplierAgreement).toBe(true);
    expect(inside.tier).toBe(2);
    // Ranked last, after the one outside the lead time.
    expect(ranked[ranked.length - 1].id).toBe('co:near');
    expect(ranked[0].insideLeadTime).toBe(false);
  });

  it('ENG-B23: a line E14-02 reads as inside the lead time (against PTI’s requested date) is inside here too — never "free"', () => {
    const [p] = reschedule(input({ insideLeadTimeByMeasure: new Set(['co:co-0141']) }))
      .warehouses[0].proposals;
    expect(p.daysAhead).toBe(21);
    expect(p.insideLeadTime).toBe(true);
    expect(p.tier).toBe(2);
    expect(p.changePenaltyIdr).toBe(1_500_000);
  });

  it('BR-06: after the call-off is accepted, a second proposal freeing space only in week 4 is revalued against the new week-4 fill — and drops off the list at zero', () => {
    // Capacity 14. Week 4 holds 14 pallets of CT-10 with the call-off in, plus 5
    // pallets of a second material from a line due week 4 that is not needed
    // until week 5: 19, over by 5. Alone, either frees those 5. Once the
    // call-off moves, week 4 holds 4 + 5 = 9 — under capacity.
    const other = ct10({
      materialCode: 'PK-CART-9901',
      startStock: 0,
      safetyStock: 0,
      gross: [0, 0, 0, 0, 10_000, 0, 0, 0]
    });
    const second = line({
      id: 'po:second',
      kind: 'poLine',
      callOffId: null,
      poLine: 1,
      reference: 'SYN-PO-1/1',
      materialCode: 'PK-CART-9901',
      quantity: 10_000,
      firstQuantity: 10_000,
      date: WEEKS[3]
    });
    const terms = new Map([
      [termsKey('sup-008', CT10), TERMS],
      [termsKey('sup-008', 'PK-CART-9901'), TERMS]
    ]);
    const run = reschedule(
      input({
        warehouses: [{ warehouseId: 'WH-PK', kind: 'packaging', capacityPallets: 14 }],
        materials: [ct10(), other],
        lines: [line(), second],
        terms
      })
    );
    const w = run.warehouses[0];
    /** @param {string} id */
    const alone = (id) =>
      /** @type {import('./reschedule').Proposal} */ (w.proposals.find((p) => p.id === id));
    expect(w.weeks[3].overPallets).toBe(5);
    expect(alone('co:co-0141').rank).toBe(1);
    // Valued after the call-off: week 4 falls to 4 + 5 = 9 pallets, under 14 — nothing left for the second line.
    expect(alone('po:second').rank).toBeNull();
    expect(alone('po:second').overCapacityPalletWeeksFreed).toBe(0);
    expect(alone('po:second').palletWeeksFreed).toBe(5);
  });
});

// ── The arithmetic, probed both ways ────────────────────────────────────────

describe('the building blocks', () => {
  it('weekIndex: an overdue date lands in the first week; a date past the horizon is outside it', () => {
    expect(weekIndex(WEEKS, '2026-09-01')).toBe(0);
    expect(weekIndex(WEEKS, WEEKS[0])).toBe(0);
    expect(weekIndex(WEEKS, addDays(WEEKS[2], 3))).toBe(2);
    expect(weekIndex(WEEKS, addDays(WEEKS[7], 7))).toBeNull();
  });

  it('zoneOf: Firm below the firm length, Trade-off to firm + trade-off, Forecast after', () => {
    expect(zoneOf(13, TERMS)).toBe('firm');
    expect(zoneOf(14, TERMS)).toBe('tradeOff');
    expect(zoneOf(55, TERMS)).toBe('tradeOff');
    expect(zoneOf(56, TERMS)).toBe('forecast');
  });

  it('neededWithinHorizon: nothing when the supply before covers the horizon and safety stock; all of it when none does', () => {
    const cg = [8_000, 16_000, 24_000];
    expect(neededWithinHorizon(40_000, cg, 8_000, 5_000)).toBe(0);
    expect(neededWithinHorizon(28_000, cg, 8_000, 5_000)).toBe(4_000);
    expect(neededWithinHorizon(0, cg, 8_000, 5_000)).toBe(5_000);
  });

  it('freedPalletsOf: a move frees the weeks between; a cancellation frees every week from the due week', () => {
    expect(freedPalletsOf(5, 1, 2_000, 3, 2_000, 1_000)).toEqual([0, 2, 2, 0, 0]);
    expect(freedPalletsOf(5, 1, 2_000, 5, 0, 1_000)).toEqual([0, 2, 2, 2, 2]);
    // A reschedule-in adds pallets (negative freed).
    expect(freedPalletsOf(5, 3, 2_000, 1, 2_000, 1_000)).toEqual([0, -2, -2, 0, 0]);
  });
});

describe('ENG-D15 — the reschedule-out threshold', () => {
  it('two weeks early is proposed at a 1- or 2-week threshold and not at 3', () => {
    expect(reschedule(input({ thresholdWeeks: 1 })).warehouses[0].proposals[0]?.type).toBe(
      'rescheduleOut'
    );
    expect(reschedule(input({ thresholdWeeks: 2 })).warehouses[0].proposals[0]?.type).toBe(
      'rescheduleOut'
    );
    expect(reschedule(input({ thresholdWeeks: 3 })).warehouses[0].proposals).toEqual([]);
  });

  it('a line needed in its own week is never proposed; one week early is, at the default of 1', () => {
    const onTime = line({ date: WEEKS[4] });
    expect(reschedule(input({ lines: [onTime] })).warehouses[0].proposals).toEqual([]);
    const oneEarly = line({ date: WEEKS[3] });
    const [p] = reschedule(input({ lines: [oneEarly] })).warehouses[0].proposals;
    expect(p.type).toBe('rescheduleOut');
    expect(p.weeksEarly).toBe(1);
  });
});

describe('BR-03 — reduce, cancel and reschedule in', () => {
  it('cancel: none of the line is needed within the horizon', () => {
    const run = reschedule(input({ materials: [ct10({ startStock: 100_000 })] }));
    const [p] = run.warehouses[0].proposals;
    expect(p.type).toBe('cancel');
    expect(p.proposedQuantity).toBe(0);
    expect(p.proposedDate).toBeNull();
    // From its due week to the end of the horizon: 10 pallets × 6 weeks.
    expect(p.palletWeeksFreed).toBe(60);
  });

  it('reduce: only part of the line is needed; rounded UP to the MOQ and multiple, and moved to the need week in the same change', () => {
    // 66,000 on hand: the horizon needs 64,000 + 8,000 = 72,000, so 6,000 of the 20,000.
    const terms = new Map([
      [
        termsKey('sup-008', CT10),
        { ...TERMS, firmDays: 14, tradeOffDays: 0, moq: 5_000, orderMultiple: 4_000 }
      ]
    ]);
    const run = reschedule(input({ materials: [ct10({ startStock: 66_000 })], terms }));
    const [p] = run.warehouses[0].proposals;
    expect(p.zone).toBe('forecast');
    expect(p.type).toBe('reduce');
    expect(p.neededQuantity).toBe(6_000);
    expect(p.proposedQuantity).toBe(8_000);
    expect(p.needWeek).toBe(WEEKS[7]);
    expect(p.proposedDate).toBe(WEEKS[7]);
    expect(p.bandLimited).toBe(false);
    expect(p.liability).toBe(false);
  });

  it('reschedule in: a line due after its need week is proposed earlier, listed apart (never relief), and adds pallets', () => {
    const late = line({ date: WEEKS[5] });
    const run = reschedule(input({ lines: [late], materials: [ct10({ startStock: 20_000 })] }));
    const [p] = run.warehouses[0].proposals;
    expect(p.type).toBe('rescheduleIn');
    expect(p.needWeek).toBe(WEEKS[1]);
    expect(p.weeksEarly).toBe(-4);
    expect(p.proposedDate).toBe(WEEKS[1]);
    expect(p.rank).toBeNull();
    expect(p.palletWeeksFreed).toBeLessThan(0);
  });
});

describe('BR-04 / ENG-D8 / ENG-D17 — what may be proposed depends on the zone', () => {
  /**
   * @param {'tradeOff' | 'forecast' | 'firm'} zone
   * @param {Partial<OpenOrderLine>} [over]
   */
  const reduceIn = (zone, over = {}) => {
    // Needed: 6,000 of 20,000 (a −70% change).
    /** @type {LineTerms} */
    const t =
      zone === 'forecast'
        ? { ...TERMS, tradeOffDays: 0 }
        : zone === 'firm'
          ? { ...TERMS, leadTimeDays: 30, firmDays: 30 }
          : TERMS;
    return reschedule(
      input({
        materials: [ct10({ startStock: 66_000 })],
        terms: new Map([[termsKey('sup-008', CT10), t]]),
        lines: [line(over)]
      })
    ).warehouses[0].proposals[0];
  };

  it('Trade-off: a reduction is held to the band — ±10% on the quantity in force (18,000, not 6,000)', () => {
    const p = reduceIn('tradeOff');
    expect(p.zone).toBe('tradeOff');
    expect(p.type).toBe('reduce');
    expect(p.neededQuantity).toBe(6_000);
    expect(p.proposedQuantity).toBe(18_000);
    expect(p.bandLimited).toBe(true);
    expect(p.liability).toBe(false);
    expect(p.needsSupplierAgreement).toBe(false);
  });

  it('Trade-off: the ±20% cumulative cap binds when earlier changes already moved the line (first 25,000 → floor 20,000 leaves nothing to reduce)', () => {
    // In force 20,000, first 25,000: −10% would be 18,000 (−28% cumulative), so the band allows no reduction.
    const p = reduceIn('tradeOff', { firstQuantity: 25_000 });
    expect(p.type).toBe('rescheduleOut');
    expect(p.bandLimited).toBe(false);
  });

  it('Forecast: free — the needed quantity itself', () => {
    const p = reduceIn('forecast');
    expect(p.proposedQuantity).toBe(6_000);
    expect(p.liability).toBe(false);
    expect(p.tier).toBe(0);
  });

  it('Firm: the full reduction, but it needs supplier agreement, carries the liability flag (beyond the band) and ranks last', () => {
    const p = reduceIn('firm');
    expect(p.zone).toBe('firm');
    expect(p.insideLeadTime).toBe(true);
    expect(p.proposedQuantity).toBe(6_000);
    expect(p.liability).toBe(true);
    expect(p.needsSupplierAgreement).toBe(true);
    expect(p.tier).toBe(2);
    expect(p.changePenaltyIdr).toBe(7 * 150_000);
  });

  it('ENG-D17: a Trade-off cancellation is flagged "liability — not priced": the net saving ignores it, the rank tier does not', () => {
    const run = reschedule(input({ materials: [ct10({ startStock: 100_000 })] }));
    const [p] = run.warehouses[0].proposals;
    expect(p.type).toBe('cancel');
    expect(p.zone).toBe('tradeOff');
    expect(p.liability).toBe(true);
    expect(p.needsSupplierAgreement).toBe(true);
    expect(p.tier).toBe(1);
    expect(p.changePenaltyIdr).toBe(0);
    expect(p.netSavingIdr).toBe(p.rentSavedIdr);
  });

  it('a Forecast-zone cancellation carries no liability', () => {
    const terms = new Map([[termsKey('sup-008', CT10), { ...TERMS, tradeOffDays: 0 }]]);
    const [p] = reschedule(input({ materials: [ct10({ startStock: 100_000 })], terms }))
      .warehouses[0].proposals;
    expect(p.type).toBe('cancel');
    expect(p.liability).toBe(false);
    expect(p.tier).toBe(0);
  });

  it('a cancelled PO line that is the last open line on its PO is flagged for the buyer; one with a sibling is not', () => {
    /**
     * @param {string} id
     * @param {number} n
     */
    const po = (id, n, mat = CT10) =>
      line({
        id,
        kind: 'poLine',
        callOffId: null,
        poNumber: 'SYN-PO-9',
        poLine: n,
        reference: `SYN-PO-9/${n}`,
        materialCode: mat
      });
    const alone = reschedule(
      input({ materials: [ct10({ startStock: 100_000 })], lines: [po('po:a', 1)] })
    ).warehouses[0].proposals[0];
    expect(alone.lastOpenLineOnPo).toBe(true);
    const withSibling = /** @type {import('./reschedule').Proposal} */ (
      reschedule(
        input({ materials: [ct10({ startStock: 100_000 })], lines: [po('po:a', 1), po('po:b', 2)] })
      ).warehouses[0].proposals.find((p) => p.id === 'po:a')
    );
    expect(withSibling.lastOpenLineOnPo).toBe(false);
  });
});

describe('BR-01 — information lines are projected, never proposed', () => {
  it('a dispatched call-off counts in the fill and yields no proposal', () => {
    const run = reschedule(input({ lines: [line({ info: 'dispatched' })] }));
    const w = run.warehouses[0];
    expect(w.proposals).toEqual([]);
    expect(w.info.map((i) => [i.line.id, i.reason])).toEqual([['co:co-0141', 'dispatched']]);
    // Still in the projection: week 3 carries its 10 pallets (16,000 + 20,000 = 36,000 → 18 pallets).
    expect(w.weeks[2].pallets).toBe(18);
  });

  it('a line whose supplier has no source is information "noSource"', () => {
    const run = reschedule(input({ terms: new Map() }));
    expect(run.warehouses[0].info.map((i) => i.reason)).toEqual(['noSource']);
  });
});

describe('stock on hand — what no open order can relieve', () => {
  it('on-hand pallets are the stock the plan has not yet used; where they alone pass capacity the week is marked', () => {
    const run = reschedule(
      input({ warehouses: [{ warehouseId: 'WH-PK', kind: 'packaging', capacityPallets: 12 }] })
    );
    const w = run.warehouses[0];
    // 40,000 on hand less use: 16, 12, 8, 4, then nothing.
    expect(w.weeks.map((x) => x.onHandPallets)).toEqual([16, 12, 8, 4, 0, 0, 0, 0]);
    expect(w.weeks.map((x) => x.onHandOverPallets)).toEqual([4, 0, 0, 0, 0, 0, 0, 0]);
    expect(w.totals.onHandOverPalletWeeks).toBe(4);
    // Week 1's overload is stock on hand, and it survives every proposal.
    expect(w.weeks[0].overPalletsAfterRelief).toBe(4);
  });
});

describe('AC-03 / AC-04 — a selection, applied together', () => {
  // Two 10,000 call-offs due week 2, needed in weeks 5 and 6; 14 pallets of room.
  const PAIR_LINES = [
    line({ id: 'co:a', quantity: 10_000, firstQuantity: 10_000, date: WEEKS[1] }),
    line({ id: 'co:b', quantity: 10_000, firstQuantity: 10_000, date: WEEKS[1] })
  ];
  /** @param {readonly OpenOrderLine[]} lines */
  const pairInput = (lines) =>
    input({
      warehouses: [{ warehouseId: 'WH-PK', kind: 'packaging', capacityPallets: 14 }],
      lines
    });
  const pair = () => reschedule(pairInput(PAIR_LINES)).warehouses[0];

  it('AC-04: the ranked values add up to the joint total — no pallet-week is claimed twice', () => {
    const w = pair();
    const ranked = w.proposals.filter((p) => p.rank !== null);
    expect(ranked.map((p) => [p.id, p.needWeek])).toEqual([
      ['co:a', WEEKS[4]],
      ['co:b', WEEKS[5]]
    ]);
    // Over capacity before: 2 + 8 + 4 = 14 pallet-weeks (weeks 1–3); week 1 is stock on hand.
    expect(w.totals.overPalletWeeks).toBe(14);
    // Alone, each frees 5 + 4 = 9; together they free 12, not 18.
    /** @param {string} id */
    const alone = (id) =>
      selectionEffect(w, new Set([id]), { rentIdrPerPalletWeek: 1, changePenaltyIdrPerPallet: 0 })
        .freedOverPalletWeeks;
    expect(alone('co:a')).toBe(9);
    expect(alone('co:b')).toBe(9);
    expect(ranked.map((p) => p.overCapacityPalletWeeksFreed)).toEqual([9, 3]);
    const sum = ranked.reduce((s, p) => s + p.overCapacityPalletWeeksFreed, 0);
    expect(sum).toBe(w.totals.overPalletWeeks - w.totals.overPalletWeeksAfterRelief);
    expect(
      selectionEffect(w, new Set(['co:a', 'co:b']), {
        rentIdrPerPalletWeek: 1,
        changePenaltyIdrPerPallet: 0
      }).freedOverPalletWeeks
    ).toBe(12);
    expect(w.totals.overPalletWeeksAfterRelief).toBe(2);
  });

  it('AC-03: the fill after a selection equals a recalculation from the changed lines', () => {
    const w = pair();
    const chosen = w.proposals.filter((p) => p.rank !== null);
    const eff = selectionEffect(w, new Set(chosen.map((p) => p.id)), {
      rentIdrPerPalletWeek: 35_000,
      changePenaltyIdrPerPallet: 150_000
    });
    // Independent: rebuild the lines at their proposed dates and quantities and re-run the projection.
    const chosenIds = new Set(chosen.map((p) => p.id));
    const moved = chosen.map((p) => ({
      ...p.line,
      date: /** @type {NonNullable<typeof p.proposedDate>} */ (p.proposedDate),
      quantity: p.proposedQuantity
    }));
    const again = reschedule(
      pairInput([...moved, ...PAIR_LINES.filter((l) => !chosenIds.has(l.id))])
    ).warehouses[0];
    expect(eff.pallets).toEqual(again.weeks.map((x) => x.pallets));
    expect(eff.overPalletWeeks).toBeCloseTo(again.totals.overPalletWeeks, 9);
    expect(eff.rentSavedIdr).toBeCloseTo(eff.freedOverPalletWeeks * 35_000, 6);
  });
});

// ── On the synthetic dataset ────────────────────────────────────────────────

/** @type {EngineDataset} */
const data = engineDataset();
const asOf = data.provenance.present;
const COSTS = {
  orderCostIdr: 750_000,
  holdingRatePerYear: 0.25,
  rentIdrPerPalletWeek: 35_000,
  changePenaltyIdrPerPallet: 150_000
};

const sized = () => {
  const ss = safetyStockRun(data, { ...DEFAULT_SAFETY_STOCK_OPTIONS, asOf });
  return sizedRequirement(
    data,
    { ...defaultRequirementOptions(asOf), ...requirementInputs(ss) },
    { costs: COSTS }
  ).sized;
};

describe('on the synthetic dataset — E14-03 / E14-05 reconciliation and BR-09', () => {
  it('the PO lines are exactly E14-03’s open receipts, with the first quantity from the line itself', () => {
    const run = sized();
    const lines = poOrderLines(data, run);
    expect(lines.length).toBe(run.materials.reduce((s, m) => s + m.receipts.length, 0));
    expect(lines.length).toBeGreaterThan(0);
    const ordered = new Map(data.poLines.map((l) => [lineKey(l.poNumber, l.line), l.orderedQty]));
    for (const l of lines)
      expect(l.firstQuantity).toBe(
        ordered.get(lineKey(l.poNumber, /** @type {NonNullable<typeof l.poLine>} */ (l.poLine)))
      );
  });

  it('BR-09: the plan-change share after sending equals E14-02 recomputed on a dataset with those changes added', () => {
    const run = sized();
    const lines = poOrderLines(data, run);
    const at = instantOn(asOf, 12);
    const guard = planChangeGuard(data, at, 26, lines);
    const w = trailingWindow(at, 26);
    expect(guard.baseline.share).toBe(
      portfolioReliability(supplierReliability(data, w)).planChange.share
    );
    expect(guard.adds.size).toBeGreaterThan(0);
    // Every line the measure would add is one it reads as inside the lead time.
    for (const id of guard.adds) expect(guard.inside.has(id)).toBe(true);
    expect(guard.inside.size).toBeGreaterThanOrEqual(guard.adds.size);
    // Send every line the guard says would add, plus one it says would not (a control).
    const addIds = [...guard.adds];
    const notAdding = /** @type {OpenOrderLine} */ (lines.find((l) => !guard.adds.has(l.id)));
    /** @type {ScheduleChange[]} */
    const changes = [
      ...addIds.map((id) => /** @type {OpenOrderLine} */ (lines.find((l) => l.id === id))),
      notAdding
    ].map((l) => ({
      poNumber: l.poNumber,
      line: /** @type {NonNullable<typeof l.poLine>} */ (l.poLine),
      at,
      field: 'date',
      from: l.date,
      to: addDays(l.date, 14),
      by: 'PTI',
      reason: 'warehouse'
    }));
    const after = portfolioReliability(
      supplierReliability({ ...data, scheduleChanges: [...data.scheduleChanges, ...changes] }, w)
    ).planChange;
    const fake = /** @type {Parameters<typeof planChangeAfter>[1]} */ (
      /** @type {unknown} */ (addIds.map((id) => ({ id, addsToPlanChange: true })))
    );
    const predicted = planChangeAfter(guard.baseline, fake, new Set(addIds));
    expect(after.changedInsideLeadTime).toBe(predicted.changedInsideLeadTime);
    expect(after.share).toBe(predicted.share);
  });

  it('the report on the dataset: packaging and raw material separately, every relief proposal ranked with a positive freed over-capacity figure', () => {
    const run = sized();
    const out = reschedule({
      asOf,
      weeks: run.weeks,
      warehouses: data.warehouses,
      materials: run.materials.map((m) => ({
        materialCode: m.materialCode,
        kind: m.kind,
        uom: m.uom,
        startStock: m.startStock,
        safetyStock: m.safetyStock,
        gross: m.weeks.map((x) => x.gross),
        planned: m.weeks.map((x) => x.plannedReceipt),
        unitsPerPallet:
          data.volumes.find((v) => v.materialCode === m.materialCode)?.unitsPerPallet ?? null
      })),
      lines: poOrderLines(data, run),
      terms: new Map(
        data.sources.map((s) => [
          termsKey(s.supplierId, s.materialCode),
          {
            leadTimeDays: s.leadTimeDays,
            firmDays: s.leadTimeDays,
            tradeOffDays: 42,
            moq: s.moq,
            orderMultiple: s.orderMultiple
          }
        ])
      ),
      costs: COSTS,
      thresholdWeeks: 1
    });
    expect(out.warehouses.map((w) => w.kind)).toEqual(['packaging', 'rawMaterial']);
    for (const w of out.warehouses) {
      const ranked = w.proposals.filter((p) => p.rank !== null);
      ranked.forEach((p, i) => {
        expect(p.rank).toBe(i + 1);
        expect(p.overCapacityPalletWeeksFreed).toBeGreaterThan(0);
      });
      // Tiers never go backwards down the list (BR-04: inside the lead time last).
      for (let i = 1; i < ranked.length; i += 1)
        expect(ranked[i].tier).toBeGreaterThanOrEqual(ranked[i - 1].tier);
      // The projection reconciles with E14-03's own projected stock (no call-offs in this run).
      const pallets = run.weeks.map((_, t) =>
        run.materials
          .filter((m) => m.kind === w.kind)
          .reduce(
            (s, m) =>
              s +
              m.weeks[t].projectedEnd /
                /** @type {import('./types').MaterialVolume} */ (
                  data.volumes.find((v) => v.materialCode === m.materialCode)
                ).unitsPerPallet,
            0
          )
      );
      w.weeks.forEach((x, t) => expect(x.pallets).toBeCloseTo(pallets[t], 6));
    }
  });

  it('deterministic: the same inputs give the same report', () => {
    const a = reschedule(input());
    const b = reschedule(input());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// Unused-import guard for the E14-03 entry point: the reconciliation above reads its run.
void materialRequirement;
