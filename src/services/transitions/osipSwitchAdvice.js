// ─────────────────────────────────────────────────────────────────────────────
// SWITCH ADVICE — PEX-13 BR-04 (BL-275) [Proposed]. The rules that would flip the
// safety stock and protection buffer switches wait on Mba Septi; until she gives
// them, the hub only ADVISES: "suggested: switch off, because ...". The planner
// flips the switch (a reason of 10+ characters is required, BR-02). Nothing here
// writes, so no ledger row and no DA version is created by a suggestion.
//
// THE RULES ARE [Proposed] best practice, not the team's:
//   · safety stock: suggest OFF when it is on and the material has no LTP and no
//     recorded consumption at any supplier (nothing to protect against); suggest
//     ON when it is off and either appears again.
//   · protection buffer: it protects against planned demand (LTP B), so suggest
//     OFF when it is on and no supplier has LTP; suggest ON when it is off and
//     LTP appears again.
// Alternative if wrong: automatic flipping on a rule list from the team. Each
// automatic flip would then write a DA version (PEX-13 BR-03) and needs the list.
//
// Pure: inputs in, advice out. No store, no clock.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'safetyStockOn' | 'protectionBufferOn'} SwitchParam */
/** @typedef {'noDemand' | 'demandBack'} AdviceReason */

/**
 * `suggested`: the state the advice proposes (false = switch off).
 * @typedef {{
 *   readonly param: SwitchParam;
 *   readonly suggested: boolean;
 *   readonly reason: AdviceReason;
 * }} SwitchAdvice
 */

/** @param {readonly number[] | undefined} xs */
const total = (xs) => (xs ?? []).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

/**
 * The advice for one switch of one material, or null when the switch already
 * stands where the advice would put it.
 * @param {SwitchParam} param
 * @param {boolean} on  The switch in force.
 * @param {readonly { readonly ltp?: readonly number[]; readonly consumption?: readonly number[] }[]} suppliers
 *   The material's supplier inputs (LTP over the weeks read, recorded consumption).
 * @returns {SwitchAdvice | null}
 */
export function switchAdvice(param, on, suppliers) {
  const ltp = suppliers.reduce((s, x) => s + total(x.ltp), 0);
  const consumption = suppliers.reduce((s, x) => s + total(x.consumption), 0);
  const demand = param === 'safetyStockOn' ? ltp > 0 || consumption > 0 : ltp > 0;
  if (on && !demand) return { param, suggested: false, reason: 'noDemand' };
  if (!on && demand) return { param, suggested: true, reason: 'demandBack' };
  return null;
}
