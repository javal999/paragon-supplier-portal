// ─────────────────────────────────────────────────────────────────────────────
// THE RATCHET (D-ENF-3) — the mode-source vocabulary, the `reviewBy` boundary
// (`isReviewDay`) and `effectiveMode`, which tightens a lapsed relaxation one
// step. Split out of `enforcement.js` (BL-229) because it is the one
// clock-derived rule, and it is pinned on its own (law 0.5, `./index.js`).
// ─────────────────────────────────────────────────────────────────────────────

import { tighten } from './ramp';
/** @import { EnforcementMode } from './ramp' */
/** @import { EnforcementSetting } from './setting' */

// ─── The ratchet (D-ENF-3, ruled) ────────────────────────────────────────────

/**
 * Whether the mode in force is the one that was SET, or one the lapse of
 * `reviewBy` tightened. A stamp carries it so a surface can say WHY it blocked
 * — "this was set to observe and the review date passed" is a different
 * sentence from "this is set to block", and an operator acts on the difference.
 */
export const ENFORCEMENT_MODE_SOURCES = Object.freeze(
  /** @type {const} */ ([
    /** The mode is the one a person recorded, unmodified. */
    'AS_RECORDED',
    /** The recorded mode's `reviewBy` has passed and the ratchet tightened it one
     *  step (D-ENF-3). */
    'EXPIRY_TIGHTENED',
    /** E2 — THE LEDGER NAMES NO SETTING FOR THIS CHECK. The mode is the ceiling
     *  because nothing has been decided, which is a different sentence from
     *  "somebody chose full rigour" and an operator acts on the difference. */
    'NO_SETTING_RECORDED',
    /** E2 — a setting exists and names a mode THIS BUILD DOES NOT KNOW. Ranked at
     *  the ceiling per the class rule; named separately so the ledger being
     *  unreadable is never mistaken for the ledger being strict. */
    'UNRECOGNISED_MODE',
    /** E2 — an override was attempted by an UNATTRIBUTED actor, so it could not
     *  complete and the mode fell through to the ceiling (the operator's ruling on
     *  `ENF-NO-PERSON-IN-IDENTITY-01`). */
    'UNATTRIBUTED_OVERRIDE'
  ])
);

/**
 * WHY the mode in force is the mode in force. DERIVED from the list.
 *
 * ⚠️ **EVERY MEMBER NAMES A DIFFERENT REASON AND NONE OF THEM OVERSTATES.** The
 * rule this vocabulary obeys is the one E1 recorded at the ceiling: a `BLOCK`
 * whose review lapsed reads `AS_RECORDED`, because reporting `EXPIRY_TIGHTENED`
 * would ANNOUNCE AN EVENT THAT DID NOT OCCUR. Three of the five modes below
 * would collapse into a single "it blocked" if they shared a source — and a
 * provenance field that overstates is worse than an absent one, because it is
 * actionable.
 */
/** @typedef {(typeof ENFORCEMENT_MODE_SOURCES)[number]} EnforcementModeSource */

/** The mode actually in force at an instant, and where it came from. */
/**
 * @typedef {{
 *   readonly mode: EnforcementMode;
 *   readonly source: EnforcementModeSource;
 * }} EffectiveEnforcement
 */

/** An ISO calendar day. `reviewBy` is a DAY, not an instant: a review is due by
 *  a date, and a relaxation that expired at 14:32 would be unexplainable. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is this a readable ISO calendar day? The `reviewBy` boundary, exported so the
 * RECORDING verb and the RATCHET hold a review date to ONE standard — the
 * `confirmedQtyWithinBounds` discipline: one expression of the rule, the policy
 * as law and the reader as the consumer that must never see a value it refused.
 *
 * Shape AND readability, both: `'2026-13-45'` matches the pattern and is not a
 * date, and a `reviewBy` that never arrives is a relaxation that never lapses.
 * @param {unknown} value
 * @returns {value is string}
 */
export function isReviewDay(value) {
  return (
    typeof value === 'string' &&
    ISO_DAY.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

/**
 * Has the review date passed at `dispatchInstant`?
 *
 * The comparison is lexicographic over `YYYY-MM-DD`, the house convention
 * (`complianceProjection.js`), and it is STRICTLY GREATER: a review due BY the
 * 30th is still in force ON the 30th and lapses on the 31st. Both boundaries
 * are pinned in the suite, because "past reviewBy" has two defensible readings
 * and an unstated one is a defect waiting for a timezone.
 *
 * ⚠️ **UNREADABLE IS LAPSED.** A malformed `reviewBy` or `dispatchInstant`
 * tightens rather than holds — the `isStalePin` discipline: an unparseable date
 * is not evidence that a relaxation is still current, and defaulting to "in
 * force" would make a typo into a silent relaxation. Fail closed.
 *
 * ⚠️ **AND A MISSING `reviewBy` ON A RELAXED SETTING IS LAPSED TOO**, which is
 * the type rule made to bite AT RUNTIME as well. The type forbids it, but the
 * setting arrives from behind a seam at E2 and a type guarantee is only as
 * strong as the authoring on the other side. Absent on `BLOCK` is legal and
 * means nothing to renew; absent on a relaxation is a malformed record, and a
 * malformed relaxation tightens rather than becoming a permanent one.
 * @param {EnforcementSetting} setting
 * @param {string} dispatchInstant
 * @returns {boolean}
 */
function reviewLapsed(setting, dispatchInstant) {
  /** @type {string | null | undefined} */
  const reviewBy = setting.reviewBy;
  if (reviewBy === null || reviewBy === undefined) return setting.mode !== 'BLOCK';
  const day = dispatchInstant.slice(0, 10);
  // ONE standard for a review date, shared with the recording verb (E2): the
  // policy refuses to WRITE what this refuses to READ, so a date can never be
  // recordable and unreadable at once.
  if (!isReviewDay(reviewBy) || !isReviewDay(day)) return true;
  return day > reviewBy;
}

/**
 * THE MODE IN FORCE at `dispatchInstant` — the setting as recorded, or one step
 * stricter if its review date has passed.
 *
 * **THE RATCHET (D-ENF-3, RULED).** Past `reviewBy` the effective mode TIGHTENS
 * ONE STEP — `OBSERVE` → `BLOCK_OVERRIDABLE` → `BLOCK` — and stays there until
 * a NEW RECORDED ACT renews or ratchets it. One step, not a hard stop, and not
 * a decay ladder: a calendar lapse must not close a dock, so a relaxation
 * degrades by one notch and no further however long it is left. But
 *
 *   NO RELAXATION MAY OUTLIVE THE LAST DELIBERATE DECISION ABOUT IT.
 *
 * ⚠️ A pure function, and `dispatchInstant` is ALWAYS supplied by the caller —
 * see the law-0.5 note in the header. Ten years past a review date is EXACTLY
 * ONE STEP, which is the property that makes this deterministic rather than
 * merely repeatable; the suite pins it at both boundaries and at ten years.
 *
 * `source` names whether the returned mode DIFFERS from the recorded one, so
 * `BLOCK` with a lapsed review reads `AS_RECORDED`: nothing was tightened, because
 * the ceiling is a fixed point.
 * @param {EnforcementSetting} setting
 * @param {string} dispatchInstant
 * @returns {EffectiveEnforcement}
 */
export function effectiveMode(setting, dispatchInstant) {
  if (!reviewLapsed(setting, dispatchInstant)) {
    return { mode: setting.mode, source: 'AS_RECORDED' };
  }
  const tightened = tighten(setting.mode);
  return tightened === setting.mode
    ? { mode: setting.mode, source: 'AS_RECORDED' }
    : { mode: tightened, source: 'EXPIRY_TIGHTENED' };
}
