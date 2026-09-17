// ─────────────────────────────────────────────────────────────────────────────
// FORECAST COLLABORATION SETTINGS — the ONE config module (REQ-E06-01 to 03).
//
// Every number the forecast publication, commitment and gap rules compare
// against lives here, so a setting is changed in one place (the prototype has
// no admin screen; section 3.6 says ADM can change every threshold):
//   · REQ-E06-01 BR-02 / BR-03 — cadence, horizon and the weekly-to-monthly
//     cut-over per material type.
//   · REQ-E06-01 BR-05 — zone lengths per supplier × material group; the Firm
//     zone defaults to the supplier's lead time for that group.
//   · CR-21 — commitment tolerance per zone.
//   · CR-22 — gap colour thresholds.
//   · REQ-E06-02 BR-07 — commitment deadlines; REQ-E06-03 BR-06 — reminders.
//   · Section 3.6 — starter reason codes for a commitment below forecast.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapacityReason } from '../data/types';
import type { ForecastStream, MaterialType } from '../sdc/types';

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

/**
 * CR-21 — the share below forecast accepted without planner action, per zone.
 * Firm: none. Trade-off: 10% (mirrors CR-05). Forecast: acknowledgement only.
 */
export const COMMITMENT_TOLERANCE = Object.freeze({
  firmShortfall: 0,
  tradeOffShortfall: 0.1,
});

/** CR-22 — commitment ÷ forecast: Green at 1.0 or more, Amber from 0.8, Red below. */
export const GAP_COLOUR_THRESHOLDS = Object.freeze({
  greenFrom: 1,
  amberFrom: 0.8,
});

/** REQ-E06-02 BR-07 — Firm periods due 1 working day after publication. */
export const FIRM_DEADLINE_WORKING_DAYS = 1;
/** REQ-E06-02 BR-07 — Trade-off and Forecast periods due 7 days after publication. */
export const OTHER_DEADLINE_DAYS = 7;
/** REQ-E06-03 BR-06 — the first reminder goes out at half the deadline. */
export const REMINDER_FRACTION = 0.5;

/** Section 3.6 starter reason codes for a commitment below forecast; `other` needs a note. */
export const COMMITMENT_REASONS: readonly CapacityReason[] = Object.freeze([
  'capacity',
  'material',
  'logistics',
  'quality',
  'other',
]);

export const isCommitmentReason = (value: unknown): value is CapacityReason =>
  typeof value === 'string' && (COMMITMENT_REASONS as readonly string[]).includes(value);
