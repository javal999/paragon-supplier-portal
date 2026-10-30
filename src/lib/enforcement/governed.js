// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS GOVERNED — the closed check-id and verdict vocabularies, and the
// refusal census that keeps the refusal shapes OUTSIDE them. Split out of
// `enforcement.js` (BL-229) because it is the vocabulary the setting and the
// stamp are keyed on, and it holds the module's only imports from outside
// (two type-only `@import`s).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { BpomRefusalReason } from '@services/sdc/bpom' */
/** @import { HalalRefusalReason } from '@services/sdc/halal' */

// ─── What is governed ────────────────────────────────────────────────────────

/**
 * The checks an enforcement mode may govern. A CLOSED UNION, APPEND-ONLY: a
 * check that is not named here cannot be relaxed, because there is no id to
 * hang a setting on.
 *
 * ⚠️ **REFUSALS ARE NOT IN IT AND NEVER WILL BE.** They are not checks; they
 * are absences. `enforcement.test.js` asserts the disjointness rather than
 * trusting this sentence.
 */
export const GOVERNED_CHECK_IDS = Object.freeze(
  /** @type {const} */ ([
    /** Fact 2 — an inspector looked at the physical seal and ticked it (H2). */
    'halal.seal',
    /** Fact 3 — a halal-class certificate backs the claim at the receipt instant
     *  (`verifyHalalAtReceipt`, H3 — headless until H4). */
    'halal.certificate',
    /** The BPOM lot check on a received line (`bpomOf`, wired at 2B-4b). */
    'bpom.lot'
  ])
);

/** The governed check ids as a type. DERIVED from the list. */
/** @typedef {(typeof GOVERNED_CHECK_IDS)[number]} GovernedCheckId */

/**
 * The same boundary for a check id, and for the same reason.
 * (The same boundary as `isEnforcementMode` above; declared here, after the
 * list it reads, because the JS lint config enables `no-use-before-define`.)
 * @param {string} value
 * @returns {value is GovernedCheckId}
 */
export function isGovernedCheckId(value) {
  return /** @type {readonly string[]} */ (GOVERNED_CHECK_IDS).includes(value);
}

/**
 * What a governed check ANSWERED. Three members, and the two non-passing ones
 * are the mode's ENTIRE domain:
 *
 *   `PASS`        the question was posed and the answer is satisfactory.
 *   `ADVERSE`     the question was posed and the answer is bad — answered-and-adverse.
 *   `UNANSWERED`  the question was posed and nobody answered it — asked-and-unanswered.
 *
 * ⚠️ **A REFUSAL IS NOT A MEMBER**, and its absence is the boundary named in
 * the header. `UNKNOWN_MATERIAL` and `UNDETERMINED_APPLICABILITY` say the
 * question COULD NOT BE POSED; `UNANSWERED` says it was posed and is
 * outstanding. Folding the first into the second would let a mode relax an
 * absence, which is precisely what nothing may do.
 */
export const GOVERNED_VERDICTS = Object.freeze(
  /** @type {const} */ (['PASS', 'ADVERSE', 'UNANSWERED'])
);

/** The governed verdicts as a type. DERIVED from the list. */
/** @typedef {(typeof GOVERNED_VERDICTS)[number]} GovernedVerdict */

/**
 * The verdicts an override may act on. Derived by exclusion: you cannot
 * override a `PASS`, because nothing stopped.
 */
/** @typedef {Exclude<GovernedVerdict, 'PASS'>} OverridableVerdict */

/**
 * Narrow an arbitrary string to a governed verdict. The boundary that makes a
 * widening honest instead of a cast (the `isBidCurrency` precedent) — and the
 * function the refusal test drives: at EVERY mode, both refusal reasons answer
 * `false` here, identically.
 * @param {string} value
 * @returns {value is GovernedVerdict}
 */
export function isGovernedVerdict(value) {
  return /** @type {readonly string[]} */ (GOVERNED_VERDICTS).includes(value);
}

/**
 * The refusal shapes that sit OUTSIDE the enforcement domain — **DERIVED FROM
 * THE TWO LOOKUPS' OWN UNIONS, NOT LISTED BESIDE THEM.**
 *
 * The `satisfies` is the census: a third refusal reason added to `halalOf` or
 * `bpomOf` tomorrow fails to compile HERE until somebody consciously places it,
 * so a new absence cannot quietly become a governed verdict. The import is
 * TYPE-ONLY — this module calls neither lookup and acquires no consumer by
 * naming their vocabularies (`complianceView.js` sets the lib → services
 * type-import precedent).
 */
const REFUSAL_CENSUS = /** @satisfies {Record<HalalRefusalReason | BpomRefusalReason, true>} */ (
  /** @type {const} */ ({
    UNKNOWN_MATERIAL: true,
    UNDETERMINED_APPLICABILITY: true
  })
);

/**
 * The refusal shapes, as data, for the disjointness assertions.
 * @type {readonly string[]}
 */
export const REFUSALS_OUTSIDE_ENFORCEMENT = Object.freeze(Object.keys(REFUSAL_CENSUS));
