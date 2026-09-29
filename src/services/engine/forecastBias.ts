// ─────────────────────────────────────────────────────────────────────────────
// FORECAST BIAS — REQ-E14-11 BR-01 (METHOD-SPEC G2), BL-114.
//
// Trigg's smoothed tracking signal per SKU and per material, on the engine's
// forecast AND on SAP's plan, over the same past weeks, so the two can be read
// side by side. Pure: the dataset and the hub's date in, the result out (X-01).
//
// ── THE SIGNAL ──────────────────────────────────────────────────────────────
//   error e = actual − forecast (positive: the forecast was too LOW, which is
//   shortage; negative: too HIGH, which fills the warehouse).
//     smoothed error      E = α·e + (1 − α)·E
//     smoothed abs error  M = α·|e| + (1 − α)·M
//     signal              T = E ÷ M        (between −1 and +1)
//   α = 0.1 and the alarm is |T| > 0.51 (Spec G2, citing Nahmias; SAP uses the
//   same signal). E and M start at 0, so T is the recency-weighted share of the
//   errors that point one way; with fewer than TS_MIN_ERRORS errors the signal
//   is shown but cannot alarm (ENG-B101).
//
// ── WHICH PAST FORECAST (ROLLING ORIGINS, ENG-B100) ─────────────────────────
//   At each of the last `origins` Mondays o before this week, the engine is run
//   AS IF it were o (history before o only, SAP's plan in force at o for new
//   SKUs) and its forecast for week o — the first forecast week, reconciled and
//   rounded, exactly what the page would have shown that Monday — is compared
//   with what sold in week o. SAP's plan made at o for week o is compared with
//   the same actual: the same lag for both.
//   A cell counts only where the actual, the engine's forecast AND SAP's plan
//   are all known, so both signals are measured on the same weeks. A week
//   flagged out of stock is not demand (E14-07 BR-06) and is skipped.
//
// ── MATERIALS ───────────────────────────────────────────────────────────────
//   Per origin, the counted SKU cells are exploded through the BOM in force
//   (`grossRequirement`, qty per × (1 + scrap) ÷ yield): the material's
//   forecast requirement against the requirement that sales actually caused, in
//   the same week (no lead-time offset: this is the bias of the demand signal
//   the material sees, not of its purchase plan).
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, mondayOf } from './dates';
import { grossRequirement } from './bom';
import { demandForecast, type ForecastMethod } from './demandForecast';
import type { RamadanDates } from './eventCalendar';
import type { BomLine, Brand, EngineMaterial, FgPlanSnapshot, FinishedGood, IsoDate, SalesWeek } from './types';

/** Smoothing weight (Spec G2). */
export const TS_ALPHA = 0.1;
/** Alarm when |signal| is ABOVE this (Spec G2). */
export const TS_LIMIT = 0.51;
/** Errors needed before the signal may alarm (ENG-B101): a quarter of weekly errors. */
export const TS_MIN_ERRORS = 13;
/** Past weekly origins replayed (ENG-B100). */
export const BIAS_ORIGINS = 52;

export type BiasDirection = 'under' | 'over';

export interface TrackingSignal {
  /** E ÷ M; 0 when every error was 0; null with no error at all. */
  readonly signal: number | null;
  readonly smoothedError: number;
  readonly smoothedAbsError: number;
  /** Errors counted. */
  readonly errors: number;
  /** |signal| > TS_LIMIT with at least TS_MIN_ERRORS errors. */
  readonly alarm: boolean;
  /** under: the forecast ran LOW (shortage); over: it ran HIGH (warehouse). Null at 0 or none. */
  readonly direction: BiasDirection | null;
  /** Mean error ÷ mean actual over the counted weeks, as a fraction; null when nothing sold. */
  readonly meanErrorPct: number | null;
}

/** |signal| above the limit — strictly (0.51 itself does not alarm). */
export const isBiasAlarm = (signal: number | null, errors: number, limit = TS_LIMIT, minErrors = TS_MIN_ERRORS): boolean =>
  signal !== null && errors >= minErrors && Math.abs(signal) > limit;

/**
 * Trigg's tracking signal over errors in time order (actual − forecast). A null
 * is a week that does not count (no actual, a stock-out) and leaves E and M as
 * they were. `actuals` (same order) gives the mean-error percentage.
 */
export function trackingSignal(
  errors: readonly (number | null)[],
  actuals?: readonly (number | null)[],
  alpha = TS_ALPHA,
): TrackingSignal {
  let E = 0;
  let M = 0;
  let n = 0;
  let sumErr = 0;
  let sumAct = 0;
  errors.forEach((e, t) => {
    if (e === null || !Number.isFinite(e)) return;
    E = alpha * e + (1 - alpha) * E;
    M = alpha * Math.abs(e) + (1 - alpha) * M;
    n += 1;
    sumErr += e;
    sumAct += actuals?.[t] ?? 0;
  });
  const signal = n === 0 ? null : M > 0 ? E / M : 0;
  return {
    signal,
    smoothedError: E,
    smoothedAbsError: M,
    errors: n,
    alarm: isBiasAlarm(signal, n),
    direction: signal === null || signal === 0 ? null : signal > 0 ? 'under' : 'over',
    meanErrorPct: actuals && sumAct > 0 ? sumErr / sumAct : null,
  };
}

// ── The rolling replay ──────────────────────────────────────────────────────

export interface ForecastBiasInput {
  readonly finishedGoods: readonly FinishedGood[];
  readonly sales: readonly SalesWeek[];
  readonly fgPlan: readonly FgPlanSnapshot[];
  readonly bom: readonly BomLine[];
  readonly materials: readonly EngineMaterial[];
  /** The hub's date; origins are the Mondays before its week. */
  readonly asOf: IsoDate;
  readonly origins?: number;
  readonly ramadanTable?: readonly RamadanDates[];
}

/** One SKU at one past origin. Null where unknown. */
export interface BiasPoint {
  readonly origin: IsoDate;
  readonly actual: number | null;
  readonly engine: number | null;
  readonly sap: number | null;
  /** The engine's method at that origin. */
  readonly method: ForecastMethod | null;
  /** All three known and the week in stock: the cell counts for both signals. */
  readonly counted: boolean;
}

export interface SkuBias {
  readonly skuCode: string;
  readonly name: string;
  readonly brand: Brand;
  /** The engine's method at the latest origin. */
  readonly method: ForecastMethod | null;
  readonly points: readonly BiasPoint[];
  readonly engine: TrackingSignal;
  readonly sap: TrackingSignal;
}

export interface MaterialBias {
  readonly materialCode: string;
  /** SKUs whose BOM uses it. */
  readonly skuCodes: readonly string[];
  readonly engine: TrackingSignal;
  readonly sap: TrackingSignal;
}

export interface AlarmCount {
  readonly total: number;
  readonly under: number;
  readonly over: number;
}

export interface ForecastBiasRun {
  readonly asOf: IsoDate;
  readonly origins: readonly IsoDate[];
  readonly alpha: number;
  readonly limit: number;
  readonly minErrors: number;
  readonly skus: readonly SkuBias[];
  readonly materials: readonly MaterialBias[];
  readonly alarms: {
    readonly skus: { readonly engine: AlarmCount; readonly sap: AlarmCount };
    readonly materials: { readonly engine: AlarmCount; readonly sap: AlarmCount };
  };
}

const countAlarms = (signals: readonly TrackingSignal[]): AlarmCount => ({
  total: signals.filter((s) => s.alarm).length,
  under: signals.filter((s) => s.alarm && s.direction === 'under').length,
  over: signals.filter((s) => s.alarm && s.direction === 'over').length,
});

/** REQ-E14-11 BR-01 — the tracking signal per SKU and material, engine and SAP's plan. */
export function forecastBias(input: ForecastBiasInput): ForecastBiasRun {
  const K = input.origins ?? BIAS_ORIGINS;
  const current = mondayOf(input.asOf);
  const origins = Array.from({ length: K }, (_, i) => addDays(current, -7 * (K - i)));
  const fgs = [...input.finishedGoods].filter((f) => f.oem !== true).sort((a, b) => a.skuCode.localeCompare(b.skuCode));

  const salesAt = new Map(input.sales.map((s) => [`${s.skuCode}|${s.weekStart}`, s] as const));
  const sapAt = new Map<string, number>();
  for (const p of input.fgPlan) if (p.madeAt === p.weekStart) sapAt.set(`${p.skuCode}|${p.weekStart}`, p.quantity);

  const points = new Map<string, BiasPoint[]>(fgs.map((f) => [f.skuCode, []]));
  // Per origin: the counted cells, for the material explosion.
  const exploded: { origin: IsoDate; engine: SalesWeek[]; sap: SalesWeek[]; actual: SalesWeek[] }[] = [];

  for (const o of origins) {
    const run = demandForecast({
      finishedGoods: fgs,
      sales: input.sales,
      fgPlan: input.fgPlan,
      asOf: o,
      horizonWeeks: 1,
      ...(input.ramadanTable ? { ramadanTable: input.ramadanTable } : {}),
    });
    const bySku = new Map(run.skus.map((s) => [s.skuCode, s] as const));
    const cells = { origin: o, engine: [] as SalesWeek[], sap: [] as SalesWeek[], actual: [] as SalesWeek[] };
    for (const fg of fgs) {
      const s = bySku.get(fg.skuCode);
      const row = salesAt.get(`${fg.skuCode}|${o}`);
      const live = o >= fg.launchDate && (fg.discontinueDate === undefined || o < fg.discontinueDate);
      const stockout = row?.stockout === true;
      const actual = !live || stockout ? null : (row?.quantity ?? 0);
      const engine = s && s.method !== 'discontinued' ? s.forecast[0] : null;
      const sap = sapAt.get(`${fg.skuCode}|${o}`) ?? null;
      const counted = actual !== null && engine !== null && sap !== null;
      points.get(fg.skuCode)!.push({ origin: o, actual, engine, sap, method: s?.method ?? null, counted });
      if (counted) {
        cells.engine.push({ skuCode: fg.skuCode, weekStart: o, quantity: engine, stockout: false });
        cells.sap.push({ skuCode: fg.skuCode, weekStart: o, quantity: sap, stockout: false });
        cells.actual.push({ skuCode: fg.skuCode, weekStart: o, quantity: actual, stockout: false });
      }
    }
    exploded.push(cells);
  }

  const signalOf = (ps: readonly BiasPoint[], pick: (p: BiasPoint) => number | null) =>
    trackingSignal(
      ps.map((p) => (p.counted ? p.actual! - pick(p)! : null)),
      ps.map((p) => (p.counted ? p.actual : null)),
    );

  const skus: SkuBias[] = fgs.map((fg) => {
    const ps = points.get(fg.skuCode)!;
    return {
      skuCode: fg.skuCode,
      name: fg.name,
      brand: fg.brand,
      method: ps[ps.length - 1]?.method ?? null,
      points: ps,
      engine: signalOf(ps, (p) => p.engine),
      sap: signalOf(ps, (p) => p.sap),
    };
  });

  // Materials: per origin, the counted cells through the BOM.
  const usedBy = new Map<string, Set<string>>();
  for (const b of input.bom) {
    if (!fgs.some((f) => f.skuCode === b.parentCode)) continue;
    usedBy.set(b.componentCode, (usedBy.get(b.componentCode) ?? new Set()).add(b.parentCode));
  }
  const perOrigin = exploded.map((c) => ({
    engine: grossRequirement(c.engine, input.bom),
    sap: grossRequirement(c.sap, input.bom),
    actual: grossRequirement(c.actual, input.bom),
    origin: c.origin,
    any: c.actual.length > 0,
  }));
  const materials: MaterialBias[] = [...input.materials]
    .filter((m) => usedBy.has(m.materialCode))
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map((m) => {
      const at = (series: Map<string, Map<IsoDate, number>>, o: IsoDate) => series.get(m.materialCode)?.get(o) ?? 0;
      const eErr: (number | null)[] = [];
      const sErr: (number | null)[] = [];
      const act: (number | null)[] = [];
      for (const p of perOrigin) {
        const a = at(p.actual, p.origin);
        const e = at(p.engine, p.origin);
        const s = at(p.sap, p.origin);
        // An origin where no SKU of this material was counted says nothing.
        const touched = p.actual.has(m.materialCode) || p.engine.has(m.materialCode) || p.sap.has(m.materialCode);
        if (!p.any || !touched) {
          eErr.push(null);
          sErr.push(null);
          act.push(null);
          continue;
        }
        eErr.push(a - e);
        sErr.push(a - s);
        act.push(a);
      }
      return {
        materialCode: m.materialCode,
        skuCodes: [...usedBy.get(m.materialCode)!].sort(),
        engine: trackingSignal(eErr, act),
        sap: trackingSignal(sErr, act),
      };
    });

  return {
    asOf: input.asOf,
    origins,
    alpha: TS_ALPHA,
    limit: TS_LIMIT,
    minErrors: TS_MIN_ERRORS,
    skus,
    materials,
    alarms: {
      skus: { engine: countAlarms(skus.map((s) => s.engine)), sap: countAlarms(skus.map((s) => s.sap)) },
      materials: { engine: countAlarms(materials.map((m) => m.engine)), sap: countAlarms(materials.map((m) => m.sap)) },
    },
  };
}
