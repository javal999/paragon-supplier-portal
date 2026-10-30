// ─────────────────────────────────────────────────────────────────────────────
// THE STAMP — what a governed check records (`GovernedCheckStamp` and its
// per-verdict distribution) and `isCoherentStamp`, the check the type cannot
// make. Split out of `enforcement.js` (BL-229) because it composes every other
// file here and nothing here reads it.
// ─────────────────────────────────────────────────────────────────────────────

import { MAXIMUM_RIGOUR, overrideAllowed } from './ramp';
import { overrideCompletes } from './override';
/** @import { EnforcementMode } from './ramp' */
/** @import { GovernedCheckId, GovernedVerdict, OverridableVerdict } from './governed' */
/** @import { EnforcementModeSource } from './ratchet' */
/** @import { EnforcementOverride } from './override' */

/** The fields every stamp carries, whatever it answered. */
/**
 * `mode`:  The mode IN FORCE when the check ran — the `effectiveMode` result, not the  recorded setting. A stamp that carried the setting would be unable to  explain a block the ratchet caused.
 * `modeSource`:  Whether that mode was as-set or tightened by a lapsed review.
 *
 * @typedef {{
 *   readonly checkId: GovernedCheckId;
 *   readonly mode: EnforcementMode;
 *   readonly modeSource: EnforcementModeSource;
 * }} GovernedCheckStampBase
 */

/**
 * The stamp for ONE verdict, with the override bound to THAT verdict.
 *
 * Distributed over `GovernedVerdict` below rather than written as a hand-listed
 * union, so a fourth verdict cannot arrive without an override rule: `PASS`
 * gets `override?: never` (there is nothing to override), and every overridable
 * verdict gets an override whose `overriddenVerdict` is that same literal.
 */
/**
 * @template {GovernedVerdict} V
 * @typedef {GovernedCheckStampBase & {
 *     readonly verdict: V;
 *     readonly override?: V extends OverridableVerdict ? EnforcementOverride<V> : never;
 *   }} StampFor
 */

/**
 * WHAT A GOVERNED CHECK RECORDED — the artifact that makes a relaxation honest.
 * It names the check, what it answered, the mode that was in force, where that
 * mode came from, and — if a person overrode it — who, why, and exactly what
 * they overrode. **A stamp is written at every mode, including `OBSERVE`.**
 * That is the whole difference between relaxing enforcement and relaxing
 * honesty.
 *
 * The distributive conditional gives a union of three arms, one per verdict, so
 * these do not typecheck:
 *   · a `PASS` stamp carrying an override;
 *   · an `ADVERSE` stamp whose override names `overriddenVerdict: 'UNANSWERED'`.
 *
 * The one rule the TYPE cannot express — that an override is coherent only at
 * `BLOCK_OVERRIDABLE`, because `mode` and `override` are independent fields —
 * is `isCoherentStamp`, and it is pinned separately.
 */
/** @typedef {StampPerVerdict<GovernedVerdict>} GovernedCheckStamp */

/** The distribution itself: a naked type parameter in a conditional, which is
 *  what makes TypeScript build ONE ARM PER VERDICT instead of collapsing the
 *  union and losing the binding. */
/**
 * @template {GovernedVerdict} V
 * @typedef {V extends GovernedVerdict
 *   ? StampFor<V>
 *   : never} StampPerVerdict
 */

/**
 * Is this stamp internally coherent? The check the type cannot make.
 *
 * An override is legal at EXACTLY ONE mode (`overrideAllowed`): under `OBSERVE`
 * nothing blocked, so there was nothing to override and an override there would
 * dress a relaxation as a deliberate act; under `BLOCK` an override is the
 * relaxation full rigour exists to deny. Everything else the shape needs — a
 * `PASS` cannot carry one, and an override cannot name a verdict other than the
 * stamped one — is already impossible to write.
 *
 * ⚠️ **E2 SPLIT THE RULE IN TWO, because the ruling created a second legal
 * shape.** A COMPLETING override is legal at exactly one mode, as before. A
 * NON-COMPLETING one (unattributed) leaves the ceiling in force and says so —
 * so `mode: BLOCK` beside a refused override is COHERENT, and it is the only
 * mode that is. Any other pairing claims an outcome the fall-through did not
 * produce.
 *
 * ⚠️ Returns a boolean and refuses nothing on its own. THE ENFORCEMENT OF THIS
 * RULE IS THE CALLER'S, AND THE CALLER IS E3 — a predicate in a headless module
 * cannot stop anybody, and pretending otherwise is the kind of claim this lane
 * exists to avoid.
 * @param {GovernedCheckStamp} stamp
 * @returns {boolean}
 */
export function isCoherentStamp(stamp) {
  if (stamp.override === undefined) return true;
  if (overrideCompletes(stamp.override)) return overrideAllowed(stamp.mode);
  return stamp.mode === MAXIMUM_RIGOUR && stamp.modeSource === 'UNATTRIBUTED_OVERRIDE';
}
