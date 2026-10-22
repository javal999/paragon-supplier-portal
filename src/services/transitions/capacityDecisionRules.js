// ─────────────────────────────────────────────────────────────────────────────
// PTI'S CAPACITY GAP DECISION — "Accept additional capacity" (INV-D8; Inventory
// UX P-07; REQ-E08-04 BR-05, BR-10).
//
// On a gap week PTI's planner can accept the additional capacity the supplier
// offered. The decision is recorded on the supplier × planning group × week.
// It is meaningful only on an amber week ("Needs the additional capacity":
// LTP above capacity, within BE), because only there does the additional
// capacity cover the LTP. A red week ("Cannot be supplied": LTP above BE)
// cannot be covered by it, and the planner is told by how much instead.
//
// Pure: no store, no clock, no UI. The policy hook and the PTI page call the
// SAME function, so a page cannot offer what the verb refuses (RFX-R2).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { LtpCapacityLevel, LtpCapacityWeek } from './capacityRules' */

/**
 * Why an acceptance is refused, or null when it is accepted.
 * @typedef {| 'WEEK_NOT_IN_PLAN'
 *   | 'CAPACITY_NOT_STATED'
 *   | 'NOT_A_GAP_WEEK'
 *   | 'ABOVE_ADDITIONAL_CAPACITY'
 *   | 'ALREADY_ACCEPTED'} CapacityDecisionRefusal
 */

/**
 * The sentence after each code in the verb's refusal (`CODE: sentence`), for
 * the DR-10 trail. Screens translate the code, never this text.
 * @type {Readonly<Record<CapacityDecisionRefusal, string>>}
 */
export const CAPACITY_DECISION_REFUSAL_SENTENCE = Object.freeze({
  WEEK_NOT_IN_PLAN: 'the supplier has no capacity plan for this planning group and week',
  CAPACITY_NOT_STATED: 'the supplier has not stated its capacity for this week',
  NOT_A_GAP_WEEK:
    'the LTP is within the supplier’s capacity this week, so there is nothing to accept',
  ABOVE_ADDITIONAL_CAPACITY:
    'the LTP is above capacity plus additional capacity, so the additional capacity cannot cover this week',
  ALREADY_ACCEPTED: 'PTI has already accepted the additional capacity for this week'
});

/**
 * The accept verb's refusal, in the order it checks, or null.
 * @param {{
 *   readonly level: LtpCapacityLevel | null;
 *   readonly accepted: boolean;
 * }} input `level` — the week's LTP check, null when the supplier × planning
 *   group × week is not in a capacity plan. `accepted` — PTI already accepted
 *   this supplier × planning group × week.
 * @returns {CapacityDecisionRefusal | null}
 */
export function capacityAcceptRefusal(input) {
  if (input.level === null) return 'WEEK_NOT_IN_PLAN';
  if (input.level === 'unconfirmed') return 'CAPACITY_NOT_STATED';
  if (input.level === 'within') return 'NOT_A_GAP_WEEK';
  if (input.level === 'cannotSupply') return 'ABOVE_ADDITIONAL_CAPACITY';
  if (input.accepted) return 'ALREADY_ACCEPTED';
  return null;
}

/**
 * What a red week's additional capacity cannot cover: LTP − BE, or null when
 * the week is not red.
 * @param {Pick<LtpCapacityWeek, 'level' | 'ltp' | 'be'>} week
 * @returns {number | null}
 */
export const uncoveredByAdditional = (week) =>
  week.level === 'cannotSupply' && week.be !== null ? week.ltp - week.be : null;

/**
 * One key per supplier × planning group × week.
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @param {string} week
 * @returns {string}
 */
export const capacityDecisionKey = (supplierId, planningGroupId, week) =>
  `${supplierId}|${planningGroupId}|${week}`;

/**
 * The refusal code inside a dispatcher reason
 * (`POLICY_REJECTED:<hook>:<CODE>: sentence`), or null.
 * @param {string | undefined} reason
 * @returns {CapacityDecisionRefusal | null}
 */
export function capacityDecisionRefusalOf(reason) {
  if (!reason) return null;
  const code = Object.keys(CAPACITY_DECISION_REFUSAL_SENTENCE).find((c) =>
    reason.includes(`:${c}:`)
  );
  return /** @type {CapacityDecisionRefusal | null} */ (code ?? null);
}
