// ─────────────────────────────────────────────────────────────────────────────
// ORDER FULFILMENT TOLERANCES — read here, set by the administrator
// (REQ-E07-06, REQ-E07-07, BL-32).
//
// Every number the invoice price match and the goods receipt quantity check
// compare against is read through this module:
//   · CR-12 — invoice price tolerance (owner decision 2026-09-21): 0% where a
//     contract price exists for the line; otherwise 2% AND within an absolute
//     rupiah cap set by Finance (PQ-05, BL-54 — owner-approved default
//     IDR 500,000 on 2026-11-20; Finance may change it).
//   · CR-25 — goods receipt quantity tolerance (owner decision 2026-09-21):
//     any over-delivery is flagged; a shortfall above 2% is flagged and keeps
//     the receipt open. Values are held per material.
//
// ⚠️ **THE HUB-WIDE VALUES ARE THE ADMINISTRATOR'S (BL-32).** Their defaults
// live in `hubSettings.js`; the values in force are read from
// `hubSettingsStore.js` at the moment a rule runs, so a change on
// Administration → Tolerances and rule values takes effect at the next check.
// ─────────────────────────────────────────────────────────────────────────────

import { hubSetting } from './hubSettingsStore';
import { materialEntry } from '../sdc/materialMaster';

/** CR-12 — the invoice price tolerance. */
/**
 * `contractPricePct`:  A line whose PO price comes from a contract may differ by up to this percentage (decided: 0).
 * `standardPct`:  A line without a contract price may differ by up to this percentage…
 * `standardCapIdr`:  …and by at most this many rupiah (owner-approved default 2026-11-20, BL-54; Finance may change it).
 *
 * @typedef {{
 *   readonly contractPricePct: number;
 *   readonly standardPct: number;
 *   readonly standardCapIdr: number;
 * }} InvoicePriceTolerance
 */

/**
 * CR-12 — the invoice price tolerance IN FORCE, read at the moment of the call.
 * @returns {InvoicePriceTolerance}
 */
export function invoicePriceTolerance() {
  return {
    contractPricePct: hubSetting('invoice.contractPricePct'),
    standardPct: hubSetting('invoice.standardPct'),
    standardCapIdr: hubSetting('invoice.standardCapIdr')
  };
}

/** CR-25 — the receipt quantity tolerance for one material, in percent of what was shipped. */
/**
 * `overPct`:  Over-delivery allowed without a flag. 0 = any quantity above is flagged.
 * `shortPct`:  Shortfall allowed without a flag; above it the receipt stays open.
 *
 * @typedef {{
 *   readonly overPct: number;
 *   readonly shortPct: number;
 * }} ReceiptQtyTolerance
 */

/**
 * CR-25 — the default for every material, IN FORCE (administrator's values).
 * @returns {ReceiptQtyTolerance}
 */
export function receiptQtyToleranceDefault() {
  return { overPct: hubSetting('receipt.overPct'), shortPct: hubSetting('receipt.shortPct') };
}

/**
 * CR-25 — "values held per material": a material that needs a different
 * tolerance is listed here by material code. None is agreed yet, so the list
 * is empty and every material uses the default. ⚠️ Not on the admin page:
 * there is no per-material value to change, and a form for one would be a
 * control for a decision nobody has asked for.
 * @type {Readonly<Record<string, ReceiptQtyTolerance>>}
 */
export const RECEIPT_QTY_TOLERANCE_BY_MATERIAL = Object.freeze({});

/**
 * The receipt quantity tolerance for one material, in force now.
 * @param {string} materialCode
 * @returns {ReceiptQtyTolerance}
 */
export function receiptQtyToleranceFor(materialCode) {
  return RECEIPT_QTY_TOLERANCE_BY_MATERIAL[materialCode] ?? receiptQtyToleranceDefault();
}

/**
 * MR-6 BR-06 — the hub's default minimum remaining shelf life, in calendar
 * months, IN FORCE: used where the material master holds no minimum.
 * @returns {number}
 */
export function shelfLifeDefaultMonths() {
  return hubSetting('shelfLife.defaultMonths');
}

/** MR-6 BR-05 to BR-07 — whether a material's expiry is checked, and against what. */
/**
 * `relevant`:  `shelfLifeRelevant` as the material master resolves it (A2; owner ruling 2026-09-29).
 * `minMonths`:  `minRemainingShelfLifeMonths`, else `shelfLife.defaultMonths`.
 *
 * @typedef {{
 *   readonly relevant: boolean;
 *   readonly minMonths: number;
 * }} ShelfLifeRule
 */

/**
 * The shelf-life rule for one material, read through `materialEntry` (MAT-R15)
 * at the moment of the call. Null when the master does not know the code: an
 * unknown material is refused elsewhere, never guessed here.
 * @param {string} materialCode
 * @returns {ShelfLifeRule | null}
 */
export function shelfLifeRuleFor(materialCode) {
  const entry = materialEntry(materialCode);
  if (!entry) return null;
  return {
    relevant: entry.shelfLifeRelevant === true,
    minMonths: entry.minRemainingShelfLifeMonths ?? shelfLifeDefaultMonths()
  };
}
