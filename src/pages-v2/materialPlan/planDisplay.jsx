// ─────────────────────────────────────────────────────────────────────────────
// Shared display for the engine's material pages (REQ-E14-03, REQ-E14-04):
// one way to show a quantity in its unit.
// ─────────────────────────────────────────────────────────────────────────────

import { formatNumber } from '@lib/format';
/** @import { Uom } from '@services/sdc/types' */

/**
 * A quantity in its unit: whole pieces, kilograms to one decimal.
 * @param {number} value
 * @param {Uom} uom
 * @returns {string}
 */
export const qtyOf = (value, uom) =>
  formatNumber(uom === 'PCS' ? Math.round(value) : Math.round(value * 10) / 10);
