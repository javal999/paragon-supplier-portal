// ─────────────────────────────────────────────────────────────────────────────
// PLANNER OVERRIDES AND THEIR VALUE — REQ-E14-11 BR-02 / BR-03, X-06 (METHOD-
// SPEC G2), BL-114.
//
// A Material Planning team member (ENG-D11) overrides one SKU × week of the
// demand forecast. The record keeps who, when, the old value (the value in
// force before), the new value, the engine's own value for the cell, and a
// reason code (X-06). Append-only: the latest override of a cell is the one in
// force, and setting a cell back to the engine's value is itself an override.
//
// ── WHAT AN OVERRIDE CHANGES (ENG-B103) ─────────────────────────────────────
//   The SKU's forecast for that week becomes the new value. Its brand and the
//   total are the sums of their SKUs, as they already are after reconciliation
//   (ENG-B64), so they move by exactly the override's difference and SKU,
//   brand and total still add up. The other SKUs are NOT re-reconciled: the
//   planner's number is a SKU number, and spreading it would change forecasts
//   nobody touched. Overrides do not reach material planning: SAP's plan stays
//   E14-03's input (ENG-B66).
//
// ── OVERRIDE VALUE (BR-02, FVA) ─────────────────────────────────────────────
//   Once a week with an override has sold (its actual is known and in stock),
//   the engine's error |actual − engine| is compared with the final error
//   |actual − final|. Per group (month × direction, month × reason code, month
//   × size band) and per SKU in the group: MAE over the SKU's cells; then
//     AvgRelMAE = geometric mean over SKUs of MAE(final) ÷ MAE(engine)
//     FVA       = (1 − AvgRelMAE) × 100%   (Fildes & Goodwin 2021)
//   A SKU whose engine or final MAE is 0 cannot enter a geometric mean of
//   ratios and is counted as not comparable (ENG-B105).
//
// ── BR-03 ───────────────────────────────────────────────────────────────────
//   An override TYPE (direction × reason code) whose FVA over the last 13 weeks
//   with actuals is negative is flagged for review with the planner's lead.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, mondayOf } from './dates';
import type { DemandForecastRun } from './demandForecast';
import type { IsoDate } from './types';

/** The reason list the administrator maintains (reasonCodes.js `forecastOverride`). */
export const OVERRIDE_REASON_LIST = 'forecastOverride';
/** BR-03 — the review window. */
export const OVERRIDE_REVIEW_WEEKS = 13;
/** The largest value an override may carry (a typing guard, not a business limit). */
export const OVERRIDE_MAX_VALUE = 100_000_000;
export const OVERRIDE_NOTE_MAX = 500;

/** Relative to the engine's value for the cell. `none`: set back to it. */
export type OverrideDirection = 'up' | 'down' | 'none';

/** Size bands of |new − engine| ÷ engine (Spec G2 reports FVA by size band). */
export const SIZE_BANDS = ['lt10', '10to25', '25to50', '50to100', 'gt100'] as const;
export type SizeBand = (typeof SIZE_BANDS)[number];

export interface OverrideRecord {
  readonly id: string;
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  /** The engine's reconciled forecast for the cell when the override was made. */
  readonly engineValue: number;
  /** The value in force before this override (the engine's, or an earlier override). */
  readonly oldValue: number;
  readonly newValue: number;
  /** A code of the `forecastOverride` list; null only where BR-03 does not require one. */
  readonly reasonCode: string | null;
  readonly note: string | null;
  /** The first forecast week of the run it was made against. */
  readonly runWeek: IsoDate;
  readonly recordedAt: string;
  /** Who (X-06): the session's actor attribution, as recorded. */
  readonly recordedBy: unknown;
}

export const cellKey = (skuCode: string, weekStart: IsoDate): string => `${skuCode}|${weekStart}`;

export const directionOf = (engineValue: number, newValue: number): OverrideDirection =>
  newValue > engineValue ? 'up' : newValue < engineValue ? 'down' : 'none';

export function sizeBandOf(engineValue: number, newValue: number): SizeBand {
  if (engineValue <= 0) return 'gt100';
  const r = Math.abs(newValue - engineValue) / engineValue;
  if (r < 0.1) return 'lt10';
  if (r < 0.25) return '10to25';
  if (r < 0.5) return '25to50';
  if (r <= 1) return '50to100';
  return 'gt100';
}

/** The latest override per cell (records in the order they were made). */
export function overridesInForce(records: readonly OverrideRecord[]): Map<string, OverrideRecord> {
  const out = new Map<string, OverrideRecord>();
  for (const r of records) out.set(cellKey(r.skuCode, r.weekStart), r);
  return out;
}

// ── Applying them ───────────────────────────────────────────────────────────

export interface OverriddenSku {
  readonly skuCode: string;
  /** The engine's reconciled forecast. */
  readonly engineForecast: readonly number[];
  /** With the overrides in force: what the SKU shows. */
  readonly forecast: readonly number[];
  /** Week indexes carrying an override. */
  readonly overridden: readonly number[];
}

export interface AppliedOverrides {
  readonly skus: readonly OverriddenSku[];
  /** Brand and total: the sum of their SKUs' final forecasts. */
  readonly brands: readonly { readonly key: string; readonly forecast: readonly number[] }[];
  readonly total: readonly number[];
  /** Cells of this run carrying an override. */
  readonly cells: number;
}

/** The forecast shown: the engine's, with the overrides in force on its weeks (ENG-B103). */
export function applyOverrides(run: Pick<DemandForecastRun, 'weeks' | 'skus' | 'brands'>, records: readonly OverrideRecord[]): AppliedOverrides {
  const inForce = overridesInForce(records);
  let cells = 0;
  const skus: OverriddenSku[] = run.skus.map((s) => {
    const overridden: number[] = [];
    const forecast = run.weeks.map((w, i) => {
      const o = s.method === 'discontinued' ? undefined : inForce.get(cellKey(s.skuCode, w));
      if (!o) return s.forecast[i];
      overridden.push(i);
      return o.newValue;
    });
    cells += overridden.length;
    return { skuCode: s.skuCode, engineForecast: s.forecast, forecast, overridden };
  });
  const bySku = new Map(skus.map((s) => [s.skuCode, s] as const));
  const sumOf = (codes: readonly string[]) => run.weeks.map((_, i) => codes.reduce((a, c) => a + (bySku.get(c)?.forecast[i] ?? 0), 0));
  return {
    skus,
    brands: run.brands.map((b) => ({ key: b.key, forecast: sumOf(b.skuCodes) })),
    total: sumOf(run.skus.map((s) => s.skuCode)),
    cells,
  };
}

// ── The verb's rule ─────────────────────────────────────────────────────────

export interface OverridePayload {
  readonly skuCode: unknown;
  readonly weekStart: unknown;
  readonly newValue: unknown;
  readonly reasonCode?: unknown;
  readonly note?: unknown;
}

export interface OverrideCell {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly engineValue: number;
  readonly oldValue: number;
}

/**
 * Why an override would be refused, or the cell it lands on. The ONE predicate:
 * the verb's policy hook calls it and the target calls it again to read the
 * values it records — nothing is taken on the form's word but the new value,
 * the reason and the note.
 */
export function overrideRefusal(
  run: Pick<DemandForecastRun, 'weeks' | 'skus' | 'excludedOem'>,
  records: readonly OverrideRecord[],
  payload: OverridePayload,
  isActiveReason: (code: unknown) => boolean,
  noteRequiredCode = 'other',
): { refusal: string } | { cell: OverrideCell } {
  const code = payload.skuCode;
  if (typeof code !== 'string') return { refusal: 'UNKNOWN_SKU: skuCode must name a SKU' };
  if (run.excludedOem.some((o) => o.skuCode === code)) {
    return { refusal: `OEM_NOT_FORECAST: ${code} is an OEM product; its demand is the brand's POs (ENG-D20)` };
  }
  const sku = run.skus.find((s) => s.skuCode === code);
  if (!sku) return { refusal: `UNKNOWN_SKU: ${code} is not in the demand forecast` };
  if (sku.method === 'discontinued') return { refusal: `SKU_DISCONTINUED: ${code} is discontinued and forecast at zero` };
  const week = payload.weekStart;
  const i = typeof week === 'string' ? run.weeks.indexOf(week) : -1;
  if (i < 0) {
    return { refusal: `WEEK_NOT_IN_HORIZON: the week must be a forecast week from ${run.weeks[0]} to ${run.weeks[run.weeks.length - 1]}` };
  }
  if (sku.endsOn !== null && (week as string) >= sku.endsOn) {
    return { refusal: `SKU_ENDED: ${code} is discontinued from ${sku.endsOn}; that week is fixed at zero` };
  }
  const v = payload.newValue;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > OVERRIDE_MAX_VALUE) {
    return { refusal: `the new value must be a whole number from 0 to ${OVERRIDE_MAX_VALUE}` };
  }
  const engineValue = sku.forecast[i];
  const prior = overridesInForce(records).get(cellKey(code, week as string));
  const oldValue = prior ? prior.newValue : engineValue;
  if (v === oldValue) return { refusal: `NO_CHANGE: ${code} in ${week as string} is already ${oldValue}` };
  const reason = payload.reasonCode;
  const hasReason = reason !== undefined && reason !== null && reason !== '';
  if (hasReason && !isActiveReason(reason)) {
    return { refusal: `UNKNOWN_REASON: '${String(reason)}' is not a reason code offered for forecast overrides` };
  }
  if (!hasReason && directionOf(engineValue, v) === 'up') {
    return { refusal: `REASON_REQUIRED: an override that raises the forecast above the engine's (${engineValue}) needs a reason code (E14-11 BR-03)` };
  }
  const note = payload.note;
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > OVERRIDE_NOTE_MAX)) {
    return { refusal: `the note must be text of at most ${OVERRIDE_NOTE_MAX} characters` };
  }
  if (reason === noteRequiredCode && (typeof note !== 'string' || note.trim().length < 3)) {
    return { refusal: `NOTE_REQUIRED: the reason "${noteRequiredCode}" needs a note` };
  }
  return { cell: { skuCode: code, weekStart: week as string, engineValue, oldValue } };
}

// ── Override value (BR-02) and the review flag (BR-03) ──────────────────────

/** The actual demand of a week: null when unknown, not yet sold, or out of stock. */
export type ActualOf = (skuCode: string, weekStart: IsoDate) => number | null;

export interface FvaCell {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly month: string;
  readonly direction: OverrideDirection;
  /** 'none' when the override carried no code. */
  readonly reasonCode: string;
  readonly band: SizeBand;
  readonly actual: number;
  readonly engineValue: number;
  readonly finalValue: number;
  readonly engineError: number;
  readonly finalError: number;
}

export interface FvaGroup {
  readonly key: string;
  readonly cells: number;
  readonly skus: number;
  /** SKUs whose engine or final MAE was 0: not in the geometric mean (ENG-B105). */
  readonly notComparable: number;
  readonly engineMae: number;
  readonly finalMae: number;
  /** Cells the override brought closer to what sold. */
  readonly improved: number;
  /** Geometric mean of MAE(final) ÷ MAE(engine); null when no SKU is comparable. */
  readonly avgRelMae: number | null;
  /** (1 − AvgRelMAE) × 100; negative: the overrides made it worse. */
  readonly fvaPct: number | null;
}

export interface FvaMonth {
  readonly month: string;
  readonly all: FvaGroup;
  readonly byDirection: readonly FvaGroup[];
  readonly byReason: readonly FvaGroup[];
  readonly byBand: readonly FvaGroup[];
}

export interface OverrideTypeReview {
  /** `<direction>:<reasonCode>`. */
  readonly type: string;
  readonly direction: OverrideDirection;
  readonly reasonCode: string;
  readonly group: FvaGroup;
  /** BR-03: negative FVA over the window — review with the planner's lead. */
  readonly flagged: boolean;
}

export interface OverrideValueReport {
  /** Overrides recorded (all cells, all runs). */
  readonly recorded: number;
  /** Cells whose week has sold and entered the comparison. */
  readonly measured: number;
  /** Cells whose week has not sold yet. */
  readonly waiting: number;
  /** Past cells with no usable actual (out of stock, or no sales record): never measured. */
  readonly unmeasurable: number;
  readonly months: readonly FvaMonth[];
  readonly review: {
    readonly from: IsoDate;
    readonly to: IsoDate;
    readonly weeks: number;
    readonly types: readonly OverrideTypeReview[];
  };
}

function groupOf(key: string, cells: readonly FvaCell[]): FvaGroup {
  const bySku = new Map<string, FvaCell[]>();
  for (const c of cells) bySku.set(c.skuCode, [...(bySku.get(c.skuCode) ?? []), c]);
  let logSum = 0;
  let comparable = 0;
  let notComparable = 0;
  for (const list of bySku.values()) {
    const e = list.reduce((a, c) => a + c.engineError, 0) / list.length;
    const f = list.reduce((a, c) => a + c.finalError, 0) / list.length;
    if (e === 0 || f === 0) {
      notComparable += 1;
      continue;
    }
    logSum += Math.log(f / e);
    comparable += 1;
  }
  const avgRelMae = comparable === 0 ? null : Math.exp(logSum / comparable);
  const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    key,
    cells: cells.length,
    skus: bySku.size,
    notComparable,
    engineMae: mean(cells.map((c) => c.engineError)),
    finalMae: mean(cells.map((c) => c.finalError)),
    improved: cells.filter((c) => c.finalError < c.engineError).length,
    avgRelMae,
    fvaPct: avgRelMae === null ? null : (1 - avgRelMae) * 100,
  };
}

const groupBy = (cells: readonly FvaCell[], keyOf: (c: FvaCell) => string, order?: readonly string[]): FvaGroup[] => {
  const keys = [...new Set(cells.map(keyOf))];
  const sorted = order ? order.filter((k) => keys.includes(k)) : keys.sort();
  return sorted.map((k) => groupOf(k, cells.filter((c) => keyOf(c) === k)));
};

/**
 * BR-02 / BR-03 — the value of the overrides whose weeks have sold. `asOf` is
 * the hub's date: a week counts once it is before this Monday.
 */
export function overrideValue(records: readonly OverrideRecord[], actualOf: ActualOf, asOf: IsoDate): OverrideValueReport {
  const current = mondayOf(asOf);
  const inForce = [...overridesInForce(records).values()];
  const cells: FvaCell[] = [];
  let waiting = 0;
  let unmeasurable = 0;
  for (const o of inForce) {
    const direction = directionOf(o.engineValue, o.newValue);
    if (direction === 'none') continue; // set back to the engine's: nothing to measure
    if (o.weekStart >= current) {
      waiting += 1;
      continue;
    }
    const actual = actualOf(o.skuCode, o.weekStart);
    if (actual === null) {
      unmeasurable += 1;
      continue;
    }
    cells.push({
      skuCode: o.skuCode,
      weekStart: o.weekStart,
      month: o.weekStart.slice(0, 7),
      direction,
      reasonCode: o.reasonCode ?? 'none',
      band: sizeBandOf(o.engineValue, o.newValue),
      actual,
      engineValue: o.engineValue,
      finalValue: o.newValue,
      engineError: Math.abs(actual - o.engineValue),
      finalError: Math.abs(actual - o.newValue),
    });
  }
  const months = [...new Set(cells.map((c) => c.month))].sort().reverse();
  const from = addDays(current, -7 * OVERRIDE_REVIEW_WEEKS);
  const window = cells.filter((c) => c.weekStart >= from && c.weekStart < current);
  const typeOf = (c: FvaCell) => `${c.direction}:${c.reasonCode}`;
  const types = groupBy(window, typeOf).map((g) => {
    const [direction, reasonCode] = g.key.split(':') as [OverrideDirection, string];
    return { type: g.key, direction, reasonCode, group: g, flagged: g.fvaPct !== null && g.fvaPct < 0 };
  });
  return {
    recorded: records.length,
    measured: cells.length,
    waiting,
    unmeasurable,
    months: months.map((m) => {
      const mc = cells.filter((c) => c.month === m);
      return {
        month: m,
        all: groupOf('all', mc),
        byDirection: groupBy(mc, (c) => c.direction, ['up', 'down']),
        byReason: groupBy(mc, (c) => c.reasonCode),
        byBand: groupBy(mc, (c) => c.band, SIZE_BANDS),
      };
    }),
    review: { from, to: addDays(current, -1), weeks: OVERRIDE_REVIEW_WEEKS, types },
  };
}
