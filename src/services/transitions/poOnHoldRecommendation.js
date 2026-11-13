// ─────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — PEX-12 (BL-TBD): THE RECOMMENDED ACTION. READ-ONLY.
//
// PEX-12 is on Hold: Mba Septi has not given the thresholds that decide auto
// absorb, auto carry-over or manual confirmation (PEX-12; PEX-8 is the manual
// path until then). This file builds the STRUCTURE with NO NUMBERS: [Proposed,
// owner away 2026-11-12; prompts/pex-not-started-suggestions.md row 8].
//
//   · PEX-8 / the end-of-grace execution stays the ONLY path. Nothing here
//     executes, suggests or chooses: it is a note on the line.
//   · Two thresholds per MATERIAL CLASS (the SAP material group `MG-xx`), both
//     a share of the line's open PO quantity (OSPO) in percent, in the planner
//     ledger `t_osipparam_set` (`autoAbsorbMaxPct|<class>`, `autoCarryMaxPct|
//     <class>`). EMPTY by default: nothing is invented.
//   · auto absorb     — the FG option's conditions hold (PEX-8 BR-02), the cap
//                       is known and covers the whole quantity (BR-03/BR-04),
//                       and PO On Hold ≤ autoAbsorbMaxPct of OSPO.
//   · auto carry-over — the FS + spread option's conditions hold and PO On Hold
//                       ≤ autoCarryMaxPct of OSPO. (Carry-over = spread over the
//                       next weeks' call-offs, following DA.)
//   · manual          — everything else, with the reason named.
//
// PURE. No store, no clock.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'autoAbsorb' | 'autoCarryOver' | 'manual'} RecommendedAction */

/**
 * The reason a recommendation carries. A code, rendered by the page
 * (`poh.rec.reason.<code>`); never a number written here.
 * @typedef {'withinAbsorb' | 'withinCarry' | 'noThreshold' | 'aboveThreshold' | 'conditionsNotMet' | 'noCap' | 'overCap' | 'noOspo'} RecommendationReason
 */

/**
 * @typedef {{
 *   readonly action: RecommendedAction;
 *   readonly reason: RecommendationReason;
 *   readonly sharePct: number | null;
 * }} Recommendation
 */

/**
 * The share of the open PO quantity that is on hold, in percent (0-100), or
 * null when there is no open PO quantity to take a share of.
 * @param {number} qty
 * @param {number} ospo
 * @returns {number | null}
 */
export const onHoldSharePct = (qty, ospo) => (ospo > 0 ? (qty / ospo) * 100 : null);

/**
 * @param {{
 *   readonly qty: number;
 *   readonly ospo: number;
 *   readonly conditions: Readonly<Record<'fsOnly' | 'fsSpread' | 'fg', boolean>>;
 *   readonly cap: number | null;
 *   readonly absorbMaxPct: number | null;
 *   readonly carryMaxPct: number | null;
 * }} f  A threshold is null when no planner has set it for the class.
 * @returns {Recommendation}
 */
export function recommendAction(f) {
  if (f.absorbMaxPct === null && f.carryMaxPct === null)
    return { action: 'manual', reason: 'noThreshold', sharePct: null };
  const share = onHoldSharePct(f.qty, f.ospo);
  if (share === null) return { action: 'manual', reason: 'noOspo', sharePct: null };
  // Absorb first: it is the stronger claim (needs the FG conditions and the cap).
  let blocker = /** @type {RecommendationReason} */ ('conditionsNotMet');
  if (f.absorbMaxPct !== null && f.conditions.fg) {
    if (f.cap === null) blocker = 'noCap';
    else if (f.qty > f.cap) blocker = 'overCap';
    else if (share <= f.absorbMaxPct)
      return { action: 'autoAbsorb', reason: 'withinAbsorb', sharePct: share };
    else blocker = 'aboveThreshold';
  }
  if (f.carryMaxPct !== null && f.conditions.fsSpread) {
    if (share <= f.carryMaxPct)
      return { action: 'autoCarryOver', reason: 'withinCarry', sharePct: share };
    blocker = 'aboveThreshold';
  }
  return { action: 'manual', reason: blocker, sharePct: share };
}
