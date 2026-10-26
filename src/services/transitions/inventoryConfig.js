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
// defaults in `hubSettings.js` and are changed on Administration → Alert
// thresholds and stale periods; the accessors below read the value in force
// each time a rule runs. What stays a constant here, and why:
//   · `DEMAND_WINDOW` — part of CR-01's DEFINITION of days of supply, not a
//     threshold anything is compared against;
//   · `CAPACITY_HORIZON_WEEKS` — decided (PQ-02, BL-08) as the shape of the
//     capacity grid; changing it changes the grid, not a threshold.
//
// ⚠️ **PER MATERIAL GROUP (REQ-E08-05 BR-03, owner 2026-10-23).** The CR-24
// multiples, the CR-02 bands and the stale periods take an optional material
// group (the position's `materialGroup`, MG-xx): the group's override wins,
// else the global value. Called without a group they return exactly what they
// returned before, so no reader changes unless a group override exists.
// ─────────────────────────────────────────────────────────────────────────────

import {
  groupOverrideFor,
  groupSetting,
  hubSetting,
  staleOverrideFor,
  stalePeriodFor
} from './hubSettingsStore';
/** @import { UpdateCycleSettings } from './updateCycle' */

/** CR-01 — average daily demand = forecast quantity for the next 30 days ÷ 30. */
export const DEMAND_WINDOW = 30;

/**
 * CR-24 — risk class against the supplier lead time: High when days of cover
 * are below `highBelowMultiple` × lead time (1, the lead time itself, unless the
 * material group overrides it); Medium below `mediumBelowMultiple` × lead time
 * (default 1.5); Low otherwise. "Below" is strict at both cuts: cover EXACTLY
 * at the lead time is Medium, and EXACTLY at the multiple is Low (pinned in
 * inventoryRules.test.js). In force now, for the material group when given.
 * @param {string | null} [materialGroup]
 * @returns {{ readonly mediumBelowMultiple: number; readonly highBelowMultiple: number }}
 */
export function leadTimeRisk(materialGroup) {
  if (!materialGroup) {
    return {
      mediumBelowMultiple: hubSetting('risk.mediumBelowMultiple'),
      highBelowMultiple: groupSetting('risk.highBelowMultiple', null)
    };
  }
  return {
    mediumBelowMultiple: groupSetting('risk.mediumBelowMultiple', materialGroup),
    highBelowMultiple: groupSetting('risk.highBelowMultiple', materialGroup)
  };
}

/**
 * CR-02 — Critical below 14; Warning 14 to 29; Healthy 30 to 60; Excess above
 * 60 (the defaults). Since 2026-09-21 a FALLBACK only: the risk class uses these
 * bands where the supplier lead time is missing (CR-24), and that gap raises
 * its own alert. In force now.
 * For a material group, its overrides win over the global bands.
 * @param {string | null} [materialGroup]
 * @returns {{ readonly criticalBelow: number; readonly warningBelow: number; readonly healthyUpTo: number }}
 */
export function supplyBands(materialGroup) {
  if (!materialGroup) {
    return {
      criticalBelow: hubSetting('bands.criticalBelowDays'),
      warningBelow: hubSetting('bands.warningBelowDays'),
      healthyUpTo: hubSetting('bands.healthyUpToDays')
    };
  }
  return {
    criticalBelow: groupSetting('bands.criticalBelowDays', materialGroup),
    warningBelow: groupSetting('bands.warningBelowDays', materialGroup),
    healthyUpTo: groupSetting('bands.healthyUpToDays', materialGroup)
  };
}

/**
 * CR-03 — Covered at 1.0 or more; At risk from 0.8 to below 1.0; Uncovered
 * below 0.8 (the defaults, held as percentages on the admin page). In force now.
 * @returns {{ readonly coveredFrom: number; readonly atRiskFrom: number }}
 */
export function coverageThresholds() {
  return {
    coveredFrom: hubSetting('coverage.coveredFromPct') / 100,
    atRiskFrom: hubSetting('coverage.atRiskFromPct') / 100
  };
}

/**
 * REQ-E08-01 — the data-update SLA (the stale period, days) for one supplier ×
 * material, in force now: the administrator's override for the pair, else the
 * material group's stale period, else the default stale period (7 days until
 * agreed with suppliers).
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string | null} [materialGroup]
 * @returns {number}
 */
export function updateSlaFor(supplierId, materialCode, materialGroup) {
  return stalePeriodFor(supplierId, materialCode, materialGroup);
}

/**
 * REQ-E08-05 BR-03 — the material group's own stale period for a MANUAL
 * supplier, in days, or null when the group has none (the weekly cutoff then
 * decides). A supplier × material override still wins over it.
 * @param {string | null | undefined} materialGroup
 * @returns {number | null}
 */
export function groupStaleDaysFor(materialGroup) {
  return groupOverrideFor('stale.defaultDays', materialGroup);
}

/**
 * MR-1 BR-05 (Material B1) — the administrator's stale period for one supplier
 * × material, in days, or null when the pair has none. When set it wins over
 * the staleness by update mode.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export function staleOverrideDaysFor(supplierId, materialCode) {
  return staleOverrideFor(supplierId, materialCode);
}

/**
 * MR-1 BR-03 (MAT-D7) — the weekly cutoff in force: weekday and time (minutes after midnight WIB).
 * @returns {UpdateCycleSettings}
 */
export function updateCycleSettings() {
  return {
    cutoffDay: hubSetting('stockUpdate.cutoffDay'),
    cutoffTime: hubSetting('stockUpdate.cutoffTime')
  };
}

/**
 * MR-1 BR-05 (MAT-D8) — hours after the last successful pull that an API
 * supplier's figure turns stale; for a material group, its override when set.
 * @param {string | null} [materialGroup]
 * @returns {number}
 */
export function staleApiHours(materialGroup) {
  return materialGroup
    ? groupSetting('stale.apiHours', materialGroup)
    : hubSetting('stale.apiHours');
}

/**
 * MR-1 BR-01 (Material B2) — hours between scheduled pulls of an API supplier's stock.
 * @returns {number}
 */
export function stockSyncIntervalHours() {
  return hubSetting('stockSync.intervalHours');
}

/**
 * MR-2 BR-05 (MAT-D9) — the share of the performance score that update
 * compliance takes (0.10 at release). Read by `assessmentScore` at call time.
 * @returns {number}
 */
export function complianceScoreWeight() {
  return hubSetting('compliance.scoreWeight');
}

/**
 * MR-2 BR-04 (Material B4) — the amber warning (below `warnPct`, 80) and the
 * red flag (below `flagPct`, 60) on update compliance, read at call time.
 * @returns {{ readonly warnPct: number; readonly flagPct: number }}
 */
export function complianceThresholds() {
  return { warnPct: hubSetting('compliance.warnPct'), flagPct: hubSetting('compliance.flagPct') };
}

/** REQ-E08-04 BR-03 / PQ-02 — weekly buckets for 13 weeks. */
export const CAPACITY_HORIZON_WEEKS = 13;

// Section 3.6 starter reason codes for allocation below demand are the Hub
// administrator's list since BL-32: `reasonCodes.js`, list `capacityShortfall`.
