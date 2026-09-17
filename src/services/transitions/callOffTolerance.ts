// ─────────────────────────────────────────────────────────────────────────────
// CALL-OFF CONFIRMATION TOLERANCES — the one place they are set.
//
// REQ-E09-03 BR-03 / BR-04 and CR-05. A supplier confirmation within these
// limits is accepted automatically; outside them it waits for the planner.
//
// · Over-quantity: forecast-based call-offs 10% over the released quantity
//   (CR-05, Code); JIT call-offs have no limit (null).
// · Under-quantity and date tolerances are OPEN (PQ-08). Until they are decided
//   the defaults are 0, so ANY date change and ANY shortfall goes to the planner.
//
// ADM will set these per supplier and material group [Market]; the prototype
// holds one default set. Change a number here and every policy, page and test
// that reads it follows.
// ─────────────────────────────────────────────────────────────────────────────

import type { CallOffType } from '../data/types';

export interface CallOffTolerance {
  /** Fraction over the released quantity accepted automatically; null = no limit. */
  readonly overPct: Readonly<Record<CallOffType, number | null>>;
  /** Fraction under the released quantity accepted automatically (PQ-08). */
  readonly underPct: number;
  /** Days earlier than the need date accepted automatically (PQ-08). */
  readonly earlyDays: number;
  /** Days later than the need date accepted automatically (PQ-08). */
  readonly lateDays: number;
}

export const CALL_OFF_TOLERANCE: CallOffTolerance = Object.freeze({
  overPct: Object.freeze({ forecast: 0.1, jit: null }),
  underPct: 0,
  earlyDays: 0,
  lateDays: 0,
});

/** Working days the supplier has to confirm a released call-off (BR-05). */
export const CALL_OFF_CONFIRM_WORKING_DAYS = 1;
