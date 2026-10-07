// ────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER MASTER RESOLVER — Material A1 (plan AD-4, AR-03, AR-06; MAT-R15).
//
// The fixture (`data/mockSuppliers.js`) is the stand-in for SAP's vendor master
// and is never edited. Hub-mastered fields live in `supplierOverlayStore`, and
// every reader asks THIS module, so "the supplier as the hub sees it" has one
// answer — the `materialEntry` shape, for suppliers.
//
// ⚠️ **ONE ANSWER TO "IS THIS SUPPLIER API-CONNECTED?"** It is
// `stockUpdateModeOf(id) === 'api'`. `API_CONNECTIONS` is only the fixture of
// SIMULATED pull outcomes; its membership decides nothing except the default
// for a supplier the administrator has never set.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SupplierExtended } from '@data/mockSuppliers' */
import { mockSuppliers } from '@data/mockSuppliers';
/** @import { StockUpdateMode, SupplierStockUpdateMode } from '../types' */
import { defaultStockUpdateMode } from '../../transitions/supplierOverlayRules';
import { supplierOverlayStore } from './stores/supplierOverlayStore';
import { API_CONNECTIONS } from './fixtures/inventoryHub';

/** A supplier master row merged with its hub-mastered fields. */
/** @typedef {SupplierExtended & { readonly stockUpdateMode: StockUpdateMode }} SupplierEntry */

/**
 * @param {string} supplierId
 * @returns {boolean}
 */
export const isKnownSupplier = (supplierId) => mockSuppliers.some((s) => s.id === supplierId);

/**
 * The supplier's stock update mode: its latest overlay row, or — with none —
 * API when the sample connection list holds it and manual otherwise.
 *
 * With `asOf` (Material B1, MR-1 edge case 1): the mode as it stood at that
 * instant — the latest row set at or before it, else the default.
 * @param {string} supplierId
 * @param {string} [asOf]
 * @returns {StockUpdateMode}
 */
export function stockUpdateModeOf(supplierId, asOf) {
  const row =
    asOf === undefined
      ? supplierOverlayStore.latestFor(supplierId)
      : supplierOverlayStore
          .historyFor(supplierId)
          .filter((r) => Date.parse(r.setAt) <= Date.parse(asOf))
          .slice(-1)[0];
  return (
    row?.stockUpdateMode ??
    defaultStockUpdateMode(Object.prototype.hasOwnProperty.call(API_CONNECTIONS, supplierId))
  );
}

/**
 * The fixture supplier merged with its latest overlay row, or null for an unknown id.
 * @param {string} supplierId
 * @returns {SupplierEntry | null}
 */
export function supplierEntry(supplierId) {
  const base = mockSuppliers.find((s) => s.id === supplierId);
  return base ? { ...base, stockUpdateMode: stockUpdateModeOf(supplierId) } : null;
}

/**
 * Every supplier's mode as resolved, with where it came from and its history.
 * @returns {SupplierStockUpdateMode[]}
 */
export function allStockUpdateModes() {
  return mockSuppliers.map((s) => ({
    supplierId: s.id,
    supplierName: s.name,
    stockUpdateMode: stockUpdateModeOf(s.id),
    source: supplierOverlayStore.latestFor(s.id) ? 'overlay' : 'default',
    history: supplierOverlayStore.historyFor(s.id)
  }));
}
