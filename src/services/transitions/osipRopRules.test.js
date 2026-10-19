import { describe, expect, it } from 'vitest';
import { OSIP_RULES, stamp } from './osipRules';
import { osipSafety } from './osipSafetyRules';
import {
  NPD_RULES,
  OSIP_ROP_READ,
  firstOrder,
  npdObservations,
  npdTags,
  openNpdReviews,
  osipLevelInForce,
  osipLevelRefusal,
  osipRops
} from './osipRopRules';
/** @import { OsipRopInput, NpdObservation, NpdTag } from './osipRopRules' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-196 (DRC-10, DRC-D11) and BL-198 (DRC-12a) — the ROPs, Max, the level and
// the NPD tag, worked by hand. Every figure is the calculation module's
// (`osipRules.js`) through `osipSafety`; these specs pin what the read side
// hands it and reads back.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One supplier × material, worked by hand:
 *   LTP 600, 800, 700, 900 over a 4-week lead time → cycle stock 3,000;
 *   sample SD 129.10 → safety order 1.65 × √4 × 129.10 = 426.0 → 500 (MPQ 100).
 *   Consumption 1,400 / 2,100 / 700 a week → highest 300 a day; LTP 750 a week
 *   → 107.14 a day; demand = min(300, 107.14) = 107.14 a day.
 *   ROP Fisik safety = CEILING(1 day × 107.14, 100) = 200.
 * @param {Partial<OsipRopInput>} [over]
 * @returns {OsipRopInput}
 */
const pair = (over = {}) => ({
  supplierId: 'sup-x',
  materialCode: 'MAT-1',
  ltp: [600, 800, 700, 900],
  leadTimeWeeks: 4,
  mpq: 100,
  moq: 300,
  koli: 240,
  consumption: [1400, 2100, 700],
  supplyArea: 'jabodetabek',
  leadTimeSteps: [
    { step: 'machineQueue', days: 3 },
    { step: 'production', days: 7 },
    { step: 'delivery', days: 4 }
  ],
  ...over
});

/**
 * @param {OsipRopInput} input
 * @param {number} level
 * @param {import('./osipRules').OsipRules} [rules]
 */
const rops = (input, level, rules = OSIP_RULES) =>
  osipRops(input, osipSafety(input, rules), level, rules);

describe('BL-196 — ROP Order, ROP Fisik, Max for one material, worked by hand', () => {
  const r = rops(pair(), 4);

  it('ROP Order = cycle stock 3,000 + safety order 500 = 3,500 [Default B9]', () => {
    expect(r.ropOrder).toMatchObject({ value: 3500, cycleStock: 3000, unavailable: null });
  });

  it('ROP Fisik, level 4 (the default) = CEILING(107.14 × f 1, MPQ 100) 200 + safety 200 = 400', () => {
    expect(r.ropFisik).toMatchObject({ value: 400, cycle: 200, level: 4, levelFallback: false });
  });

  it('Max, local = CEILING(ROP Fisik 400, koli 240) = 480 [Default B8]', () => {
    expect(r.max).toEqual({ value: 480, unavailable: null });
  });

  it('ROP Supplier = CEILING(107.14 a day × (queue 3 + production 7) days, MPQ) = 1,100; FS and principal are not on a local route', () => {
    expect(r.supplier.ropSupplier).toMatchObject({ value: 1100, days: 10 });
    expect(r.supplier.ropFs).toEqual({
      value: null,
      unavailable: 'NOT_ON_ROUTE',
      missing: ['orderingMaterial']
    });
    expect(r.supplier.ropToPrincipal).toMatchObject({
      unavailable: 'NOT_ON_ROUTE',
      missing: ['orderToPrincipal']
    });
  });

  it('import: f = 7 → ROP Fisik CEILING(750, 100) 800 + 200 = 1,000; Max = CEILING(1,000, MOQ 300) = 1,200; FS = CEILING(107.14 × 5, 100) = 600', () => {
    const imp = rops(
      pair({
        supplyArea: 'import',
        leadTimeSteps: [
          { step: 'orderingMaterial', days: 5 },
          { step: 'machineQueue', days: 2 },
          { step: 'production', days: 6 },
          { step: 'shipment', days: 8 }
        ]
      }),
      4
    );
    expect(imp.ropFisik.value).toBe(1000);
    expect(imp.max.value).toBe(1200);
    expect(imp.supplier.ropSupplier).toMatchObject({ value: 900, days: 8 });
    expect(imp.supplier.ropFs).toMatchObject({ value: 600, days: 5 });
    expect(imp.supplier.ropToPrincipal.unavailable).toBe('NOT_ON_ROUTE');
  });

  it('imported raw material: ROP to principal = CEILING(107.14 × 7 days, 100) = 800', () => {
    const rm = rops(
      pair({
        supplyArea: 'import',
        leadTimeSteps: [
          { step: 'orderToPrincipal', days: 7 },
          { step: 'machineQueue', days: 2 },
          { step: 'production', days: 4 },
          { step: 'shipment', days: 12 },
          { step: 'delivery', days: 3 }
        ]
      }),
      4
    );
    expect(rm.supplier.ropToPrincipal).toMatchObject({ value: 800, days: 7 });
    expect(rm.supplier.ropFs.unavailable).toBe('NOT_ON_ROUTE');
  });
});

describe('BL-196 — the level picks the ROP Fisik formula (DRC-D11, DRC-B5)', () => {
  it('level 4 (default) 400 · level 3 the same 400 · level 5 MDQ = MOQ 300 → 300 + 200 = 500 · level 6 JIT 1 day of LTP to a pallet → 240, no safety', () => {
    expect(rops(pair(), 4).ropFisik.value).toBe(400);
    expect(rops(pair(), 3).ropFisik.value).toBe(400);
    expect(rops(pair(), 5).ropFisik).toMatchObject({ value: 500, cycle: 300, level: 5 });
    expect(rops(pair(), 6).ropFisik).toMatchObject({ value: 240, cycle: 240, level: 6 });
    expect(OSIP_ROP_READ.jitDays).toBe(1);
  });

  it('Max follows the level: 5 → CEILING(500, 240) = 720; 6 → 240', () => {
    expect(rops(pair(), 5).max.value).toBe(720);
    expect(rops(pair(), 6).max.value).toBe(240);
  });

  it('levels 1 and 2 have no formula: level 4 is used, flagged', () => {
    const r = rops(pair(), 1);
    expect(r.ropFisik).toMatchObject({ value: 400, level: 4, levelFallback: true });
    expect(r.flags).toContain('LEVEL_FALLBACK');
  });

  it('level 6 needs no consumption (LTP only); without a pallet size it rounds to a unit, flagged', () => {
    const r = rops(pair({ consumption: [], koli: null }), 6);
    expect(r.ropFisik.value).toBe(108); // CEILING(107.14 × 1, 1)
    expect(r.flags).toContain('NO_PALLET_SIZE');
  });

  it('level 5 with no MOQ rounds to a unit, flagged NO_MDQ', () => {
    expect(rops(pair({ moq: 0 }), 5).flags).toContain('NO_MDQ');
  });
});

describe('BL-196 — Max rounding, local vs import, and the sheet variant', () => {
  it('deck: local rounds to koli, import to MOQ', () => {
    expect(rops(pair({ koli: 150 }), 4).max.value).toBe(450); // CEILING(400, 150)
    expect(rops(pair({ supplyArea: 'import', moq: 700 }), 4).max.value).toBe(1400); // CEILING(1,000, 700)
  });

  it('sheetGuidance: ROP Fisik 400 + its cycle 200 = 600', () => {
    expect(rops(pair(), 4, { ...OSIP_RULES, maxRule: 'sheetGuidance' }).max.value).toBe(600);
  });

  it('no koli on a local supplier: rounded to a unit, flagged', () => {
    const r = rops(pair({ koli: null }), 4);
    expect(r.max.value).toBe(400);
    expect(r.flags).toContain('NO_MAX_ROUNDING');
  });
});

describe('BL-196 — "Not available" names the missing input; nothing is invented', () => {
  it('no consumption: ROP Fisik and Max need the ROP Fisik safety; supplier ROPs need a demand', () => {
    const r = rops(pair({ consumption: [] }), 4);
    expect(r.ropOrder.value).toBe(3500);
    expect(r.ropFisik).toMatchObject({ value: null, unavailable: 'NO_FISIK_SAFETY' });
    expect(r.max).toEqual({ value: null, unavailable: 'NO_FISIK_SAFETY' });
    expect(r.supplier.ropSupplier.unavailable).toBe('NO_DEMAND');
  });

  it('no supply area: f is unknown, so ROP Fisik and Max are not shown', () => {
    const r = rops(pair({ supplyArea: null }), 4);
    expect(r.ropFisik.unavailable).toBe('NO_SUPPLY_AREA');
    expect(r.max.unavailable).toBe('NO_SUPPLY_AREA');
  });

  it('no LTP: no safety order, so no ROP Order', () => {
    expect(rops(pair({ ltp: [0, 0, 0, 0] }), 4).ropOrder).toMatchObject({
      value: null,
      unavailable: 'NO_SAFETY_ORDER'
    });
  });

  it('a source with no lead-time steps: every supplier-side ROP says so', () => {
    const r = rops(pair({ leadTimeSteps: [] }), 4);
    for (const k of /** @type {const} */ (['ropSupplier', 'ropFs', 'ropToPrincipal']))
      expect(r.supplier[k].unavailable).toBe('NO_LEAD_TIME_STEPS');
  });
});

describe('DRC-D11 — the level rule', () => {
  it('accepts 1 to 6; refuses anything else by name', () => {
    for (const ok of [1, 2, 3, 4, 5, 6]) expect(osipLevelRefusal(ok)).toBeNull();
    for (const bad of [0, 7, 4.5, '4', null, undefined])
      expect(osipLevelRefusal(bad)).toMatch(/^OSIP_LEVEL_INVALID/);
  });

  it('[Default C2] level 4 when nothing was set; else the latest row', () => {
    expect(osipLevelInForce([])).toEqual({ level: 4, source: 'default', setAt: null });
    expect(
      osipLevelInForce([
        { level: 5, source: 'planner', setAt: '2026-08-01T00:00:00.000Z' },
        { level: 6, source: 'classification', setAt: '2026-08-02T00:00:00.000Z' }
      ])
    ).toEqual({ level: 6, source: 'classification', setAt: '2026-08-02T00:00:00.000Z' });
  });
});

// ─── BL-198 — NPD ────────────────────────────────────────────────────────────

/**
 * @param {string} poNumber
 * @param {string} orderDate
 * @param {number} quantity
 * @param {string} [status]
 */
const line = (poNumber, orderDate, quantity, status = 'Confirmed') => ({
  poNumber,
  orderDate,
  status,
  quantity,
  valueOnly: false
});
/**
 * @param {string} poNumber
 * @param {string} receivedDate
 * @param {number} qtyAccepted
 * @param {string} [status]
 */
const gr = (poNumber, receivedDate, qtyAccepted, status = 'Posted to SAP') => ({
  poNumber,
  receivedDate,
  status,
  qtyAccepted
});

describe('BL-198 — the first order and when it was fulfilled (DRC-12a [Default D1])', () => {
  it('the first standing PO (earliest order date; a rejected PO never stood) is fulfilled when its accepted receipts reach its quantity', () => {
    const fo = firstOrder(
      [
        line('PO-REJ', '2026-05-01', 999, 'Rejected'),
        line('PO-2', '2026-06-10', 500),
        line('PO-1', '2026-06-01', 1000)
      ],
      [
        gr('PO-1', '2026-06-20', 400),
        gr('PO-1', '2026-06-25', 300, 'Under Inspection'), // not decided: not counted
        gr('PO-1', '2026-07-01', 600),
        gr('PO-2', '2026-06-21', 500)
      ]
    );
    expect(fo).toEqual({
      firstPo: 'PO-1',
      ordered: 1000,
      received: 1000,
      fulfilledOn: '2026-07-01',
      valueOnly: false
    });
  });

  it('partly received: not fulfilled; no PO at all: no first order', () => {
    expect(
      firstOrder([line('PO-1', '2026-06-01', 1000)], [gr('PO-1', '2026-06-20', 999)])
    ).toMatchObject({ received: 999, fulfilledOn: null });
    expect(firstOrder([], [])).toMatchObject({ firstPo: null, fulfilledOn: null });
  });

  it('a value-limit line carries no quantity: fulfilled when the PO reads Delivered or Closed', () => {
    const v = { ...line('PO-V', '2026-06-01', 0, 'Delivered'), valueOnly: true };
    expect(firstOrder([v], [gr('PO-V', '2026-06-15', 0)])).toMatchObject({
      valueOnly: true,
      fulfilledOn: '2026-06-15'
    });
    expect(firstOrder([{ ...v, status: 'Confirmed' }], [])).toMatchObject({ fulfilledOn: null });
  });
});

describe('BL-198 — each NPD switch', () => {
  const today = '2026-08-31';
  const open = firstOrder([line('PO-1', '2026-06-01', 1000)], []);
  const done = firstOrder([line('PO-1', '2026-06-01', 1000)], [gr('PO-1', '2026-07-01', 1000)]);

  it('firstOrderFulfilled (default): NPD until the first order is fully received; no order on record is NPD', () => {
    const base = { today, parentLaunches: [], parentFirstSales: [] };
    expect(npdTags({ ...base, firstOrder: open }).firstOrderFulfilled).toEqual({
      npd: true,
      basis: 'FIRST_ORDER_OPEN',
      until: null
    });
    expect(npdTags({ ...base, firstOrder: done }).firstOrderFulfilled).toEqual({
      npd: false,
      basis: 'FIRST_ORDER_FULFILLED',
      until: '2026-07-01'
    });
    expect(npdTags({ ...base, firstOrder: firstOrder([], []) }).firstOrderFulfilled.basis).toBe(
      'NO_ORDER'
    );
    expect(OSIP_ROP_READ.npdRule).toBe('firstOrderFulfilled');
    expect(NPD_RULES).toEqual(['firstOrderFulfilled', 'oneYearAfterLaunch', '52WeeksHistory']);
  });

  it('oneYearAfterLaunch: 365 days after the EARLIEST parent launch; no BOM parent is not NPD', () => {
    /** @param {string[]} parentLaunches */
    const tag = (parentLaunches) =>
      npdTags({ today, firstOrder: open, parentLaunches, parentFirstSales: [] }).oneYearAfterLaunch;
    expect(tag(['2025-11-24'])).toEqual({
      npd: true,
      basis: 'WITHIN_LAUNCH_YEAR',
      until: '2026-11-24'
    });
    expect(tag(['2025-11-24', '2022-07-04'])).toEqual({
      npd: false,
      basis: 'LAUNCH_YEAR_PASSED',
      until: '2023-07-04'
    });
    expect(tag([])).toEqual({ npd: false, basis: 'NO_BOM', until: null });
  });

  it('52WeeksHistory: NPD while the longest parent sales history is under 52 weeks; no sales is NPD', () => {
    /** @param {(string | null)[]} parentFirstSales */
    const tag = (parentFirstSales) =>
      npdTags({ today, firstOrder: open, parentLaunches: [], parentFirstSales })['52WeeksHistory'];
    expect(tag(['2025-12-01'])).toEqual({ npd: true, basis: 'SHORT_HISTORY', until: '2026-11-30' });
    expect(tag(['2025-12-01', '2024-01-01'])).toMatchObject({ npd: false, basis: 'FULL_HISTORY' });
    expect(tag([null])).toEqual({ npd: true, basis: 'NO_HISTORY', until: null });
    expect(tag([])).toMatchObject({ npd: false, basis: 'NO_BOM' });
  });
});

describe('BL-198 — while NPD, ROP Fisik demand is the NPD branch of fisikDemand', () => {
  it('highest LTP of the next 3 months 2,100 a week → 300 a day; safety CEILING(300, 100) = 300; ROP Fisik 300 + 300 = 600 — no consumption needed', () => {
    const input = pair({ consumption: [], ltpNext3m: [700, 2100, 1400], npd: true });
    const safety = osipSafety(input);
    expect(safety.fisik).toMatchObject({ demandPerDay: 300, value: 300, unavailable: null });
    expect(osipRops(input, safety, 4).ropFisik.value).toBe(600);
  });

  it('an NPD material with no LTP over the next 3 months says so', () => {
    const safety = osipSafety(pair({ ltpNext3m: [0, 0], npd: true }));
    expect(safety.fisik).toMatchObject({ value: null, unavailable: 'NO_LTP' });
  });
});

describe('BL-198 — the review task appears once when the tag drops, and not again', () => {
  const RULE = /** @type {const} */ ('firstOrderFulfilled');
  /** @type {NpdTag} */
  const NPD = { npd: true, basis: 'FIRST_ORDER_OPEN', until: null };
  /** @type {NpdTag} */
  const DONE = { npd: false, basis: 'FIRST_ORDER_FULFILLED', until: '2026-08-20' };
  /** @param {string} code @param {NpdTag} tag */
  const stampTag = (code, tag) => stamp(tag, { materialCode: code });
  /**
   * @param {NpdObservation[]} ledger
   * @param {Record<string, NpdTag>} tags
   * @param {Record<string, number>} [levels]
   */
  const observe = (ledger, tags, levels = {}) => [
    ...ledger,
    ...npdObservations(
      ledger,
      new Map(Object.entries(tags)),
      RULE,
      '2026-08-31T12:00:00.000Z',
      stampTag,
      (c) => levels[c] ?? 0
    )
  ];

  it('a first sight is a baseline: a tag already dropped raises nothing', () => {
    const l = observe([], { A: NPD, B: DONE });
    expect(l.map((r) => [r.materialCode, r.npd, r.dropped])).toEqual([
      ['A', true, false],
      ['B', false, false]
    ]);
    expect(openNpdReviews(l, () => 0)).toEqual([]);
    // Stamped with its inputs and the rules version (DRC-D16).
    expect(l[0].tag.rulesVersion).toMatch(/^osip-/);
  });

  it('the drop raises one task; looking again adds nothing; the planner confirming the level closes it for good', () => {
    let l = observe([], { A: NPD });
    l = observe(l, { A: DONE });
    expect(openNpdReviews(l, () => 0)).toEqual([
      { materialCode: 'A', droppedAt: '2026-08-31T12:00:00.000Z', until: '2026-08-20' }
    ]);
    const after = observe(l, { A: DONE });
    expect(after).toHaveLength(l.length); // unchanged tag → no row
    expect(openNpdReviews(after, () => 0)).toHaveLength(1);
    // A planner level row after the drop closes it, and it never comes back.
    expect(openNpdReviews(after, () => 1)).toEqual([]);
    expect(openNpdReviews(observe(after, { A: DONE }, { A: 1 }), () => 1)).toEqual([]);
  });

  it('a level row recorded BEFORE the drop does not close it (a count, not a clock)', () => {
    let l = observe([], { A: NPD }, { A: 1 });
    l = observe(l, { A: DONE }, { A: 1 });
    expect(openNpdReviews(l, () => 1).map((r) => r.materialCode)).toEqual(['A']);
  });
});
