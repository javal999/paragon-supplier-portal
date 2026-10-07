// BuyerStabilise — pure display helpers (no React).
// Moved out of the page file unchanged (frontend-standard Phase 5 split).

/** @import { StabilisedSeriesView } from '@services/data/types' */
/** @import { Tab } from './const' */
import { formatNumber } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
import { qtyOf } from '../materialPlan/planDisplay';

/**
 * A week's short label, `W<iso week>`.
 * @param {string} w
 */
export const weekLabel = (w) => `W${isoWeek(w)}`;
/**
 * A ratio to three decimals, or `—` when there is none.
 * @param {number | null} x
 */
export const ratio = (x) => (x === null ? '—' : formatNumber(Math.round(x * 1000) / 1000));
/**
 * A share as a percentage to one decimal, or `—` when there is none.
 * @param {number | null} x
 */
export const pctShare = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);
/**
 * The arithmetic mean, or null for an empty list.
 * @param {readonly number[]} xs
 * @returns {number | null}
 */
export const meanOf = (xs) => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
/**
 * A quantity with its unit, or `—` when there is none.
 * @param {number | null} x
 * @param {StabilisedSeriesView['uom']} uom
 */
export const qty = (x, uom) => (x === null ? '—' : `${qtyOf(x, uom)} ${uom}`);

/**
 * A series' weeks held by each rule family: Firm kept, held to the band, damped.
 * @param {Pick<StabilisedSeriesView, 'counts'>} s
 */
export const held = (s) => ({
  firm: s.counts.firmFrozen,
  band: s.counts.bandHeld + s.counts.cumulativeHeld,
  damped: s.counts.damped
});
/**
 * Whether any week of the series was held by a rule.
 * @param {StabilisedSeriesView} s
 */
export const anyHeld = (s) => {
  const h = held(s);
  return h.firm + h.band + h.damped > 0;
};

/**
 * The tab named by the address; anything but `versions` is the publish tab.
 * @param {string | null} raw
 * @returns {Tab}
 */
export const tabOf = (raw) => (raw === 'versions' ? 'versions' : 'publish');
