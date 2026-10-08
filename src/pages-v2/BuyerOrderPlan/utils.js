// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers for the "What to order" page (REQ-E14-05). No React.
// ─────────────────────────────────────────────────────────────────────────────

import { formatNumber } from '@lib/format';
/** @import { MaterialOrderPlanView } from '@services/data/types' */
/** @import { Recommendation } from '@services/engine/orderSizing' */
import { isoWeek } from '@services/engine/dates';

/**
 * One recommended order with the material it belongs to — a row of the
 * "Recommended orders" table.
 * @typedef {{
 *     readonly rec: Recommendation;
 *     readonly material: MaterialOrderPlanView;
 *   }} RecRow
 */

/**
 * The page's week label, `W<iso week>` (BuyerThisWeek's "Release in" column
 * reads the same shape).
 * @param {string} w
 */
export const weekLabel = (w) => `W${isoWeek(w)}`;

/**
 * A fill ratio as a whole percent, or a dash when there is no figure.
 * @param {number | null} x
 */
export const pct = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 100))}%`);

/**
 * The key of one recommendation: what the page marks as drafted and which
 * "Why this quantity" panel is open.
 * @param {Recommendation} r
 */
export const keyOf = (r) => `${r.materialCode}|${r.weekStart}`;

/**
 * The DOM id of a recommendation's "Why this quantity" panel; its toggle is
 * `<id>-toggle`.
 * @param {Recommendation} r
 */
export const whyId = (r) => `op-wq-${r.materialCode}-${r.weekStart}`;
