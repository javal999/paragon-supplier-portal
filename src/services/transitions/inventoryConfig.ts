// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY & CAPACITY THRESHOLDS — read here (REQ-E08-01 to 05, BL-32).
//
// Every number the inventory, capacity and alert rules compare against is read
// through this module. The values are the section 3.6 rules of
// SUPPLIER-HUB-REQUIREMENTS.md:
//   CR-01 days of supply (30-day demand window), CR-02 bands, CR-03 coverage,
//   REQ-E08-01 data-update SLA (the stale period: default 7 days, overridable
//   per supplier × material), REQ-E08-04 capacity horizon (PQ-02: 13 weekly
//   buckets) and the starter reason codes, REQ-E08-05 BR-02 risk classes
//   (CR-24 lead-time multiple; CR-02 bands as its fallback).
//
// ⚠️ **THE ALERT THRESHOLDS AND STALE PERIODS ARE THE ADMINISTRATOR'S (BL-32,
// REQ-E08-05 BR-03).** CR-02, CR-03, CR-24 and the stale period have their
// defaults in `hubSettings.ts` and are changed on Administration → Alert
// thresholds and stale periods; the accessors below read the value in force
// each time a rule runs. What stays a constant here, and why:
//   · `DEMAND_WINDOW` — part of CR-01's DEFINITION of days of supply, not a
//     threshold anything is compared against;
//   · `CAPACITY_HORIZON_WEEKS` — decided (PQ-02, BL-08) as the shape of the
//     capacity grid; changing it changes the grid, not a threshold.
// ─────────────────────────────────────────────────────────────────────────────

import { hubSetting, staleOverrideFor, stalePeriodFor } from './hubSettingsStore';
import type { UpdateCycleSettings } from './updateCycle';

/** CR-01 — average daily demand = forecast quantity for the next 30 days ÷ 30. */
export const DEMAND_WINDOW = 30;

/**
 * CR-24 — risk class against the supplier lead time: High when days of cover
 * are below the lead time; Medium below `mediumBelowMultiple` × lead time
 * (default 1.5); Low otherwise. "Below" is strict at both cuts: cover EXACTLY
 * at the lead time is Medium, and EXACTLY at the multiple is Low (pinned in
 * inventoryRules.test.ts). In force now.
 */
export function leadTimeRisk(): { readonly mediumBelowMultiple: number } {
  return { mediumBelowMultiple: hubSetting('risk.mediumBelowMultiple') };
}

/**
 * CR-02 — Critical below 14; Warning 14 to 29; Healthy 30 to 60; Excess above
 * 60 (the defaults). Since 2026-09-21 a FALLBACK only: the risk class uses these
 * bands where the supplier lead time is missing (CR-24), and that gap raises
 * its own alert. In force now.
 */
export function supplyBands(): { readonly criticalBelow: number; readonly warningBelow: number; readonly healthyUpTo: number } {
  return {
    criticalBelow: hubSetting('bands.criticalBelowDays'),
    warningBelow: hubSetting('bands.warningBelowDays'),
    healthyUpTo: hubSetting('bands.healthyUpToDays'),
  };
}

/**
 * CR-03 — Covered at 1.0 or more; At risk from 0.8 to below 1.0; Uncovered
 * below 0.8 (the defaults, held as percentages on the admin page). In force now.
 */
export function coverageThresholds(): { readonly coveredFrom: number; readonly atRiskFrom: number } {
  return {
    coveredFrom: hubSetting('coverage.coveredFromPct') / 100,
    atRiskFrom: hubSetting('coverage.atRiskFromPct') / 100,
  };
}

/**
 * REQ-E08-01 — the data-update SLA (the stale period, days) for one supplier ×
 * material, in force now: the administrator's override for the pair, else the
 * default stale period (7 days until agreed with suppliers).
 */
export function updateSlaFor(supplierId: string, materialCode: string): number {
  return stalePeriodFor(supplierId, materialCode);
}

/**
 * MR-1 BR-05 (Material B1) — the administrator's stale period for one supplier
 * × material, in days, or null when the pair has none. When set it wins over
 * the staleness by update mode.
 */
export function staleOverrideDaysFor(supplierId: string, materialCode: string): number | null {
  return staleOverrideFor(supplierId, materialCode);
}

/** MR-1 BR-03 (MAT-D7) — the weekly cutoff in force: weekday and time (minutes after midnight WIB). */
export function updateCycleSettings(): UpdateCycleSettings {
  return { cutoffDay: hubSetting('stockUpdate.cutoffDay'), cutoffTime: hubSetting('stockUpdate.cutoffTime') };
}

/** MR-1 BR-05 (MAT-D8) — hours after the last successful pull that an API supplier's figure turns stale. */
export function staleApiHours(): number {
  return hubSetting('stale.apiHours');
}

/** MR-1 BR-01 (Material B2) — hours between scheduled pulls of an API supplier's stock. */
export function stockSyncIntervalHours(): number {
  return hubSetting('stockSync.intervalHours');
}

/**
 * MR-2 BR-05 (MAT-D9) — the share of the performance score that update
 * compliance takes (0.10 at release). Read by `assessmentScore` at call time.
 */
export function complianceScoreWeight(): number {
  return hubSetting('compliance.scoreWeight');
}

/**
 * MR-2 BR-04 (Material B4) — the amber warning (below `warnPct`, 80) and the
 * red flag (below `flagPct`, 60) on update compliance, read at call time.
 */
export function complianceThresholds(): { readonly warnPct: number; readonly flagPct: number } {
  return { warnPct: hubSetting('compliance.warnPct'), flagPct: hubSetting('compliance.flagPct') };
}

/** REQ-E08-04 BR-03 / PQ-02 — weekly buckets for 13 weeks. */
export const CAPACITY_HORIZON_WEEKS = 13;

// Section 3.6 starter reason codes for allocation below demand are the Hub
// administrator's list since BL-32: `reasonCodes.ts`, list `capacityShortfall`.
