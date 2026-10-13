// ────────────────────────────────────────────────────────────────────────────
// CAP-12 — open supply and the gap beside the demand anticipation read.
//
// ONE place hands the demand anticipation rows (`allDemandAnticipation`, the
// figure in force per week) and the hub's own POs and call-offs to the pure
// rules (`supplyBelowDemandRules`). Nothing here is stored: open supply, the
// gap and its proposal are computed at read (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationSupplyRow } from '../../transitions/supplyBelowDemandRules' */
import { sdcClock } from '../../sdc';
import { withOpenSupply } from '../../transitions/supplyBelowDemandRules';
import { allDemandAnticipation } from './demandAnticipationReadModel';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';

/**
 * The demand anticipation rows with open supply, the gap and its proposal per week.
 * @param {string} [nowIso]
 * @returns {DemandAnticipationSupplyRow[]}
 */
export function allDemandAnticipationWithSupply(nowIso = sdcClock.now()) {
  return withOpenSupply(allDemandAnticipation(nowIso), {
    pos: purchaseOrderStore.all(),
    callOffs: callOffStore.all()
  });
}
