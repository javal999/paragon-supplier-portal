// ────────────────────────────────────────────────────────────────────────────
// DRC-15a (BL-201) — the feedstock (FS) reconcile read model over the mock
// stores. Replaces the fixed stock reconcile read model [DRC-D14].
//
// Hands the purchase orders, the call-offs and the ASNs, as the hub holds them
// on its current day, to the pure rule (`transitions/feedstockReconcile`),
// with the max stock Procurement maintains (BR-03). Nothing computed here is
// stored. The supplier scope is applied by the service, never here or on the
// page (DRC-15a BR-04).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FsRow } from '../../transitions/feedstockReconcile' */
import { buildFeedstockReconcile } from '../../transitions/feedstockReconcile';
import { maxStockFor } from '../../transitions/maxStock';
import { sdcClock } from '../../sdc/clock';
import { dayOf } from '../../engine/dates';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { isAssignedMaterial } from './inventoryReadModel';

/**
 * DRC-15a BR-01 — every supplier × material row, read as of the hub's current day.
 * @param {string} [nowIso]
 * @returns {FsRow[]}
 */
export function allFeedstockRows(nowIso = sdcClock.now()) {
  return buildFeedstockReconcile({
    purchaseOrders: purchaseOrderStore.all(),
    callOffs: callOffStore.all(),
    asns: asnStore.all(),
    maxStock: maxStockFor,
    maxStockSettable: isAssignedMaterial,
    asOf: dayOf(nowIso)
  });
}
