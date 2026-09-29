// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER OVERLAY — THE RULES (Material A1 · MR-1 BR-02, AC-06; plan AD-4, AR-03).
//
// The supplier master is the SAP stand-in and stays frozen. What the hub
// masters about a supplier — today only its stock update mode — sits in an
// append-only overlay, read through ONE resolver. These are the pure halves:
// the refusal the verb's policy hook and the admin page's pre-check both call
// (MAT-R2), and the default a supplier with no overlay row keeps.
// ────────────────────────────────────────────────────────────────────────────

import type { StockUpdateMode } from '../data/types';

/** The two modes, in the order the admin page offers them. */
export const STOCK_UPDATE_MODES: readonly StockUpdateMode[] = Object.freeze(['api', 'manual']);

export const isStockUpdateMode = (v: unknown): v is StockUpdateMode => v === 'api' || v === 'manual';

/**
 * A supplier with no overlay row keeps today's behaviour exactly: API when the
 * sample connection list holds it, manual otherwise.
 */
export const defaultStockUpdateMode = (onConnectionList: boolean): StockUpdateMode =>
  onConnectionList ? 'api' : 'manual';

/**
 * Why `t_supplier_set_update_mode` would be refused, or null.
 * `UNKNOWN_SUPPLIER` — the supplier master does not hold the id.
 * `UPDATE_MODE_INVALID` — the value is neither `api` nor `manual`.
 */
export function supplierUpdateModeRefusal(
  supplierId: string,
  mode: unknown,
  isKnownSupplier: (id: string) => boolean,
): string | null {
  if (!isKnownSupplier(supplierId)) return `UNKNOWN_SUPPLIER: ${supplierId} is not on the supplier master`;
  if (!isStockUpdateMode(mode)) {
    return `UPDATE_MODE_INVALID: the stock update mode must be api or manual, got ${JSON.stringify(mode)}`;
  }
  return null;
}

/** The optional reason as recorded: trimmed, and absent when blank. */
export const updateModeReasonOf = (reason: unknown): string | undefined =>
  typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : undefined;
