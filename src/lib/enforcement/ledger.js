// ─────────────────────────────────────────────────────────────────────────────
// THE LEDGER (E2) — the pure derivations over the append-only setting ledger:
// `settingInForce`, `settingHistory`, `effectiveEnforcement`. Split out of
// `enforcement.js` (BL-229) because this is the read side the store and the
// gate call, and it holds the "maximum rigour" fall-throughs.
// ─────────────────────────────────────────────────────────────────────────────

import { MAXIMUM_RIGOUR, isEnforcementMode } from './ramp';
import { effectiveMode } from './ratchet';
/** @import { GovernedCheckId } from './governed' */
/** @import { EnforcementSetting } from './setting' */
/** @import { EffectiveEnforcement } from './ratchet' */

// ─── E2 · the ledger (append-only; effective DERIVED — the `effectivePin` shape)

/**
 * THE SETTING IN FORCE for one check — the LAST recorded one, which is what
 * "supersedes" means on an append-only ledger. Derived, never stored.
 *
 * `effectivePin` EXACTLY, including the tie-break: ordered by `setAt`, with
 * LATER ARRAY POSITION winning a tie, because two acts recorded in the same
 * millisecond are ordered by the sequence they were appended in and that is the
 * only ordering that exists at that resolution.
 *
 * ⚠️ **THE KEY IS `checkId` ALONE (D1, ruled), AND WIDENING IT IS ADDITIVE.**
 * The ledger is a FLAT ARRAY, deliberately not `Record<GovernedCheckId, …>` —
 * the `fxPin` header's own words, "an APPEND-ONLY LEDGER, not a map keyed by
 * currency". A map would bake one field into the shape of the store; an array
 * bakes nothing, so adding a dimension (supplier · plant · material) later
 * changes exactly TWO expressions — the predicate on the next line and the
 * comparator below it — and no stored record and no call site. That is why the
 * cost of not foreclosing D1 here is nil.
 * @param {readonly EnforcementSetting[] | undefined} ledger
 * @param {GovernedCheckId} checkId
 * @returns {EnforcementSetting | undefined}
 */
export function settingInForce(ledger, checkId) {
  if (!ledger) return undefined;
  /** @type {EnforcementSetting | undefined} */
  let winner;
  for (const setting of ledger) {
    if (setting.checkId !== checkId) continue;
    if (!winner || setting.setAt >= winner.setAt) winner = setting;
  }
  return winner;
}

/**
 * Every setting ever recorded for a check, in ledger order — the superseded acts
 * the append-only rule preserves. `pinHistory`'s twin, and it exists for the same
 * reason: so "the prior decision is kept" is a READABLE FACT rather than a claim.
 *
 * ⚠️ This is what a mutable current-setting record would have destroyed. The
 * ratchet tightens against a `reviewBy`; overwrite the record and the date it
 * tightened against is gone, so THE RATCHET BECOMES UNAUDITABLE — you can see
 * that it bit and never why.
 * @param {readonly EnforcementSetting[] | undefined} ledger
 * @param {GovernedCheckId} checkId
 * @returns {readonly EnforcementSetting[]}
 */
export function settingHistory(ledger, checkId) {
  return (ledger ?? []).filter((s) => s.checkId === checkId);
}

/**
 * THE MODE IN FORCE for a check at an instant, read off the whole ledger. The
 * one function a gate at E3 would call, and the only place the three
 * "maximum rigour" fall-throughs live.
 *
 * ⚠️ **AN EMPTY LEDGER IS THE CEILING, NOT A HOLE.** No recorded setting means
 * nothing has been relaxed, so the mode is `MAXIMUM_RIGOUR` and the source says
 * `NO_SETTING_RECORDED` — never `AS_RECORDED`, because nobody set it. This is why
 * seeding nothing (D-ENF-4 is UNRULED) does not leave the system undefended: the
 * un-governed state IS the strict state.
 *
 * ⚠️ **AN UNRECOGNISED MODE RANKS AT THE CEILING** — the class rule
 * (`ENF-UNKNOWN-MODE-FAILS-OPEN-01`), applied at the seam where it matters. The
 * ledger arrives from behind `useDataService()` as JSON, and JSON has no unions;
 * a typo in a stored mode must mean MAXIMUM rigour, never minimum. It is named
 * separately from `NO_SETTING_RECORDED` because "unreadable" and "undecided" are
 * different problems with different fixes.
 * @param {readonly EnforcementSetting[] | undefined} ledger
 * @param {GovernedCheckId} checkId
 * @param {string} dispatchInstant
 * @returns {EffectiveEnforcement}
 */
export function effectiveEnforcement(ledger, checkId, dispatchInstant) {
  const setting = settingInForce(ledger, checkId);
  if (!setting) return { mode: MAXIMUM_RIGOUR, source: 'NO_SETTING_RECORDED' };
  if (!isEnforcementMode(setting.mode)) {
    return { mode: MAXIMUM_RIGOUR, source: 'UNRECOGNISED_MODE' };
  }
  return effectiveMode(setting, dispatchInstant);
}
