// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER OVERLAY — THE RULES (Material A1 · MR-1 BR-02, AC-06; plan AD-4, AR-03).
//
// The supplier master is the SAP stand-in and stays frozen. What the hub
// masters about a supplier — today only its stock update mode — sits in an
// append-only overlay, read through ONE resolver. These are the pure halves:
// the refusal the verb's policy hook and the admin page's pre-check both call
// (MAT-R2), and the default a supplier with no overlay row keeps.
// ────────────────────────────────────────────────────────────────────────────

/** @import { StockUpdateMode } from '../data/types' */

/**
 * The two modes, in the order the admin page offers them.
 * @type {readonly StockUpdateMode[]}
 */
export const STOCK_UPDATE_MODES = Object.freeze(['api', 'manual']);

/**
 * @param {unknown} v
 * @returns {v is StockUpdateMode}
 */
export const isStockUpdateMode = (v) => v === 'api' || v === 'manual';

/**
 * A supplier with no overlay row keeps today's behaviour exactly: API when the
 * sample connection list holds it, manual otherwise.
 * @param {boolean} onConnectionList
 * @returns {StockUpdateMode}
 */
export const defaultStockUpdateMode = (onConnectionList) => (onConnectionList ? 'api' : 'manual');

/**
 * Why `t_supplier_set_update_mode` would be refused, or null.
 * `UNKNOWN_SUPPLIER` — the supplier master does not hold the id.
 * `UPDATE_MODE_INVALID` — the value is neither `api` nor `manual`.
 * @param {string} supplierId
 * @param {unknown} mode
 * @param {(id: string) => boolean} isKnownSupplier
 * @returns {string | null}
 */
export function supplierUpdateModeRefusal(supplierId, mode, isKnownSupplier) {
  if (!isKnownSupplier(supplierId))
    return `UNKNOWN_SUPPLIER: ${supplierId} is not on the supplier master`;
  if (!isStockUpdateMode(mode)) {
    return `UPDATE_MODE_INVALID: the stock update mode must be api or manual, got ${JSON.stringify(mode)}`;
  }
  return null;
}

/**
 * The optional reason as recorded: trimmed, and absent when blank.
 * @param {unknown} reason
 * @returns {string | undefined}
 */
export const updateModeReasonOf = (reason) =>
  typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : undefined;
