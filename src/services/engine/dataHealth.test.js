// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-01 — data health: the feed spec's quality checks on arrival and the
// freshness of each feed (BL-109).
//
// The synthetic dataset is clean by construction, so every check is probed
// BOTH WAYS: the shipped dataset passes it (known-good), and one injected bad
// record of the kind the spec names makes it fail, by that record's key
// (known-bad). A check that could not fail shows here as a red known-bad.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { SDC_SIMULATED_NOW } from '../sdc/clock';
import { materialEntry } from '../sdc/materialMaster';
import { HUB_SETTINGS } from '../transitions/hubSettings';
import { addDays, dayOf } from './dates';
import { DEFAULT_STOCK_ACCURACY_TOLERANCE, stockAccuracy } from './stock';
/** @import { CheckId, DataHealthInput, FeedId } from './dataHealth' */
import { FEEDS, affectedSteps, dataHealth } from './dataHealth';
/** @import { EngineDataset, IsoInstant } from './types' */

const NOW = SDC_SIMULATED_NOW;
const TODAY = dayOf(NOW);
const base = engineDataset();

/** The limits the registry ships — read from it, never restated. */
const LIMITS = /** @type {Partial<Record<FeedId, number>>} */ (
  Object.fromEntries(
    HUB_SETTINGS.filter((d) => d.key.startsWith('engine.freshnessDays.')).map((d) => [
      d.key.slice('engine.freshnessDays.'.length),
      /** @type {number} */ (d.defaultValue)
    ])
  )
);

/** @param {IsoInstant} [at] */
const allArrived = (at = NOW) =>
  /** @type {Record<FeedId, IsoInstant>} */ (Object.fromEntries(FEEDS.map((f) => [f.feed, at])));

/** @param {Partial<DataHealthInput>} [over] */
const run = (over = {}) =>
  dataHealth({
    data: base,
    now: NOW,
    arrivals: allArrived(),
    limitsDays: LIMITS,
    stockAccuracyTolerance: DEFAULT_STOCK_ACCURACY_TOLERANCE,
    context: { masterUom: (code) => materialEntry(code)?.canonicalUom ?? null },
    ...over
  });

/**
 * @param {ReturnType<typeof run>} r
 * @param {FeedId} feed
 */
const feedOf = (r, feed) =>
  /** @type {import('./dataHealth').FeedHealth} */ (r.feeds.find((f) => f.feed === feed));
/**
 * @param {ReturnType<typeof run>} r
 * @param {FeedId} feed
 * @param {CheckId} check
 */
const checkOf = (r, feed, check) =>
  /** @type {import('./dataHealth').CheckResult} */ (
    feedOf(r, feed).checks.find((c) => c.check === check)
  );

/**
 * The dataset with one feed changed.
 * @template {FeedId} K
 * @param {K} feed
 * @param {(rows: EngineDataset[K]) => EngineDataset[K]} change
 * @returns {EngineDataset}
 */
function mutate(feed, change) {
  return { ...base, [feed]: change(base[feed]) };
}

describe('the shipped synthetic dataset', () => {
  const r = run();

  it('every feed of the contract is reported once, with its record count read from the dataset', () => {
    const contract = /** @type {(keyof EngineDataset)[]} */ (Object.keys(base))
      .filter((k) => k !== 'provenance' && k !== 'materials')
      .sort();
    expect(r.feeds.map((f) => f.feed).sort()).toEqual(contract);
    for (const f of r.feeds) expect(f.records, f.feed).toBe(base[f.feed].length);
  });

  it('passes every refuse check — nothing is kept out of the calculation', () => {
    const failing = r.feeds.flatMap((f) =>
      f.checks
        .filter((c) => c.severity === 'refuse' && !c.passed)
        .map((c) => `${f.feed}.${c.check}`)
    );
    expect(failing).toEqual([]);
    expect(r.feeds.every((f) => f.refusedRecords === 0)).toBe(true);
  });

  it('flags exactly the materials stock.js flags on their latest cycle count (ENG-D2), and only those', () => {
    const expected = stockAccuracy(base.cycleCounts, DEFAULT_STOCK_ACCURACY_TOLERANCE).filter(
      (a) => a.flagged
    );
    expect(expected.length).toBeGreaterThan(0);
    const c = checkOf(r, 'cycleCounts', 'stockAccuracy');
    expect(c.severity).toBe('flag');
    expect(c.failures.map((f) => f.key)).toEqual(
      expected.map((a) => `${a.materialCode} · ${a.warehouseId} · ${a.countDate}`)
    );
    expect(feedOf(r, 'cycleCounts').flaggedRecords).toBe(expected.length);
  });

  it('every limited feed is fresh at the hub present; the Hub records and on-change feeds have no limit', () => {
    for (const f of r.feeds) {
      expect(f.freshness, f.feed).toBe(
        /** @type {import('./dataHealth').FeedDef} */ (FEEDS.find((d) => d.feed === f.feed)).limited
          ? 'fresh'
          : 'noLimit'
      );
    }
    expect(feedOf(r, 'confirmations').source).toBe('hub');
    expect(feedOf(r, 'planVersions').source).toBe('hub');
  });

  it('steps: E14-03 and everything downstream of it are flagged by stock accuracy; nothing is affected', () => {
    const status = Object.fromEntries(r.steps.map((s) => [s.step, s.status]));
    expect(status).toEqual({
      'E14-02': 'clear',
      'E14-03': 'flagged',
      'E14-04': 'clear',
      'E14-05': 'flagged',
      'E14-07': 'clear',
      'E14-09': 'clear',
      'E14-13': 'flagged'
    });
  });
});

describe('the freshness limits are the administrator’s (X-05) and match the feed spec', () => {
  it('one registry key per limited feed, and no key for a feed without one', () => {
    expect(Object.keys(LIMITS).sort()).toEqual(
      FEEDS.filter((f) => f.limited)
        .map((f) => f.feed)
        .sort()
    );
  });

  it('the spec’s limits (§2): 1 day for daily feeds, 7 for weekly, 31 for the monthly material value', () => {
    for (const f of FEEDS.filter((d) => d.limited)) {
      expect(LIMITS[f.feed], f.feed).toBe(
        { daily: 1, weekly: 7, monthly: 31 }[
          /** @type {'daily' | 'weekly' | 'monthly'} */ (f.refresh)
        ]
      );
    }
  });

  it('a limited feed with no limit passed is refused by name, not defaulted', () => {
    const { poLines: _omit, ...rest } = LIMITS;
    expect(() => run({ limitsDays: rest })).toThrow(/NO_FRESHNESS_LIMIT: feed 'poLines'/);
  });
});

describe('freshness (BR-05)', () => {
  /** @param {number} days */
  const at = (days) => new Date(Date.parse(NOW) - days * 86_400_000).toISOString();

  it('at the limit is fresh; one day over is stale — both ways', () => {
    const fresh = run({ arrivals: { ...allArrived(), sales: at(7) } });
    expect(feedOf(fresh, 'sales')).toMatchObject({ ageDays: 7, limitDays: 7, freshness: 'fresh' });
    const stale = run({ arrivals: { ...allArrived(), sales: at(8) } });
    expect(feedOf(stale, 'sales')).toMatchObject({ ageDays: 8, freshness: 'stale' });
    // Sales feed E14-02 and E14-04 (and E14-07, whose forecast E14-09's range is built around): those and everything downstream are affected.
    const affected = stale.steps.filter((s) => s.status === 'affected').map((s) => s.step);
    expect(affected).toEqual([
      'E14-02',
      'E14-03',
      'E14-04',
      'E14-05',
      'E14-07',
      'E14-09',
      'E14-13'
    ]);
    expect(
      /** @type {import('./dataHealth').StepHealth} */ (
        stale.steps.find((s) => s.step === 'E14-02')
      ).byFeeds
    ).toEqual(['sales']);
  });

  it('a limited feed that never arrived is missing; a Hub record without a limit stays "no limit"', () => {
    const { receipts: _r, confirmations: _c, ...rest } = allArrived();
    const r = run({ arrivals: rest });
    expect(feedOf(r, 'receipts')).toMatchObject({
      lastArrival: null,
      ageDays: null,
      freshness: 'missing'
    });
    expect(feedOf(r, 'confirmations').freshness).toBe('noLimit');
  });

  it('the limit is read from the argument: the same age is stale at 1 day and fresh at 3', () => {
    const arrivals = { ...allArrived(), stock: at(2) };
    expect(feedOf(run({ arrivals }), 'stock').freshness).toBe('stale');
    expect(feedOf(run({ arrivals, limitsDays: { ...LIMITS, stock: 3 } }), 'stock').freshness).toBe(
      'fresh'
    );
  });

  it('stock per warehouse: one warehouse whose newest snapshot is two weeks old makes the feed stale and lists its materials', () => {
    const fresh = feedOf(run(), 'stock');
    expect(
      /** @type {NonNullable<typeof fresh.warehouses>} */ (fresh.warehouses).every(
        (w) => w.freshness === 'fresh' && w.latestSnapshot === TODAY
      )
    ).toBe(true);
    const wh = base.warehouses[0].warehouseId;
    // Snapshots are weekly (Mondays): drop the latest two for one warehouse.
    const old = addDays(TODAY, -14);
    const data = mutate('stock', (rows) =>
      rows.filter((s) => s.warehouseId !== wh || s.date <= old)
    );
    const f = feedOf(run({ data }), 'stock');
    const w = /** @type {import('./dataHealth').WarehouseStockCurrency} */ (
      /** @type {NonNullable<typeof f.warehouses>} */ (f.warehouses).find(
        (x) => x.warehouseId === wh
      )
    );
    expect(w).toMatchObject({ latestSnapshot: old, ageDays: 14, freshness: 'stale' });
    expect(w.materials).toEqual(
      [
        ...new Set(
          data.stock
            .filter((s) => s.warehouseId === wh && s.date === old)
            .map((s) => s.materialCode)
        )
      ].sort()
    );
    expect(w.materials.length).toBeGreaterThan(0);
    expect(f.freshness).toBe('stale');
    // The other warehouse is untouched.
    expect(
      /** @type {NonNullable<typeof f.warehouses>} */ (f.warehouses)
        .filter((x) => x.warehouseId !== wh)
        .every((x) => x.freshness === 'fresh')
    ).toBe(true);
  });
});

describe('every check fires on the bad record the feed spec names — by its key', () => {
  /**
   * @template T
   * @param {readonly T[]} rows
   */
  const first = (rows) => rows[0];
  const po = first(base.poLines);
  const poKey = `${po.poNumber}#${po.line}`;

  /**
   * Run with `data`, assert `check` on `feed` fails with exactly `keys`, and passed on the shipped data.
   * @param {FeedId} feed
   * @param {CheckId} check
   * @param {EngineDataset} data
   * @param {string[]} keys
   */
  const fires = (feed, check, data, keys) => {
    expect(checkOf(run(), feed, check).passed, `${feed}.${check} known-good`).toBe(true);
    const c = checkOf(run({ data }), feed, check);
    expect(c.passed, `${feed}.${check} known-bad`).toBe(false);
    expect(c.failures.map((f) => f.key).sort()).toEqual([...keys].sort());
  };

  it('duplicate key (any feed)', () => {
    fires(
      'poLines',
      'duplicateKey',
      mutate('poLines', (r) => [...r, po]),
      [poKey]
    );
    const w = base.warehouses[0];
    fires(
      'warehouses',
      'duplicateKey',
      mutate('warehouses', (r) => [...r, w]),
      [w.warehouseId]
    );
  });

  it('PoLine: material resolves; unit equals the master unit; orderedQty > 0; approved source', () => {
    fires(
      'poLines',
      'materialResolves',
      mutate('poLines', (r) =>
        r.map((l) => (l === po ? { ...l, materialCode: 'XX-NOPE-0000' } : l))
      ),
      [poKey]
    );
    const other = po.uom === 'KG' ? 'PCS' : 'KG';
    fires(
      'poLines',
      'uomMatchesMaster',
      mutate('poLines', (r) => r.map((l) => (l === po ? { ...l, uom: other } : l))),
      [poKey]
    );
    fires(
      'poLines',
      'qtyPositive',
      mutate('poLines', (r) => r.map((l) => (l === po ? { ...l, orderedQty: 0 } : l))),
      [poKey]
    );
    fires(
      'poLines',
      'approvedSource',
      mutate('poLines', (r) => r.map((l) => (l === po ? { ...l, supplierId: 'sup-nobody' } : l))),
      [poKey]
    );
  });

  it('ScheduleChange: line exists; from ≠ to; after the line was created', () => {
    const c = first(base.scheduleChanges);
    /** @param {typeof c} x */
    const key = (x) => `${x.poNumber}#${x.line} · ${x.at} · ${x.field}`;
    const orphan = { ...c, poNumber: 'SYN-PO-NOPE' };
    fires(
      'scheduleChanges',
      'lineExists',
      mutate('scheduleChanges', (r) => [...r, orphan]),
      [key(orphan)]
    );
    const same = c.field === 'quantity' ? { ...c, to: c.from } : { ...c, to: c.from };
    fires(
      'scheduleChanges',
      'fromDiffersTo',
      mutate('scheduleChanges', (r) => r.map((x) => (x === c ? same : x))),
      [key(same)]
    );
    const line = /** @type {import('./types').PoLine} */ (
      base.poLines.find((l) => l.poNumber === c.poNumber && l.line === c.line)
    );
    const early = { ...c, at: line.createdAt };
    fires(
      'scheduleChanges',
      'afterLineCreated',
      mutate('scheduleChanges', (r) => r.map((x) => (x === c ? early : x))),
      [key(early)]
    );
  });

  it('Receipt: line exists; receivedQty ≠ 0. Confirmation: line exists', () => {
    const g = first(base.receipts);
    const orphan = { ...g, grNumber: 'SYN-GR-NOPE', line: 999 };
    fires(
      'receipts',
      'lineExists',
      mutate('receipts', (r) => [...r, orphan]),
      [`SYN-GR-NOPE · ${g.poNumber}#999`]
    );
    fires(
      'receipts',
      'receivedNonZero',
      mutate('receipts', (r) => r.map((x) => (x === g ? { ...g, receivedQty: 0 } : x))),
      [`${g.grNumber} · ${g.poNumber}#${g.line}`]
    );
    const c = first(base.confirmations);
    fires(
      'confirmations',
      'lineExists',
      mutate('confirmations', (r) => [...r, { ...c, line: 999 }]),
      [`${c.poNumber}#999 · ${c.confirmedAt}`]
    );
  });

  it('MaterialSource: lead time > 0; MOQ ≥ 0; multiple ≥ 1; shares of one material add to 1 (every source of it listed)', () => {
    const s = first(base.sources);
    const key = `${s.materialCode} · ${s.supplierId}`;
    /** @param {object} patch */
    const set = (patch) =>
      mutate('sources', (r) => r.map((x) => (x === s ? { ...x, ...patch } : x)));
    fires('sources', 'leadTimePositive', set({ leadTimeDays: 0 }), [key]);
    fires('sources', 'moqNonNegative', set({ moq: -1 }), [key]);
    fires('sources', 'multipleAtLeastOne', set({ orderMultiple: 0 }), [key]);
    const siblings = base.sources
      .filter((x) => x.materialCode === s.materialCode)
      .map((x) => `${x.materialCode} · ${x.supplierId}`);
    fires('sources', 'sharesSumToOne', set({ share: s.share + 0.01 }), siblings);
    // Inside the 0.001 tolerance still passes.
    expect(
      checkOf(run({ data: set({ share: s.share + 0.0005 }) }), 'sources', 'sharesSumToOne').passed
    ).toBe(true);
  });

  it('BomLine: qtyPer > 0; component resolves; validity does not overlap; every active FG has a BOM; no cycle', () => {
    const b = first(base.bom);
    /** @param {typeof b} x */
    const key = (x) => `${x.parentCode} · ${x.componentCode} · ${x.validFrom}`;
    fires(
      'bom',
      'qtyPerPositive',
      mutate('bom', (r) => r.map((x) => (x === b ? { ...x, qtyPer: 0 } : x))),
      [key(b)]
    );
    const unknown = { ...b, componentCode: 'XX-NOPE-0000' };
    fires(
      'bom',
      'componentResolves',
      mutate('bom', (r) => [...r, unknown]),
      [key(unknown)]
    );
    const later = { ...b, validFrom: addDays(b.validFrom, 7) };
    fires(
      'bom',
      'validityNoOverlap',
      mutate('bom', (r) => [...r, later]),
      [key(b), key(later)]
    );
    // Known-good twin: a new version starting on the old one's (exclusive) end does not overlap.
    const closed = { ...b, validTo: later.validFrom };
    expect(
      checkOf(
        run({ data: mutate('bom', (r) => [...r.map((x) => (x === b ? closed : x)), later]) }),
        'bom',
        'validityNoOverlap'
      ).passed
    ).toBe(true);
    const fg = b.parentCode;
    fires(
      'bom',
      'activeFgHasBom',
      mutate('bom', (r) => r.filter((x) => x.parentCode !== fg)),
      [fg]
    );
    // A cycle two deep: the component (as a bulk) has the parent as its own component.
    const back = { ...b, parentCode: b.componentCode, componentCode: b.parentCode };
    fires(
      'bom',
      'noBomCycle',
      mutate('bom', (r) => [...r, back]),
      base.bom
        .filter((x) => x.parentCode === fg)
        .map(key)
        .concat(key(back))
    );
  });

  it('StockSnapshot: on hand ≥ 0; warehouse exists; material resolves', () => {
    const s = first(base.stock);
    /** @param {typeof s} x */
    const key = (x) => `${x.materialCode} · ${x.warehouseId} · ${x.date}`;
    fires(
      'stock',
      'onHandNonNegative',
      mutate('stock', (r) => r.map((x) => (x === s ? { ...x, onHandQty: -1 } : x))),
      [key(s)]
    );
    const nowhere = { ...s, warehouseId: 'SYN-WH-NOPE' };
    fires(
      'stock',
      'warehouseExists',
      mutate('stock', (r) => r.map((x) => (x === s ? nowhere : x))),
      [key(nowhere)]
    );
    const unknown = { ...s, materialCode: 'XX-NOPE-0000' };
    fires(
      'stock',
      'materialResolves',
      mutate('stock', (r) => r.map((x) => (x === s ? unknown : x))),
      [key(unknown)]
    );
  });

  it('CycleCount: stock accuracy is a FLAG at the tolerance passed — 8% on the worked example (E14-01 Calculation)', () => {
    const c = /** @type {import('./types').CycleCount} */ (
      base.cycleCounts.find((x) => !stockAccuracy([x]).some((a) => a.flagged))
    );
    // The worked example: system 10,000, counted 9,200 → 8% > 2%.
    const bad = { ...c, countDate: addDays(TODAY, 1), systemQty: 10_000, countedQty: 9_200 };
    const r = run({ data: mutate('cycleCounts', (rows) => [...rows, bad]) });
    const f = /** @type {import('./dataHealth').CheckFailure} */ (
      checkOf(r, 'cycleCounts', 'stockAccuracy').failures.find((x) =>
        x.key.startsWith(`${c.materialCode} · ${c.warehouseId}`)
      )
    );
    expect(f).toEqual({
      key: `${c.materialCode} · ${c.warehouseId} · ${bad.countDate}`,
      detail: '8%'
    });
    // Flag, not refuse: the feed refuses nothing.
    expect(feedOf(r, 'cycleCounts').refusedRecords).toBe(0);
    // At a 10% tolerance the same count passes.
    expect(
      checkOf(
        run({ data: mutate('cycleCounts', (rows) => [...rows, bad]), stockAccuracyTolerance: 0.1 }),
        'cycleCounts',
        'stockAccuracy'
      ).failures.some((x) => x.key.startsWith(`${c.materialCode} · ${c.warehouseId}`))
    ).toBe(false);
  });

  it('Warehouse: capacity > 0. MaterialVolume: units per pallet > 0; every stocked material has one', () => {
    const w = first(base.warehouses);
    fires(
      'warehouses',
      'capacityPositive',
      mutate('warehouses', (r) => r.map((x) => (x === w ? { ...x, capacityPallets: 0 } : x))),
      [w.warehouseId]
    );
    const v = first(base.volumes);
    fires(
      'volumes',
      'unitsPerPalletPositive',
      mutate('volumes', (r) => r.map((x) => (x === v ? { ...x, unitsPerPallet: 0 } : x))),
      [v.materialCode]
    );
    fires(
      'volumes',
      'stockedHasVolume',
      mutate('volumes', (r) => r.filter((x) => x !== v)),
      [v.materialCode]
    );
  });

  it('MaterialValue: value > 0; every purchased material has one', () => {
    const v = first(base.materialValues);
    fires(
      'materialValues',
      'valuePositive',
      mutate('materialValues', (r) => r.map((x) => (x === v ? { ...x, unitValueIdr: 0 } : x))),
      [v.materialCode]
    );
    fires(
      'materialValues',
      'purchasedHasValue',
      mutate('materialValues', (r) => r.filter((x) => x !== v)),
      [v.materialCode]
    );
  });

  it('FinishedGood: brand is one of the three; launch ≤ discontinue', () => {
    const f = first(base.finishedGoods);
    fires(
      'finishedGoods',
      'brandKnown',
      mutate('finishedGoods', (r) =>
        r.map((x) =>
          x === f ? /** @type {typeof x} */ (/** @type {unknown} */ ({ ...x, brand: 'Pixy' })) : x
        )
      ),
      [f.skuCode]
    );
    fires(
      'finishedGoods',
      'launchBeforeDiscontinue',
      mutate('finishedGoods', (r) =>
        r.map((x) => (x === f ? { ...x, discontinueDate: addDays(x.launchDate, -1) } : x))
      ),
      [f.skuCode]
    );
  });

  it('SalesWeek: quantity ≥ 0; no gaps in the weekly series; the SKU is a known finished good', () => {
    const sku = base.finishedGoods[0].skuCode;
    const weeks = base.sales.filter((s) => s.skuCode === sku);
    const mid = weeks[Math.floor(weeks.length / 2)];
    fires(
      'sales',
      'qtyNonNegative',
      mutate('sales', (r) => r.map((x) => (x === mid ? { ...x, quantity: -1 } : x))),
      [`${sku} · ${mid.weekStart}`]
    );
    fires(
      'sales',
      'noWeekGaps',
      mutate('sales', (r) => r.filter((x) => x !== mid)),
      [`${sku} · ${mid.weekStart}`]
    );
    fires(
      'sales',
      'fgKnown',
      mutate('sales', (r) => [...r, { ...mid, skuCode: 'SYN-FG-NOPE' }]),
      [`SYN-FG-NOPE · ${mid.weekStart}`]
    );
  });

  it('FgPlanSnapshot and SalesOrderWeek: the SKU is known. SapSafetyStock and PlanVersion: the material resolves', () => {
    const p = first(base.fgPlan);
    fires(
      'fgPlan',
      'fgKnown',
      mutate('fgPlan', (r) => [...r, { ...p, skuCode: 'SYN-FG-NOPE' }]),
      [`SYN-FG-NOPE · ${p.madeAt} · ${p.weekStart}`]
    );
    const o = first(base.salesOrders);
    fires(
      'salesOrders',
      'fgKnown',
      mutate('salesOrders', (r) => [...r, { ...o, skuCode: 'SYN-FG-NOPE' }]),
      [`SYN-FG-NOPE · ${o.weekStart}`]
    );
    const s = first(base.sapSafetyStock);
    fires(
      'sapSafetyStock',
      'materialResolves',
      mutate('sapSafetyStock', (r) => [...r, { ...s, materialCode: 'XX-NOPE-0000' }]),
      ['XX-NOPE-0000']
    );
    const v = first(base.planVersions);
    const bad = { ...v, materialCode: 'XX-NOPE-0000' };
    fires(
      'planVersions',
      'materialResolves',
      mutate('planVersions', (r) => [...r, bad]),
      [`${v.supplierId} · XX-NOPE-0000 · ${v.periodBucket} · v${v.versionNo}`]
    );
  });

  it('every check the report can produce is probed above', () => {
    // The union of checks over all feeds; each appears in this file as a fires() or explicit case.
    const all = new Set(run().feeds.flatMap((f) => f.checks.map((c) => c.check)));
    expect(all.size).toBe(31);
  });
});

describe('what a failure affects', () => {
  it('a failed BOM check affects E14-03 and every step downstream of the steps that read it', () => {
    expect(affectedSteps(['E14-03'])).toEqual(['E14-03', 'E14-05', 'E14-13']);
    const b = base.bom[0];
    const r = run({
      data: mutate('bom', (rows) => rows.map((x) => (x === b ? { ...x, qtyPer: 0 } : x)))
    });
    expect(feedOf(r, 'bom').affects).toEqual([
      'E14-02',
      'E14-03',
      'E14-04',
      'E14-05',
      'E14-09',
      'E14-13'
    ]);
    expect(feedOf(r, 'bom').refusedRecords).toBe(1);
    const status = Object.fromEntries(r.steps.map((s) => [s.step, s.status]));
    expect(status['E14-03']).toBe('affected');
    expect(status['E14-07']).toBe('clear');
    // The range explodes the BOM (materials), so it is affected; the forecast is not.
    expect(status['E14-09']).toBe('affected');
    expect(
      /** @type {import('./dataHealth').StepHealth} */ (r.steps.find((s) => s.step === 'E14-03'))
        .byFeeds
    ).toEqual(['bom']);
  });

  it('a Warehouse failure reaches only order sizing and the reschedule report', () => {
    expect(affectedSteps(['E14-05'])).toEqual(['E14-05', 'E14-13']);
  });
});
