// ─────────────────────────────────────────────────────────────────────────────
// Shared display for the engine's material pages (REQ-E14-03, REQ-E14-04):
// one way to show a quantity in its unit.
// ─────────────────────────────────────────────────────────────────────────────

import { formatNumber } from '../../lib/format';
import type { Uom } from '../../services/sdc/types';

/** A quantity in its unit: whole pieces, kilograms to one decimal. */
export const qtyOf = (value: number, uom: Uom): string =>
  formatNumber(uom === 'PCS' ? Math.round(value) : Math.round(value * 10) / 10);
