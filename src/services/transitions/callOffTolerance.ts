// ─────────────────────────────────────────────────────────────────────────────
// CALL-OFF CONFIRMATION TOLERANCES — the one place they are set (BL-47).
//
// REQ-E09-03 BR-03 / BR-04 and CR-05, revised by the owner on 2026-09-21:
//
// · Over-quantity: up to 5% over the released quantity is accepted
//   automatically, for EVERY call-off type. (Until BL-47 a forecast-based
//   call-off took 10% and a JIT call-off had no limit; the type no longer
//   decides the tolerance.) Beyond 5% the confirmation waits for the planner.
// · Shortfall: never a reason to wait. Any shortfall is a partial delivery,
//   accepted, and shown as a partial on both call-off screens. There is no
//   number for it, so there is no setting for it here.
// · Later than the need date: ALWAYS goes to the planner. There is no late
//   allowance to set, so there is no setting for it here either.
// · Earlier than the need date: goes to the planner until the warehouse decides
//   how many days early it can take (PQ-08, backlog BL-56). The allowance below
//   is a PLACEHOLDER; when BL-56 is answered, change that one line.
//
// ADM will set these per supplier and material group [Market]; the prototype
// holds one default set. Change a number here and every policy, page and test
// that reads it follows.
// ─────────────────────────────────────────────────────────────────────────────

export interface CallOffTolerance {
  /** Percent over the released quantity accepted automatically, for every call-off type (CR-05). */
  readonly overPct: number;
  /** Days earlier than the need date accepted automatically (PQ-08 / BL-56). */
  readonly earlyDays: number;
}

/** CR-05 — percent over the released quantity accepted automatically, every call-off type. */
export const CALL_OFF_OVER_PCT = 5;

/**
 * PLACEHOLDER — BL-56 (PQ-08): days a call-off may arrive before its need date
 * without planner approval, waiting on the warehouse capacity check. 0 means an
 * earlier date always goes to the planner. When BL-56 is decided, change this
 * one line.
 */
export const CALL_OFF_EARLY_ALLOWANCE_DAYS = 0;

export const CALL_OFF_TOLERANCE: CallOffTolerance = Object.freeze({
  overPct: CALL_OFF_OVER_PCT,
  earlyDays: CALL_OFF_EARLY_ALLOWANCE_DAYS,
});

/** Working days the supplier has to confirm a released call-off (BR-05). */
export const CALL_OFF_CONFIRM_WORKING_DAYS = 1;
