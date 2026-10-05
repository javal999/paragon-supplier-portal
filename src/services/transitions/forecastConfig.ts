// ─────────────────────────────────────────────────────────────────────────────
// FORECAST COLLABORATION SETTINGS — read here (REQ-E06-01 to 03, BL-32).
//
// Every number the forecast publication, commitment and gap rules compare
// against is read through this module. CR-21, CR-22 and CR-26 are the Hub
// administrator's (BL-32: defaults in `hubSettings.js`, changed on the admin
// page); the period grid, zone lengths and lead times stay here — they are the
// shape of the forecast and sample master data, not thresholds:
//   · REQ-E06-01 BR-02 / BR-03 — cadence, horizon and the weekly-to-monthly
//     cut-over per material type.
//   · REQ-E06-01 BR-05 — zone lengths per supplier × material group; the Firm
//     zone defaults to the supplier's lead time for that group.
//   · CR-21 — commitment tolerance per zone.
//   · CR-22 — gap colour thresholds.
//   · CR-26 / REQ-E06-02 BR-07 — commitment deadlines in working days on the
//     hub calendar; REQ-E06-03 BR-06 — reminders.
//   · Section 3.6 — starter reason codes for a commitment below forecast.
//   · ENG-D5 / REQ-E14-04 — the forecast engine's fill-rate targets per tier
//     and the safety-lead-time percentile (the administrator's, BL-32).
//   · ENG-D6 / REQ-E14-05 — the order-sizing cost rates and (BL-117) the cap
//     on rented space; ENG-D15 / REQ-E14-13 — the reschedule-out threshold
//     in weeks; ENG-D9 / REQ-E14-06 — the damping weight; REQ-E14-09 BR-01 —
//     the quantile added to the demand range.
//   · REQ-E14-01 — the freshness limit per engine feed, in days.
// ─────────────────────────────────────────────────────────────────────────────

import type { ForecastStream, MaterialType } from '../sdc/types';
import { hubSetting } from './hubSettingsStore';

/** REQ-E06-01 BR-02 — packaging is published weekly, raw material monthly. */
export const PUBLICATION_CADENCE: Readonly<Record<ForecastStream, 'weekly' | 'monthly'>> = Object.freeze({
  packaging: 'weekly',
  rawMaterial: 'monthly',
});

/** The SAP material type behind each forecast stream. */
export const STREAM_MATERIAL_TYPE: Readonly<Record<ForecastStream, MaterialType>> = Object.freeze({
  packaging: 'VERP',
  rawMaterial: 'ROH',
});

export const streamOfMaterialType = (type: MaterialType): ForecastStream =>
  type === 'VERP' ? 'packaging' : 'rawMaterial';

/**
 * REQ-E06-01 BR-03 — the period grid. Packaging: weekly periods for 13 weeks,
 * then monthly up to 6 months. Raw material: monthly periods for 6 months.
 */
export const FORECAST_HORIZON: Readonly<Record<ForecastStream, { readonly weeklyPeriods: number; readonly horizonMonths: number }>> =
  Object.freeze({
    packaging: { weeklyPeriods: 13, horizonMonths: 6 },
    rawMaterial: { weeklyPeriods: 0, horizonMonths: 6 },
  });

/** Zone lengths in days from publication: Firm, then Trade-off; Forecast after. */
export interface ZoneLengths {
  /** Defaults to the supplier's lead time for the material group (BR-05). */
  readonly firmDays: number;
  readonly tradeOffDays: number;
}

/** Lead time in days per supplier × material group (sample values). */
export const SUPPLIER_LEAD_TIME_DAYS: Readonly<Record<string, number>> = Object.freeze({
  'sup-007|MG-20': 14,
  'sup-012|MG-20': 21,
  'sup-002|MG-02': 30,
  'sup-002|MG-10': 45,
  'sup-005|MG-02': 30,
  'sup-001|MG-10': 30,
  'sup-010|MG-02': 21,
});

/** Where no lead time is held, the default for the material type. */
export const DEFAULT_LEAD_TIME_DAYS: Readonly<Record<MaterialType, number>> = Object.freeze({ VERP: 14, ROH: 30 });

/** Trade-off zone length after the Firm zone, per material type (overridable per pair). */
export const DEFAULT_TRADE_OFF_DAYS: Readonly<Record<MaterialType, number>> = Object.freeze({ VERP: 42, ROH: 60 });

/** Explicit zone lengths per supplier × material group, where they differ from the defaults. */
export const ZONE_LENGTH_OVERRIDES: Readonly<Record<string, Partial<ZoneLengths>>> = Object.freeze({});

/** BR-05 — zone lengths for one supplier × material group. */
export function zoneLengthsFor(supplierId: string, materialGroup: string, materialType: MaterialType): ZoneLengths {
  const key = `${supplierId}|${materialGroup}`;
  const override = ZONE_LENGTH_OVERRIDES[key] ?? {};
  return {
    firmDays: override.firmDays ?? SUPPLIER_LEAD_TIME_DAYS[key] ?? DEFAULT_LEAD_TIME_DAYS[materialType],
    tradeOffDays: override.tradeOffDays ?? DEFAULT_TRADE_OFF_DAYS[materialType],
  };
}

// ── Fixed stock (FS) reconcile — REQ-E06-04 (ENG-D21) ────────────────────────
// The cycle LENGTH is the administrator's (owner, 2026-09-29; accessor below);
// the Monday it is counted from stays fixed here.

/**
 * REQ-E06-04 BR-01 [Proposed] — the Monday packaging cycles are counted from:
 * the first week of the Hub's first published packaging forecast. Cycles run
 * W1 to W3 from it, back to back.
 */
export const FS_RECONCILE_CYCLE_ANCHOR = '2026-08-31';

// ── The administrator's values (BL-32) ───────────────────────────────────────
// CR-21, CR-22 and CR-26 have their defaults in `hubSettings.js` and are changed
// on Administration → Tolerances and rule values; these accessors read the
// value in force each time a rule runs, never a copy taken at load.

/**
 * CR-21 — the share below forecast accepted without planner action, per zone,
 * as a fraction. Firm: none. Trade-off: 10% (mirrors CR-05). Forecast:
 * acknowledgement only. In force now.
 */
export function commitmentTolerance(): { readonly firmShortfall: number; readonly tradeOffShortfall: number } {
  return {
    firmShortfall: hubSetting('commitment.firmShortfallPct') / 100,
    tradeOffShortfall: hubSetting('commitment.tradeOffShortfallPct') / 100,
  };
}

/** CR-22 — commitment ÷ forecast: Green at 1.0 or more, Amber from 0.8, Red below (defaults). In force now. */
export function gapColourThresholds(): { readonly greenFrom: number; readonly amberFrom: number } {
  return { greenFrom: hubSetting('gap.greenFromPct') / 100, amberFrom: hubSetting('gap.amberFromPct') / 100 };
}

/**
 * CR-26 / REQ-E06-02 BR-07 — working days after publication a commitment is due:
 * Firm 1, Trade-off and Forecast 3 (owner, 2026-09-21; BL-48 — it was 7
 * calendar days, which no rule stated). Both count on the hub's working
 * calendar (BL-50). In force now.
 */
export function commitmentDeadlineWorkingDays(): { readonly firm: number; readonly other: number } {
  return {
    firm: hubSetting('commitment.firmDeadlineWorkingDays'),
    other: hubSetting('commitment.otherDeadlineWorkingDays'),
  };
}

/**
 * ENG-D5 / REQ-E14-04 BR-02 — the forecast engine's fill-rate target per
 * service tier, as fractions (95% / 90% / 85% by default). In force now; the
 * engine itself takes them as an argument (X-01).
 */
export function engineServiceTargets(): { readonly high: number; readonly standard: number; readonly slow: number } {
  return {
    high: hubSetting('engine.fillRateHighPct') / 100,
    standard: hubSetting('engine.fillRateStandardPct') / 100,
    slow: hubSetting('engine.fillRateSlowPct') / 100,
  };
}

/** REQ-E14-04 BR-03 — the delay percentile the safety lead time covers, as a fraction (0.8). In force now. */
export function safetyLeadTimePercentile(): number {
  return hubSetting('engine.safetyLeadTimePercentile') / 100;
}

/**
 * ENG-D6 / REQ-E14-05 — the order-sizing cost rates in force: holding cost as
 * a fraction of value per year, rupiah per order, rupiah per rented pallet per
 * week, (BR-03) rupiah per pallet an order inside the lead time changes, and
 * (edge case, BL-117) the most rented space as a share of owned capacity.
 * ⚠️ PLACEHOLDERS until Finance and the Material Planner decide — the page
 * says so. The engine takes them as an argument (X-01).
 */
export function orderSizingCosts(): {
  readonly orderCostIdr: number;
  readonly holdingRatePerYear: number;
  readonly rentIdrPerPalletWeek: number;
  readonly changePenaltyIdrPerPallet: number;
  readonly maxRentedShare: number;
} {
  return {
    orderCostIdr: hubSetting('engine.orderCostIdr'),
    holdingRatePerYear: hubSetting('engine.holdingCostPctPerYear') / 100,
    rentIdrPerPalletWeek: hubSetting('engine.rentedSpaceIdrPerPalletWeek'),
    changePenaltyIdrPerPallet: hubSetting('engine.changePenaltyIdrPerPallet'),
    maxRentedShare: hubSetting('engine.maxRentedSpacePct') / 100,
  };
}

/**
 * ENG-D15 / REQ-E14-13 BR-03 — whole weeks an open order line must arrive
 * before its need week for a reschedule-out to be proposed (1 by default). In
 * force now; the engine takes it as an argument (X-01).
 */
export function rescheduleOutThresholdWeeks(): number {
  return hubSetting('engine.rescheduleOutWeeks');
}

/**
 * REQ-E06-04 BR-01 — whole weeks in a packaging fixed stock reconcile cycle
 * (3 by default: "FS Reconcile end W3"). Raw material reconciles per month
 * regardless. In force now; the pure rule takes it as an argument.
 */
export function fsReconcileCycleWeeks(): number {
  return hubSetting('forecast.fsReconcileCycleWeeks');
}

/**
 * ENG-D9 / REQ-E14-06 BR-04 — the weight on the previously published value
 * when a Trade-off period is damped before publication, as a fraction (0.5).
 * In force now; the engine takes it as an argument (X-01).
 */
export function stabiliseDampingWeight(): number {
  return hubSetting('engine.dampingWeightPct') / 100;
}

/**
 * ENG-D13 / REQ-E14-10 BR-03 — the MASC limit on model selection, as a ratio
 * (40% → 0.4), or null while it is NOT SET (the stored 0): not enforced until
 * the Material Planner sets it after the first backtest (ENG-B87). In force
 * now; the engine takes it as an argument (X-01).
 */
export function backtestMascLimit(): number | null {
  const pct = hubSetting('engine.backtestMascLimitPct');
  return pct > 0 ? pct / 100 : null;
}

/**
 * REQ-E14-09 BR-01 — the quantile the administrator adds to the demand range
 * beside P50 and P90, in percent (0 = none). In force now; the engine takes the
 * levels as an argument (X-01, X-05).
 */
export function demandRangeExtraQuantilePct(): number {
  return hubSetting('engine.rangeExtraQuantilePct');
}

/**
 * REQ-E14-01 BR-01, BR-05 — the freshness limit in days of every engine feed
 * that has one, keyed by the feed (the `EngineDataset` field). In force now;
 * the engine takes them as an argument (X-01, X-05).
 */
export function feedFreshnessLimitsDays(): {
  readonly poLines: number;
  readonly scheduleChanges: number;
  readonly receipts: number;
  readonly sources: number;
  readonly bom: number;
  readonly stock: number;
  readonly materialValues: number;
  readonly finishedGoods: number;
  readonly sales: number;
  readonly fgPlan: number;
  readonly salesOrders: number;
  readonly sapSafetyStock: number;
} {
  return {
    poLines: hubSetting('engine.freshnessDays.poLines'),
    scheduleChanges: hubSetting('engine.freshnessDays.scheduleChanges'),
    receipts: hubSetting('engine.freshnessDays.receipts'),
    sources: hubSetting('engine.freshnessDays.sources'),
    bom: hubSetting('engine.freshnessDays.bom'),
    stock: hubSetting('engine.freshnessDays.stock'),
    materialValues: hubSetting('engine.freshnessDays.materialValues'),
    finishedGoods: hubSetting('engine.freshnessDays.finishedGoods'),
    sales: hubSetting('engine.freshnessDays.sales'),
    fgPlan: hubSetting('engine.freshnessDays.fgPlan'),
    salesOrders: hubSetting('engine.freshnessDays.salesOrders'),
    sapSafetyStock: hubSetting('engine.freshnessDays.sapSafetyStock'),
  };
}

/**
 * REQ-E06-03 BR-06 — the first reminder goes out at half the deadline. Stays a
 * constant: it is a reminder's timing, not a rule value a party is measured by,
 * and §3.6 names no rule for it.
 */
export const REMINDER_FRACTION = 0.5;

// Section 3.6 starter reason codes for a commitment below forecast are the Hub
// administrator's list since BL-32: `reasonCodes.js`, list `commitmentShortfall`.
