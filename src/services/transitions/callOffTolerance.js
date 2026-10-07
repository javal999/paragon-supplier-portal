// ─────────────────────────────────────────────────────────────────────────────
// CALL-OFF CONFIRMATION TOLERANCES — read here, set by the administrator (BL-47,
// BL-32).
//
// REQ-E09-03 BR-03 / BR-04 and CR-05, revised by the owner on 2026-09-21:
//
// · Over-quantity: up to 5% over the released quantity is accepted
//   automatically, for EVERY call-off type. (Until BL-47 a forecast-based
//   call-off took 10% and a JIT call-off had no limit; the type no longer
//   decides the tolerance.) Beyond it the confirmation waits for the planner.
// · Shortfall: never a reason to wait. Any shortfall is a partial delivery,
//   accepted, and shown as a partial on both call-off screens. There is no
//   number for it, so there is no setting for it here.
// · Later than the need date: ALWAYS goes to the planner. There is no late
//   allowance to set, so there is no setting for it here either.
// · Earlier than the need date: goes to the planner until the warehouse decides
//   how many days early it can take (PQ-08, backlog BL-56). The allowance is a
//   PLACEHOLDER of 0 days until then.
//
// ⚠️ **NO NUMBER IS WRITTEN HERE ANY MORE (BL-32).** The defaults live in the
// registry `hubSettings.js`; the values in force are the administrator's, set
// on Administration → Tolerances and rule values through `t_setting_set`, and
// every policy, page and test reads them through the accessors below AT THE
// MOMENT THE RULE RUNS. One hub-wide set; per supplier and material group
// [Market] is not built.
// ─────────────────────────────────────────────────────────────────────────────

import { hubSetting } from './hubSettingsStore';

/**
 * `overPct`:  Percent over the released quantity accepted automatically, for every call-off type (CR-05).
 * `earlyDays`:  Days earlier than the need date accepted automatically (PQ-08 / BL-56).
 *
 * @typedef {{
 *   readonly overPct: number;
 *   readonly earlyDays: number;
 * }} CallOffTolerance
 */

/**
 * CR-05 — the call-off tolerance IN FORCE: `callOff.overPct` (default 5%) and
 * `callOff.earlyAllowanceDays` (placeholder 0 days until BL-56).
 * @returns {CallOffTolerance}
 */
export function callOffTolerance() {
  return {
    overPct: hubSetting('callOff.overPct'),
    earlyDays: hubSetting('callOff.earlyAllowanceDays')
  };
}

/**
 * Working days the supplier has to confirm a released call-off (BR-05), in force now (default 1).
 * @returns {number}
 */
export function callOffConfirmWorkingDays() {
  return hubSetting('callOff.confirmWorkingDays');
}
