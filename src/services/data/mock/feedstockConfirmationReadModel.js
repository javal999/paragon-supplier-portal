// ────────────────────────────────────────────────────────────────────────────
// BL-194 · FEEDSTOCK CONFIRMATIONS, AS THE READER MAY SEE THEM (DRC-8; DRC-D17).
//
// The latest confirmation per supplier × material is the one in force (BR-a),
// projected onto the stock row it belongs to as its own `feedstock` field.
// The rows reaching `withFeedstock` are already narrowed to the reader (a
// supplier reads its own rows only), so a supplier sees its own confirmation
// and PTI sees every supplier's. A confirmation whose material is no longer
// assigned stays on record but is left out of the read.
//
// Not the feedstock RECONCILE (DRC-15a, `feedstockReadModel.js`): that one
// compares POs with call-offs and ASNs; this one is the supplier's own figure.
//
// MoM 2B (BR-c): this adds a field BESIDE `supplierSoh`; it never changes it.
//
// [Team E2] it also attaches `pullAgreement`: whether the planner set the
// supplier on a pull agreement (`osipParamStore`), which makes its feedstock
// confirmation daily instead of weekly (`feedstockCycleStatus`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FeedstockConfirmation } from '../types' */
import { latestFeedstock } from '../../transitions/feedstockRules';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { isAssignedMaterial } from './inventoryReadModel';
import { osipParamStore } from './stores/osipParamStore';
import { osipParamKey } from '../../transitions/osipParams';

/**
 * The confirmation in force for a supplier × material, or undefined (none, or not assigned).
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {FeedstockConfirmation | undefined}
 */
export function feedstockInForce(supplierId, materialCode) {
  if (!isAssignedMaterial(supplierId, materialCode)) return undefined;
  return latestFeedstock(feedstockConfirmationStore.all(), supplierId, materialCode);
}

/**
 * The row with its supplier's feedstock confirmation in force attached
 * (none when there is none) and [Team E2] its pull-agreement flag.
 * @template {{ readonly supplierId: string; readonly materialCode: string; readonly feedstock?: FeedstockConfirmation; readonly pullAgreement?: boolean }} T
 * @param {T} row
 * @returns {T}
 */
export function withFeedstock(row) {
  const fs = feedstockInForce(row.supplierId, row.materialCode);
  const pullAgreement =
    osipParamStore.valueOf(osipParamKey('pullAgreement', { supplierId: row.supplierId })) === true;
  return { ...row, ...(fs ? { feedstock: fs } : {}), pullAgreement };
}
