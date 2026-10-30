// ─────────────────────────────────────────────────────────────────────────────
// THE OVERRIDE LANE — the closed `OVERRIDE_REASONS`, the `EnforcementOverride`
// record, `overrideCompletes` and `effectiveWithOverride`. Split out of
// `enforcement.js` (BL-229) because the lane is built and unusable until
// identity exists (C10), and it is the part that changes when it does.
// ─────────────────────────────────────────────────────────────────────────────

import { MAXIMUM_RIGOUR } from './ramp';
import { isAttributed } from './attribution';
/** @import { OverridableVerdict } from './governed' */
/** @import { ActorAttribution } from './attribution' */
/** @import { EffectiveEnforcement } from './ratchet' */

// ─── The stamp ───────────────────────────────────────────────────────────────

/**
 * Why a named person overrode an adverse or unanswered verdict. A CLOSED
 * VOCABULARY, and the closure is the point: free text is where "we were in a
 * hurry" goes to look like a reason, and a reason nobody can count is a reason
 * nobody can review.
 *
 * ⚠️ **NO CATCH-ALL MEMBER.** There is no `OTHER`, and the suite asserts there
 * is none — one `OTHER` collapses a closed vocabulary into free text wearing an
 * enum's clothes.
 *
 * ⚠️ **ALL FOUR ARE PROVISIONAL — strategist-ruled, pending operator
 * ratification** (`ENF-OVERRIDE-VOCAB-PROVISIONAL-01`, `docs/findings.md`), on
 * the `sdc/halal.js` precedent: recorded as a decision TAKEN so that
 * ratification is an act of agreeing with something written down, rather than
 * discovering what the code quietly assumed. They are chosen to be four
 * DIFFERENT OPERATOR BEHAVIOURS, not four shades of "allowed anyway".
 */
export const OVERRIDE_REASONS = Object.freeze(
  /** @type {const} */ ([
    /** The evidence exists and the portal cannot see it — the R0.1 corpus hole.
     *  Chase the document into the system; the lot is not the problem. */
    'EVIDENCE_HELD_OUTSIDE_PORTAL',
    /** The certifying body was contacted directly and confirmed. Somebody did the
     *  work out of band; record who and move on. */
    'CERTIFIER_CONFIRMED_DIRECTLY',
    /** Received into quarantine, NOT released. The check stays outstanding and
     *  the goods do not move — an override of the block, not of the question. */
    'ACCEPTED_TO_QUARANTINE',
    /** A named person accepted the exposure. The uncomfortable one, and it is in
     *  the list precisely so that it must be NAMED rather than disguised as one
     *  of the other three. */
    'COMMERCIAL_RISK_ACCEPTED'
  ])
);

/** The override reasons as a type. DERIVED from the list. */
/** @typedef {(typeof OVERRIDE_REASONS)[number]} OverrideReason */

/**
 * A recorded override of ONE verdict.
 *
 * `overriddenVerdict` is not redundant with the stamp's `verdict`: an override
 * authorises the overriding of ONE SPECIFIC ADVERSE ANSWER, never of the check
 * in general. The stamp type binds the two at COMPILE TIME (see
 * `GovernedCheckStamp`), so an override that names a different verdict than the
 * one stamped cannot be written down at all.
 *
 * ⚠️ **`overriddenAt` LANDED AT E2 (D4, ruled).** An override is A DATED ACT OF
 * ACCOUNTABILITY and inherits nothing — not the stamp's context, not the
 * command's. E1 had no clock and no caller to take the instant from; E2 has the
 * store, which assigns it at the moment of the act exactly as `pinnedAt` is
 * assigned. It never comes from a payload and it is never read inside this
 * module.
 */
/**
 * `overriddenBy`: WHO — a discriminated attribution (the operator's ruling on `ENF-NO-PERSON-IN-IDENTITY-01`). An `UNATTRIBUTED` override is RECORDABLE and does not COMPLETE: `overrideCompletes` is false and `effectiveWithOverride` falls the mode through to the ceiling. Recordable on purpose — the attempt happened, and erasing it would relax honesty to spare a blush.
 * `overriddenVerdict`:  THE EXACT VERDICT OVERRIDDEN. Bound to the stamp's own verdict by type.
 * `overriddenAt`:  WHEN the override was recorded (ISO instant) — D4. Store-assigned at the  act, never payload-supplied.
 *
 * @template {OverridableVerdict} [V=OverridableVerdict]
 * @typedef {{
 *   readonly overriddenBy: ActorAttribution;
 *   readonly reason: OverrideReason;
 *   readonly overriddenVerdict: V;
 *   readonly overriddenAt: string;
 * }} EnforcementOverride
 */

/**
 * Does this override actually take effect?
 *
 *   **AN UNATTRIBUTED OVERRIDE CANNOT COMPLETE** (operator ruling). An
 *   override's ENTIRE VALUE IS ACCOUNTABILITY — this named person accepted this
 *   risk on this date — so one that cannot be attributed is not an override.
 *
 * Today this returns `false` for every override E3 could construct, because
 * `CurrentIdentity` has no person in it. THAT IS THE DESIGN: the lane is fully
 * built and visibly unusable until identity exists, which makes the gap create
 * pressure instead of being papered over.
 * @param {EnforcementOverride} override
 * @returns {boolean}
 */
export function overrideCompletes(override) {
  return isAttributed(override.overriddenBy);
}

/**
 * The mode in force once an attempted override is taken into account.
 *
 * Three cases, and only the third moves anything: no override → unchanged; a
 * COMPLETING override → unchanged (whether it may be honoured at this mode is
 * `overrideAllowed`, a separate question this function does not answer); a
 * NON-COMPLETING override → `MAXIMUM_RIGOUR`, sourced `UNATTRIBUTED_OVERRIDE`.
 *
 * ⚠️ The source is not cosmetic. A surface must be able to say "this blocked
 * because nobody could be named", which is a fixable sentence, rather than "this
 * is set to block", which is not.
 * @param {EffectiveEnforcement} effective
 * @param {EnforcementOverride | undefined} override
 * @returns {EffectiveEnforcement}
 */
export function effectiveWithOverride(effective, override) {
  if (override === undefined || overrideCompletes(override)) return effective;
  return { mode: MAXIMUM_RIGOUR, source: 'UNATTRIBUTED_OVERRIDE' };
}
