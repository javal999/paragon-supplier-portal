// ─────────────────────────────────────────────────────────────────────────────
// BuyerReschedule — pure display helpers (no React). Every number the page
// shows passes through one of these, so a week, a fill or a pallet count reads
// the same in the KPIs, the proposal table, the decision card and the chart.
// ─────────────────────────────────────────────────────────────────────────────

import { formatNumber } from '@lib/format';
/** @import { SapChangeMark } from '@services/data/types' */
import { isoWeek } from '@services/engine/dates';

/**
 * A week's short label, `W<iso week>`.
 * @param {string} w the week's start date
 * @returns {string}
 */
export const weekLabel = (w) => `W${isoWeek(w)}`;

/**
 * A fill ratio as a whole percent; `—` when there is none.
 * @param {number | null} x
 * @returns {string}
 */
export const pct = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 100))}%`);

/**
 * A share as a percent with one decimal; `—` when there is none.
 * @param {number | null} x
 * @returns {string}
 */
export const pctShare = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);

/**
 * Pallet-weeks, rounded to a whole number.
 * @param {number} x
 * @returns {string}
 */
export const pw = (x) => formatNumber(Math.round(x));

/**
 * Pallets, rounded to one decimal.
 * @param {number} x
 * @returns {string}
 */
export const pal = (x) => formatNumber(Math.round(x * 10) / 10);

/**
 * The latest "taken to SAP" mark for a line.
 * @param {readonly SapChangeMark[]} marks
 * @param {string} lineId
 */
export const markFor = (marks, lineId) => marks.find((m) => m.lineId === lineId) ?? null;
