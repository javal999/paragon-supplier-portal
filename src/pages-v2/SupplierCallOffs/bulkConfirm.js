// ────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) · UCX-F27 — "CONFIRM AS REQUESTED" ON CALL-OFFS.
//
// A released call-off the supplier has not answered yet is tickable in the
// bulk bar. One with a PTI delay waiting is NOT (safeguard 3): the delay needs
// the supplier's own answer, and confirming "as requested" would not be one.
// Every other rule stays the call-off's own: the bulk path calls the same
// `t_calloff_confirm` verb, so CR-05 and the tolerance run per record.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { pendingDelay } from '@services/transitions/callOffRules';

/**
 * Why a call-off cannot be ticked, or null when it can.
 * @param {CallOffView} v
 * @returns {'delayPending' | 'answered' | null}
 */
export function callOffNeedsDecision(v) {
  if (v.callOff.status !== 'Awaiting Confirmation') return 'answered';
  if (pendingDelay(v.callOff)) return 'delayPending';
  return null;
}

/**
 * @param {CallOffView} v
 * @returns {boolean}
 */
export const callOffBulkEligible = (v) => callOffNeedsDecision(v) === null;
