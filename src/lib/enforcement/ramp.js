// ─────────────────────────────────────────────────────────────────────────────
// THE RAMP — the three enforcement modes in ascending order of rigour, and the
// functions that read the order (`rigour`, `blocks`, `overrideAllowed`,
// `tighten`, `MAXIMUM_RIGOUR`). Split out of `enforcement.js` (BL-229) because
// every other file here reads the ramp and the ramp reads nothing.
// The module header, with the rulings, is in `./index.js`.
// ─────────────────────────────────────────────────────────────────────────────

// ─── The ramp ────────────────────────────────────────────────────────────────

/**
 * The enforcement modes, **IN ASCENDING ORDER OF RIGOUR**. The order is not
 * presentation: it IS the ramp, and index comparisons are how the ramp is read
 * (`rigour`, `blocks`, `tighten` all derive from this array and nothing
 * restates it).
 *
 *   `OBSERVE`            pose the question, record the answer, do not block.
 *   `BLOCK_OVERRIDABLE`  block — and a named person may override, on the record.
 *   `BLOCK`              block. There is no override at full rigour.
 *
 * ⚠️ **NO FOURTH MEMBER BELOW `OBSERVE`, EVER.** See the header: a mode that
 * hides the question is the fail-open `inferBpom`/`inferHalal` were retired
 * for, and its absence from this array is the mechanism that forbids it.
 */
export const ENFORCEMENT_MODES = Object.freeze(
  /** @type {const} */ (['OBSERVE', 'BLOCK_OVERRIDABLE', 'BLOCK'])
);

/** The enforcement modes as a type. DERIVED — never hand-written beside the list. */
/** @typedef {(typeof ENFORCEMENT_MODES)[number]} EnforcementMode */

/** The modes that are a RELAXATION — anything short of full rigour. Derived by
 *  exclusion, so a mode inserted into the ramp is relaxed unless it is `BLOCK`. */
/** @typedef {Exclude<EnforcementMode, 'BLOCK'>} RelaxedMode */

/**
 * The top of the ramp — **DERIVED FROM THE ARRAY, never the literal `'BLOCK'`.**
 *
 * E2 needs "maximum rigour" in three places (no setting recorded, an
 * unrecognised mode, a refused override) and each of them is the class rule
 * `AN UNRECOGNISED MEMBER OF A GOVERNING ENUM RANKS AT THE CEILING`. Writing
 * `'BLOCK'` three times would restate the ramp three times; taking the last
 * element means a stricter mode appended tomorrow moves all three at once.
 * @type {EnforcementMode}
 */
export const MAXIMUM_RIGOUR = ENFORCEMENT_MODES[ENFORCEMENT_MODES.length - 1];

/**
 * Narrow an arbitrary string to an enforcement mode — **THE BOUNDARY E2 MUST
 * USE.** The setting arrives from behind the seam as JSON, and JSON has no
 * unions; a widening that is not narrowed here is a cast wearing a type's
 * clothes (the `isBidCurrency` precedent).
 * @param {string} value
 * @returns {value is EnforcementMode}
 */
export function isEnforcementMode(value) {
  return /** @type {readonly string[]} */ (ENFORCEMENT_MODES).includes(value);
}

/**
 * A mode's position on the ramp. Higher is stricter. Exported because the
 * comparison is the contract — a consumer that wants "at least as strict as X"
 * must be able to say so without re-deriving the order.
 *
 * ⚠️ **AN UNRECOGNISED MODE RANKS AT THE CEILING, NOT AT −1.** It cannot arrive
 * through the type — but it can arrive through a seam at E2 as a string nobody
 * narrowed, and `indexOf`'s −1 would make `blocks` return FALSE. **A TYPO IN A
 * SETTING WOULD THEN TURN THE GATE OFF**, which is the fail-open this whole
 * module exists to make unrepresentable. Ranking it at full rigour is the only
 * direction that is safe to be wrong in. `isEnforcementMode` is how a caller
 * finds out instead of guessing.
 * @param {EnforcementMode} mode
 * @returns {number}
 */
export function rigour(mode) {
  const index = ENFORCEMENT_MODES.indexOf(mode);
  return index === -1 ? ENFORCEMENT_MODES.length - 1 : index;
}

/** Does this mode stop the command? True from `BLOCK_OVERRIDABLE` upward — the
 * @param {EnforcementMode} mode
 * @returns {boolean}
 *  ramp comparison the header names, written once. */
export function blocks(mode) {
  return rigour(mode) >= rigour('BLOCK_OVERRIDABLE');
}

/**
 * May a named person override at this mode? Exactly ONE mode says yes.
 *
 * `OBSERVE` has nothing to override — it never blocked. `BLOCK` is full rigour
 * and an override there would be the relaxation the mode exists to deny. An
 * override recorded at either is INCOHERENT, not merely unusual, and
 * `isCoherentStamp` refuses it.
 * @param {EnforcementMode} mode
 * @returns {boolean}
 */
export function overrideAllowed(mode) {
  return mode === 'BLOCK_OVERRIDABLE';
}

/**
 * One step up the ramp. **DERIVED FROM THE ORDER, NOT A SECOND TABLE** — a
 * `Record<EnforcementMode, EnforcementMode>` would state the ramp twice and the
 * two could disagree.
 *
 * `BLOCK` tightens to `BLOCK`: the ceiling is a fixed point, which is what
 * makes the ratchet below terminate rather than needing a special case.
 * @param {EnforcementMode} mode
 * @returns {EnforcementMode}
 */
export function tighten(mode) {
  /** @type {EnforcementMode | undefined} */
  const next = ENFORCEMENT_MODES[rigour(mode) + 1];
  return next ?? mode;
}
