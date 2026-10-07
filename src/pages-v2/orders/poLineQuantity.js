/** @import { TFunction } from 'i18next' */
import { formatIDR, formatNumber } from '@lib/format';
import { releaseBasis } from '@services/transitions/callOffRules';
/** @import { POLineItem } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-80 (CR-04) — how a PO line's quantity and value read, on every screen.
//
// An SAP value-limit line (BL-49, `valueLimit`) carries NO quantity: it is
// released against its remaining value. Its stored `quantity` is 0, so a screen
// that printed it said "0 KG" — and one that priced it as quantity × unit price
// said "Rp 0" for a line worth its limit. Only the call-off pages knew better.
// One rule for all of them, the one the release check uses (`releaseBasis`).
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {Pick<POLineItem, 'id' | 'quantity' | 'unitPrice' | 'uom' | 'valueLimit'>} Line */

/**
 * True when the line has no quantity and is held to a value limit.
 * @param {Line} line
 * @returns {boolean}
 */
export const isValueOnlyLine = (line) => releaseBasis(line) === 'value';

/**
 * "12,000 PCS", or, on a value-limit line, "No quantity · value limit Rp …".
 * @param {TFunction} t
 * @param {Line} line
 * @returns {string}
 */
export function poLineQuantityText(t, line) {
  return isValueOnlyLine(line)
    ? t('oc.line.valueOnly', { value: formatIDR(line.valueLimit) })
    : `${formatNumber(line.quantity)} ${line.uom}`;
}

/**
 * What the line is worth: its limit on a value-limit line, else quantity × unit price.
 * @param {Line} line
 * @returns {number}
 */
export const poLineValue = (line) =>
  isValueOnlyLine(line)
    ? /** @type {NonNullable<typeof line.valueLimit>} */ (line.valueLimit)
    : line.quantity * line.unitPrice;
