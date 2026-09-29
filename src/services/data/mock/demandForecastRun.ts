// ────────────────────────────────────────────────────────────────────────────
// The demand forecast run at the hub's present (REQ-E14-07), and the bias
// replay on it (REQ-E14-11 BR-01) — one memo shared by the read service and the
// override verb, so the value a planner overrides is the value the page showed.
// Computed on the engine's (SIMULATED) dataset, memoised per dataset and date.
// ────────────────────────────────────────────────────────────────────────────

import { engineDataset } from './fixtures/engineDataset';
import { sdcClock } from '../../sdc/clock';
import { dayOf } from '../../engine/dates';
import { demandForecast, type DemandForecastRun } from '../../engine/demandForecast';
import { forecastBias, type ForecastBiasRun } from '../../engine/forecastBias';
import { applyOverrides, type OverrideRecord } from '../../engine/forecastOverrides';
import type { EngineDataset } from '../../engine/types';
import type { DemandForecastView } from '../types';

const runMemo = new WeakMap<EngineDataset, DemandForecastRun>();
const biasMemo = new WeakMap<EngineDataset, ForecastBiasRun>();

/** The engine's demand forecast at the hub's date (no overrides applied). */
export function currentDemandForecast(): DemandForecastRun {
  const data = engineDataset();
  const asOf = dayOf(sdcClock.now());
  let run = runMemo.get(data);
  if (!run || run.asOf !== asOf) {
    run = demandForecast({ finishedGoods: data.finishedGoods, sales: data.sales, fgPlan: data.fgPlan, asOf });
    runMemo.set(data, run);
  }
  return run;
}

/** The tracking signal per SKU and material, engine and SAP's plan, at the hub's date. */
export function currentForecastBias(): ForecastBiasRun {
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
      asOf,
    });
    biasMemo.set(data, run);
  }
  return run;
}

/**
 * REQ-E14-11 X-06 — the run as SHOWN: the overrides in force applied to their
 * SKU × week, brand and total the sums of their SKUs (ENG-B103), the engine's
 * own values kept beside.
 */
export function withOverrides(
  run: DemandForecastRun,
  records: readonly OverrideRecord[],
): Pick<DemandForecastView, 'skus' | 'brands' | 'total' | 'overrideCells'> {
  const applied = applyOverrides(run, records);
  const bySku = new Map(applied.skus.map((s) => [s.skuCode, s] as const));
  const brandFinal = new Map(applied.brands.map((b) => [b.key, b.forecast] as const));
  return {
    skus: run.skus.map((s) => ({ ...s, engineForecast: s.forecast, forecast: bySku.get(s.skuCode)!.forecast, overridden: bySku.get(s.skuCode)!.overridden })),
    brands: run.brands.map((b) => ({ ...b, engineForecast: b.forecast, forecast: brandFinal.get(b.key)! })),
    total: { ...run.total, engineForecast: run.total.forecast, forecast: applied.total },
    overrideCells: applied.cells,
  };
}
