// ────────────────────────────────────────────────────────────────────────────
// DRC-18 (BL-203) — LTP vs finished-goods demand and the consumption moving
// average, beside the demand anticipation read.
//
// ONE place hands the pure rules (`ltpFgDemandRules`) their inputs:
//   · FG demand at material level — the forecast engine's gross requirement
//     (REQ-E14-03: the finished-goods plan and sales orders exploded through
//     the BOM), on the engine's SIMULATED dataset at the hub clock;
//   · recorded consumption — `consumptionStore` (CAP-11).
// Computed at read, never stored (law 0.5). The demand anticipation rows are
// passed through untouched apart from the added week fields.
//
// PSC-3 (BL-338) — the same run also answers what the LTP batch preview asks:
//   · the finished goods behind each material × week (the run's pegs, grouped
//     by FG) — one row covers every FG that uses the material (BR-02);
//   · every FG that uses the material, from the BOM (directly or through a
//     bulk), and which of them carry no row in the FG plan version in force.
//     An FG with no plan is left out of the computed total and the page says
//     so (PSC-3 edge case [Proposed]).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FgBreakdownByMaterial, FgDemandByMaterial, FgUsersByMaterial } from '../../transitions/ltpFgDemandRules' */
import { sdcClock } from '../../sdc';
import { dayOf } from '../../engine/dates';
import {
  defaultRequirementOptions,
  materialRequirement,
  planInForce
} from '../../engine/requirement';
import { materialFgUsers, pegsByFg, withLtpFgDemand } from '../../transitions/ltpFgDemandRules';
import { engineDataset } from './fixtures/engineDataset';
import { consumptionStore } from './stores/consumptionStore';

/**
 * The inputs of one scope's batch preview for the FG plan version in force:
 * the material-level totals per week, the FG breakdown behind them, and the
 * finished goods that use a material without a plan.
 *
 * `fgPlanInForce`:  The `madeAt` date of the plan version the run read, null
 *   when no plan exists yet (every FG then counts as no plan).
 * @typedef {{
 *   readonly totals: FgDemandByMaterial;
 *   readonly breakdown: FgBreakdownByMaterial;
 *   readonly fgUsers: FgUsersByMaterial;
 *   readonly noPlanFgs: FgUsersByMaterial;
 *   readonly fgPlanInForce: string | null;
 * }} FgDemandInputs
 */

/**
 * @param {string} nowIso
 * @returns {FgDemandInputs}
 */
export function fgDemandInputs(nowIso) {
  const data = engineDataset();
  const asOf = dayOf(nowIso);
  const run = materialRequirement(data, defaultRequirementOptions(asOf));
  const planMadeAt = planInForce(data, asOf);
  const plannedSkus = new Set(
    planMadeAt === null
      ? []
      : data.fgPlan.filter((p) => p.madeAt === planMadeAt).map((p) => p.skuCode)
  );
  const users = materialFgUsers(
    data.bom,
    data.finishedGoods.map((fg) => fg.skuCode)
  );
  /** @type {Map<string, readonly string[]>} */
  const noPlan = new Map();
  for (const [materialCode, fgs] of users) {
    const missing = fgs.filter((sku) => !plannedSkus.has(sku));
    if (missing.length > 0) noPlan.set(materialCode, missing);
  }
  return {
    totals: new Map(
      run.materials.map((m) => [
        m.materialCode,
        new Map(m.weeks.map((w) => [w.weekStart, w.gross]))
      ])
    ),
    breakdown: new Map(
      run.materials.map((m) => [
        m.materialCode,
        new Map(m.weeks.map((w) => [w.weekStart, pegsByFg(w.pegs)]))
      ])
    ),
    fgUsers: users,
    noPlanFgs: noPlan,
    fgPlanInForce: planMadeAt
  };
}

/**
 * The material-level FG demand per week: the engine's gross requirement, over
 * its horizon from the current hub week.
 * @param {string} nowIso
 * @returns {FgDemandByMaterial}
 */
export function fgDemandByMaterial(nowIso) {
  return fgDemandInputs(nowIso).totals;
}

/**
 * DRC-18 — the demand anticipation rows with FG demand, LTP − FG demand and
 * the consumption moving average per week; PSC-3 adds the FG breakdown and
 * the no-plan FGs.
 * @template {Parameters<typeof withLtpFgDemand>[0][number]} R
 * @param {readonly R[]} rows
 * @param {string} [nowIso]
 */
export function withLtpFgDemandRead(rows, nowIso = sdcClock.now()) {
  const inputs = fgDemandInputs(nowIso);
  return withLtpFgDemand(rows, {
    fgDemand: inputs.totals,
    fgBreakdown: inputs.breakdown,
    fgUsers: inputs.fgUsers,
    noPlanFgs: inputs.noPlanFgs,
    records: consumptionStore.all(),
    nowIso
  });
}
