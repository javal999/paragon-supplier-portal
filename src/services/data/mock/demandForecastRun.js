// ────────────────────────────────────────────────────────────────────────────
// The demand forecast run at the hub's present (REQ-E14-07), and the bias
// replay on it (REQ-E14-11 BR-01) — one memo shared by the read service and the
// override verb, so the value a planner overrides is the value the page showed.
// Computed on the engine's (SIMULATED) dataset, memoised per dataset and date.
// ────────────────────────────────────────────────────────────────────────────

import { engineDataset } from './fixtures/engineDataset';
import { sdcClock } from '../../sdc/clock';
import { dayOf } from '../../engine/dates';
/** @import { DemandForecastRun } from '../../engine/demandForecast' */
import { demandForecast } from '../../engine/demandForecast';
/** @import { ForecastBiasRun } from '../../engine/forecastBias' */
import { forecastBias } from '../../engine/forecastBias';
/** @import { OverrideRecord } from '../../engine/forecastOverrides' */
import { applyOverrides } from '../../engine/forecastOverrides';
/** @import { AppliedPromotion } from '../../engine/promotions' */
import { applyPromotions } from '../../engine/promotions';
import { promotionStore } from './stores/promotionStore';
/** @import { EngineDataset } from '../../engine/types' */
/** @import { DemandForecastView } from '../types' */

const runMemo = /** @type {WeakMap<EngineDataset, DemandForecastRun>} */ (new WeakMap());
const biasMemo = /** @type {WeakMap<EngineDataset, ForecastBiasRun>} */ (new WeakMap());

/**
 * The engine's demand forecast at the hub's date (no overrides applied).
 * @returns {DemandForecastRun}
 */
export function currentDemandForecast() {
  const data = engineDataset();
  const asOf = dayOf(sdcClock.now());
  let run = runMemo.get(data);
  if (!run || run.asOf !== asOf) {
    run = demandForecast({
      finishedGoods: data.finishedGoods,
      sales: data.sales,
      fgPlan: data.fgPlan,
      asOf
    });
    runMemo.set(data, run);
  }
  return run;
}

/**
 * REQ-E14-08 BR-05 (BL-235) — the engine's run with the promotions in force
 * applied to their SKU × week (the brand and total re-summed from their SKUs),
 * each SKU carrying the promotions applied. Memoised on the run and the ledger
 * (the ledger array is new on every write), so a promotion write does not re-run
 * the engine.
 */
/** @type {{ run: DemandForecastRun; rows: unknown; out: PromotedRun } | null} */
let promotedMemo = null;

/**
 * @typedef {Omit<DemandForecastRun, 'skus'> & {
 *     readonly skus: readonly (DemandForecastRun['skus'][number] & {
 *       readonly promotions: readonly AppliedPromotion[];
 *     })[];
 *     readonly promotionCells: number;
 *   }} PromotedRun
 */

/**
 * @returns {PromotedRun}
 */
export function currentPromotedForecast() {
  const run = currentDemandForecast();
  const rows = promotionStore.all();
  if (promotedMemo && promotedMemo.run === run && promotedMemo.rows === rows)
    return promotedMemo.out;
  const applied = applyPromotions(run, rows);
  const bySku = new Map(applied.skus.map((s) => /** @type {const} */ ([s.skuCode, s])));
  const brandFinal = new Map(applied.brands.map((b) => /** @type {const} */ ([b.key, b.forecast])));
  /** @type {PromotedRun} */
  const out = {
    ...run,
    skus: run.skus.map((s) => {
      const a = /** @type {NonNullable<ReturnType<typeof bySku.get>>} */ (bySku.get(s.skuCode));
      return { ...s, forecast: a.forecast, promotions: a.promotions };
    }),
    brands: run.brands.map((b) => ({
      ...b,
      forecast: /** @type {NonNullable<ReturnType<typeof brandFinal.get>>} */ (
        brandFinal.get(b.key)
      )
    })),
    total: { ...run.total, forecast: applied.total },
    promotionCells: applied.cells
  };
  promotedMemo = { run, rows, out };
  return out;
}

/**
 * The tracking signal per SKU and material, engine and SAP's plan, at the hub's date.
 * @returns {ForecastBiasRun}
 */
export function currentForecastBias() {
  const data = engineDataset();
  const asOf = dayOf(sdcClock.now());
  let run = biasMemo.get(data);
  if (!run || run.asOf !== asOf) {
    run = forecastBias({
      finishedGoods: data.finishedGoods,
      sales: data.sales,
      fgPlan: data.fgPlan,
      bom: data.bom,
      materials: data.materials,
      asOf
    });
    biasMemo.set(data, run);
  }
  return run;
}

/**
 * REQ-E14-11 X-06 — the run as SHOWN: the overrides in force applied to their
 * SKU × week, brand and total the sums of their SKUs (ENG-B103), the engine's
 * own values kept beside.
 * @param {PromotedRun} run
 * @param {readonly OverrideRecord[]} records
 * @returns {Pick<DemandForecastView, 'skus' | 'brands' | 'total' | 'overrideCells'>}
 */
export function withOverrides(run, records) {
  const applied = applyOverrides(run, records);
  const bySku = new Map(applied.skus.map((s) => /** @type {const} */ ([s.skuCode, s])));
  const brandFinal = new Map(applied.brands.map((b) => /** @type {const} */ ([b.key, b.forecast])));
  return {
    skus: run.skus.map((s) => ({
      ...s,
      engineForecast: s.forecast,
      forecast: /** @type {import('../../engine/forecastOverrides').OverriddenSku} */ (
        bySku.get(s.skuCode)
      ).forecast,
      overridden: /** @type {import('../../engine/forecastOverrides').OverriddenSku} */ (
        bySku.get(s.skuCode)
      ).overridden
    })),
    brands: run.brands.map((b) => ({
      ...b,
      engineForecast: b.forecast,
      forecast: /** @type {NonNullable<ReturnType<typeof brandFinal.get>>} */ (
        brandFinal.get(b.key)
      )
    })),
    total: { ...run.total, engineForecast: run.total.forecast, forecast: applied.total },
    overrideCells: applied.cells
  };
}
