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
// ────────────────────────────────────────────────────────────────────────────

/** @import { FgDemandByMaterial } from '../../transitions/ltpFgDemandRules' */
import { sdcClock } from '../../sdc';
import { dayOf } from '../../engine/dates';
import { defaultRequirementOptions, materialRequirement } from '../../engine/requirement';
import { withLtpFgDemand } from '../../transitions/ltpFgDemandRules';
import { engineDataset } from './fixtures/engineDataset';
import { consumptionStore } from './stores/consumptionStore';

/**
 * The material-level FG demand per week: the engine's gross requirement, over
 * its horizon from the current hub week.
 * @param {string} nowIso
 * @returns {FgDemandByMaterial}
 */
export function fgDemandByMaterial(nowIso) {
  const run = materialRequirement(engineDataset(), defaultRequirementOptions(dayOf(nowIso)));
  return new Map(
    run.materials.map((m) => [m.materialCode, new Map(m.weeks.map((w) => [w.weekStart, w.gross]))])
  );
}

/**
 * DRC-18 — the demand anticipation rows with FG demand, LTP − FG demand and
 * the consumption moving average per week.
 * @template {Parameters<typeof withLtpFgDemand>[0][number]} R
 * @param {readonly R[]} rows
 * @param {string} [nowIso]
 */
export function withLtpFgDemandRead(rows, nowIso = sdcClock.now()) {
  return withLtpFgDemand(rows, {
    fgDemand: fgDemandByMaterial(nowIso),
    records: consumptionStore.all(),
    nowIso
  });
}
