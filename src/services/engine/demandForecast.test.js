import { describe, it, expect } from 'vitest';
/** @import { MainModel } from './demandForecast' */
import {
  FORECAST_HORIZON_WEEKS,
  demandForecast,
  fillStockouts,
  forecastAsPlanSnapshot
} from './demandForecast';
import { addDays } from './dates';
import { RAMADAN_TABLE } from './eventCalendar';
import { defaultRequirementOptions, materialRequirement } from './requirement';
/** @import { Brand, FgPlanSnapshot, FinishedGood, SalesWeek } from './types' */
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { sdcClock } from '../sdc/clock';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 — the pipeline: which method each SKU gets, OEM left out, SKU,
// brand and total adding up with no negative value, stock-outs not read as
// demand, the main model's slot, and determinism on the synthetic dataset.
// ─────────────────────────────────────────────────────────────────────────────

const AS_OF = '2026-08-31'; // a Monday
/**
 * @param {string} skuCode
 * @param {Brand} brand
 * @param {Partial<FinishedGood>} [extra]
 * @returns {FinishedGood}
 */
const fg = (skuCode, brand, extra = {}) => ({
  skuCode,
  name: `${skuCode} (test)`,
  brand,
  category: 'Skincare',
  launchDate: '2024-01-01',
  ...extra
});
/**
 * `weeks` weekly rows ending the week before AS_OF, quantity by week index.
 * @param {string} skuCode
 * @param {number} weeks
 * @param {(i: number) => number} qty
 * @param {(i: number) => boolean} [stockout]
 * @returns {SalesWeek[]}
 */
const rows = (skuCode, weeks, qty, stockout = () => false) =>
  Array.from({ length: weeks }, (_, i) => ({
    skuCode,
    weekStart: addDays(AS_OF, -(weeks - i) * 7),
    quantity: qty(i),
    stockout: stockout(i)
  }));

/** @param {number} i */
const smooth = (i) => 1000 + ((i * 37) % 11) * 20; // no zero week
/** @param {number} i */
const everyThird = (i) => (i % 3 === 0 ? 300 + ((i * 7) % 5) * 40 : 0); // p = 3, sizes vary

/** @type {FinishedGood[]} */
const FGS = [
  fg('A-SMOOTH', 'Wardah'),
  fg('B-SLOW', 'Wardah'),
  fg('C-DYING', 'Emina', { discontinueDate: '2026-12-07' }),
  fg('D-LAUNCH', 'Emina', { launchDate: '2026-04-13' }),
  fg('E-ENDED', 'Emina', { discontinueDate: '2026-07-06' }),
  fg('F-OEM', 'Wardah', { oem: true }),
  fg('G-EVEN', 'Make Over')
];
/** @type {SalesWeek[]} */
const SALES = [
  ...rows('A-SMOOTH', 80, smooth),
  ...rows('B-SLOW', 80, everyThird),
  ...rows('C-DYING', 80, everyThird),
  ...rows('D-LAUNCH', 20, smooth),
  ...rows('E-ENDED', 60, smooth).filter((r) => r.weekStart < '2026-07-06'),
  ...rows('F-OEM', 80, smooth),
  // Sold 100 in three of every four weeks: p exactly 4/3, identical sizes (v = 0).
  ...rows('G-EVEN', 80, (i) => (i % 4 === 3 ? 0 : 100))
];
/**
 * SAP's plan made this Monday: 700 a week for the new SKU, 900 for A-SMOOTH.
 * @type {FgPlanSnapshot[]}
 */
const PLAN = Array.from({ length: FORECAST_HORIZON_WEEKS }, (_, i) =>
  addDays(AS_OF, i * 7)
).flatMap((w) => [
  { skuCode: 'D-LAUNCH', madeAt: AS_OF, weekStart: w, quantity: 700 },
  { skuCode: 'A-SMOOTH', madeAt: AS_OF, weekStart: w, quantity: 900 }
]);
const run = demandForecast({ finishedGoods: FGS, sales: SALES, fgPlan: PLAN, asOf: AS_OF });
/** @param {string} code */
const sku = (code) =>
  /** @type {import('./demandForecast').SkuForecast} */ (run.skus.find((s) => s.skuCode === code));

describe('which method each SKU gets (BR-02, BR-03, BR-04; E14-01 BR-04)', () => {
  it('smooth → Comb (the fallback); slow → SBA; slow and being discontinued → TSB; short history → SAP’s plan; ended → zero', () => {
    expect(sku('A-SMOOTH').method).toBe('comb');
    expect(sku('B-SLOW').method).toBe('sba');
    expect(sku('C-DYING').method).toBe('tsb');
    expect(sku('D-LAUNCH').method).toBe('newSkuSap');
    expect(sku('E-ENDED').method).toBe('discontinued');
    expect(sku('E-ENDED').forecast.every((v) => v === 0)).toBe(true);
  });

  it('Croston only where Kostenko–Hyndman favours it: identical sizes at exactly p = 4/3', () => {
    const g = sku('G-EVEN');
    expect(g.meanInterval).toBeCloseTo(4 / 3, 12);
    expect(g.detail.v).toBe(0);
    expect(g.method).toBe('croston');
  });

  it('every SKU has a forecast and a named method (AC-01), and nothing is labelled the main model when none is supplied', () => {
    expect(run.skus.map((s) => s.skuCode)).toEqual([
      'A-SMOOTH',
      'B-SLOW',
      'C-DYING',
      'D-LAUNCH',
      'E-ENDED',
      'G-EVEN'
    ]);
    for (const s of run.skus) expect(s.forecast).toHaveLength(FORECAST_HORIZON_WEEKS);
    expect(run.mainModel).toBe('notBuilt');
    expect(run.methodCounts).toEqual({
      main: 0,
      comb: 1,
      sba: 1,
      croston: 1,
      tsb: 1,
      newSkuSap: 1,
      discontinued: 1
    });
  });

  it('the Comb carries Theta beside it for E14-10 to choose between; the slow methods and SAP’s plan do not', () => {
    expect(sku('A-SMOOTH').theta).toHaveLength(FORECAST_HORIZON_WEEKS);
    expect(sku('D-LAUNCH').theta).toBeNull();
    expect(sku('B-SLOW').theta).toBeNull();
  });

  it('a new SKU (under 52 weeks) keeps SAP’s plan until E14-08 exists, and the reconciliation holds it there', () => {
    const d = sku('D-LAUNCH');
    expect(d.historyWeeks).toBe(20);
    expect(d.base.every((v) => v === 700)).toBe(true);
    expect(d.forecast.every((v) => v === 700)).toBe(true);
    // Known-good control: a SKU with a year of history is forecast, not copied from SAP (900).
    expect(sku('A-SMOOTH').forecast.some((v) => v !== 900)).toBe(true);
  });

  it('a new SKU with no SAP plan is forecast as 0, not invented', () => {
    const r = demandForecast({ finishedGoods: FGS, sales: SALES, asOf: AS_OF });
    expect(
      /** @type {import('./demandForecast').SkuForecast} */ (
        r.skus.find((s) => s.skuCode === 'D-LAUNCH')
      ).forecast.every((v) => v === 0)
    ).toBe(true);
  });
});

describe('OEM products are not forecast (ENG-D20)', () => {
  it('F-OEM is listed as excluded and appears at no level', () => {
    expect(run.excludedOem).toEqual([{ skuCode: 'F-OEM', name: 'F-OEM (test)', brand: 'Wardah' }]);
    expect(run.skus.some((s) => s.skuCode === 'F-OEM')).toBe(false);
    expect(run.total.skuCodes).not.toContain('F-OEM');
    expect(
      /** @type {import('./demandForecast').LevelForecast} */ (
        run.brands.find((b) => b.key === 'Wardah')
      ).skuCodes
    ).toEqual(['A-SMOOTH', 'B-SLOW']);
  });

  it('known-good control: the same SKU without the flag is forecast', () => {
    const r = demandForecast({
      finishedGoods: FGS.map((f) => (f.skuCode === 'F-OEM' ? { ...f, oem: false } : f)),
      sales: SALES,
      asOf: AS_OF
    });
    expect(r.excludedOem).toEqual([]);
    expect(
      /** @type {import('./demandForecast').SkuForecast} */ (
        r.skus.find((s) => s.skuCode === 'F-OEM')
      ).method
    ).toBe('comb');
  });
});

describe('levels add up with no negative value (AC-02, BR-04)', () => {
  it('each brand = Σ its SKUs and the total = Σ the brands, every week, in whole units, never negative', () => {
    for (let i = 0; i < run.weeks.length; i += 1) {
      for (const b of run.brands) {
        const skus = run.skus.filter((s) => s.brand === b.key);
        expect(b.forecast[i]).toBe(skus.reduce((a, s) => a + s.forecast[i], 0));
      }
      expect(run.total.forecast[i]).toBe(run.brands.reduce((a, b) => a + b.forecast[i], 0));
    }
    for (const s of run.skus)
      for (const v of s.forecast) expect(Number.isInteger(v) && v >= 0).toBe(true);
  });

  it('a SKU discontinued inside the horizon is zero from its end date, and the levels still add up', () => {
    const c = sku('C-DYING');
    const end = run.weeks.indexOf('2026-12-07');
    expect(end).toBeGreaterThan(0);
    expect(c.forecast.slice(end).every((v) => v === 0)).toBe(true);
    expect(c.forecast.slice(0, end).some((v) => v > 0)).toBe(true);
    expect(c.endsOn).toBe('2026-12-07');
    expect(sku('A-SMOOTH').endsOn).toBeNull();
    const emina = /** @type {import('./demandForecast').LevelForecast} */ (
      run.brands.find((b) => b.key === 'Emina')
    );
    expect(emina.forecast[end]).toBe(700); // only the new SKU, held at SAP's plan, is left
  });
});

describe('stock-outs are not demand (BR-06)', () => {
  it('a stock-out week is filled by the straight line between the in-stock weeks around it', () => {
    expect(fillStockouts([10, 0, 0, 40], [false, true, true, false])).toEqual([10, 20, 30, 40]);
    expect(fillStockouts([0, 50, 60], [true, false, false])).toEqual([50, 50, 60]);
  });

  it('a smooth SKU whose zero weeks are stock-outs stays smooth (Comb), not slow', () => {
    const sales = rows(
      'S',
      80,
      (i) => (i % 3 === 0 ? 0 : 1000),
      (i) => i % 3 === 0
    );
    const r = demandForecast({ finishedGoods: [fg('S', 'Wardah')], sales, asOf: AS_OF });
    expect(r.skus[0].method).toBe('comb');
    expect(r.skus[0].stockoutWeeks).toBe(27);
    // Known-bad control: the same zeros NOT flagged read as a slow SKU.
    const unflagged = demandForecast({
      finishedGoods: [fg('S', 'Wardah')],
      sales: sales.map((s) => ({ ...s, stockout: false })),
      asOf: AS_OF
    });
    expect(unflagged.skus[0].method).toBe('sba');
  });
});

describe('the main model slot (BR-01, AC-03)', () => {
  /** @type {MainModel} */
  const model = {
    beatsFallback: (code) => code === 'A-SMOOTH',
    forecast: (_code, history, horizon) => ({
      forecast: new Array(horizon).fill(1234),
      fitted: history.map((v) => v * 0.98)
    })
  };

  it('a supplied model is used only for the SKUs where it beat the fallback, and is labelled so', () => {
    const r = demandForecast({ finishedGoods: FGS, sales: SALES, asOf: AS_OF, mainModel: model });
    expect(r.mainModel).toBe('supplied');
    expect(r.skus.filter((s) => s.method === 'main').map((s) => s.skuCode)).toEqual(['A-SMOOTH']);
    expect(
      /** @type {import('./demandForecast').SkuForecast} */ (
        r.skus.find((s) => s.skuCode === 'A-SMOOTH')
      ).base.every((v) => v === 1234)
    ).toBe(true);
    expect(
      /** @type {import('./demandForecast').SkuForecast} */ (
        r.skus.find((s) => s.skuCode === 'B-SLOW')
      ).method
    ).toBe('sba');
  });
});

describe('on the synthetic dataset (seed 20260924)', () => {
  const data = engineDataset();
  const asOf = sdcClock.now().slice(0, 10);
  const synthetic = demandForecast({
    finishedGoods: data.finishedGoods,
    sales: data.sales,
    fgPlan: data.fgPlan,
    asOf
  });

  it('names the SKUs per method: 4 new SKUs on SAP’s plan, SYN-FG-008 ended, the rest Comb; none slow; none OEM', () => {
    /** @param {string} m */
    const by = (m) => synthetic.skus.filter((s) => s.method === m).map((s) => s.skuCode);
    expect(by('newSkuSap')).toEqual(['SYN-FG-005', 'SYN-FG-010', 'SYN-FG-015', 'SYN-FG-020']);
    for (const s of synthetic.skus.filter((x) => x.method === 'newSkuSap'))
      expect(s.forecast).toEqual(
        /** @type {NonNullable<typeof s.sapPlan>} */ (s.sapPlan).map((v) => Math.round(v ?? 0))
      );
    expect(by('discontinued')).toEqual(['SYN-FG-008']);
    expect(by('comb')).toHaveLength(15);
    expect(by('sba').length + by('croston').length + by('tsb').length + by('main').length).toBe(0);
    expect(synthetic.excludedOem).toEqual([]);
  });

  it('reconciles with MinT-shrink (not the fallback) and every level adds up', () => {
    expect(synthetic.reconciliation.method).toBe('mintShrink');
    expect(synthetic.reconciliation.fallback).toBeNull();
    expect(synthetic.reconciliation.lambda).toBeGreaterThan(0);
    for (let i = 0; i < synthetic.weeks.length; i += 1) {
      expect(synthetic.total.forecast[i]).toBe(
        synthetic.skus.reduce((a, s) => a + s.forecast[i], 0)
      );
    }
  });

  it('finds the Ramadan and pre-Ramadan effect the synthetic history carries, and no payday, double-date or Christmas effect', () => {
    /** @param {string} e */
    const f = (e) =>
      /** @type {import('./eventCalendar').EventFactor} */ (
        synthetic.events.total.find((x) => x.event === e)
      );
    expect(synthetic.events.lead).toBe(3);
    expect(f('ramadan').status).toBe('effect');
    expect(f('ramadan').factor).toBeGreaterThan(1.1);
    expect(f('preRamadan').status).toBe('effect');
    for (const e of ['payday', 'doubleDate', 'christmas'])
      expect(f(e).status).toBe('noClearEffect');
    // Ramadan 1448 (≈ 8 Feb 2027) is inside the horizon, and tagged.
    expect(
      /** @type {NonNullable<ReturnType<typeof synthetic.events.horizon.find>>} */ (
        synthetic.events.horizon.find((h) => h.weekStart === '2027-02-08')
      ).events
    ).toContain('ramadan');
    expect(synthetic.events.horizonBeyondTable).toBe(false);
    expect(synthetic.events.tableCoversUntil).toBe('2028-02-25');
    // Known-bad control: a table ending before the horizon does is flagged.
    const shortTable = demandForecast({
      finishedGoods: data.finishedGoods,
      sales: data.sales,
      asOf,
      ramadanTable: RAMADAN_TABLE.slice(0, 3)
    });
    expect(shortTable.events.horizonBeyondTable).toBe(true);
  });

  it('compares against SAP’s plan made this Monday, the plan E14-03 still runs on', () => {
    expect(synthetic.sapPlanMadeAt).toBe(synthetic.weeks[0]);
    expect(synthetic.total.sapPlan).toHaveLength(FORECAST_HORIZON_WEEKS);
  });

  it('is deterministic: the same inputs give the same run', () => {
    expect(
      demandForecast({
        finishedGoods: data.finishedGoods,
        sales: data.sales,
        fgPlan: data.fgPlan,
        asOf
      })
    ).toEqual(synthetic);
  });

  it('slots into E14-03 as a plan snapshot: the material requirement runs on it in place of SAP’s (not wired, ENG-B66)', () => {
    const start = synthetic.weeks[0];
    const substituted = {
      ...data,
      fgPlan: [...data.fgPlan.filter((p) => p.madeAt < start), ...forecastAsPlanSnapshot(synthetic)]
    };
    const opts = defaultRequirementOptions(asOf);
    const onEngine = materialRequirement(substituted, opts);
    const onSap = materialRequirement(data, opts);
    expect(onEngine.planMadeAt).toBe(start);
    /** @param {typeof onSap} r */
    const gross = (r) => r.materials.reduce((a, m) => a + m.totals.gross, 0);
    expect(gross(onEngine)).toBeGreaterThan(0);
    expect(gross(onEngine)).not.toBe(gross(onSap));
  });
});
