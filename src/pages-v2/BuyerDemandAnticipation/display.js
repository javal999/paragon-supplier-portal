// ─────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) — what the Demand anticipation page derives from the read for
// display: the planning week, whether it is published and how many figures
// changed since, the publication in force, the pairs with a remainder a
// supplier could agree to take outside the horizon, and the "would be" text.
// No figure is computed here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, isoWeek } from '@services/engine/dates';
import { formatDate, formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from '@services/transitions/demandAnticipationRules' */

/** `W42` for a week's Monday. @param {string} week */
export const weekLabel = (week) => `W${isoWeek(week)}`;

/**
 * `W42–W45` for a run of Mondays.
 * @param {readonly string[]} weeks
 * @returns {string}
 */
export const weekRange = (weeks) =>
  weeks.length === 0
    ? ''
    : weeks.length === 1
      ? weekLabel(weeks[0])
      : `${weekLabel(weeks[0])}–${weekLabel(weeks[weeks.length - 1])}`;

/**
 * `12 Oct 2026 – 08 Nov 2026`: the first Monday to the last week's Sunday.
 * @param {readonly string[]} weeks
 * @returns {string}
 */
export const weekDates = (weeks) =>
  weeks.length === 0
    ? ''
    : `${formatDate(weeks[0])} – ${formatDate(addDays(weeks[weeks.length - 1], 6))}`;

/**
 * DRC-2 — the planning week (the current hub week, as the read names it on
 * every row), whether a publication records it for every pair, and how many
 * pairs' figures today differ from the published ones (or are unpublished).
 * @param {readonly DemandAnticipationRow[]} rows
 * @param {string} nowIso
 * @returns {{ planningWeek: string; published: boolean; changed: number }}
 */
export function publishPreview(rows, nowIso) {
  const planningWeek = rows[0]?.planningWeek ?? nowIso.slice(0, 10);
  return {
    planningWeek,
    published: rows.length > 0 && rows.every((r) => r.planSource === 'published'),
    changed: rows.filter((r) => r.changed).length
  };
}

/**
 * The publication in force for the planning week, or null.
 * @param {readonly DemandAnticipationRow[]} rows
 * @returns {DemandAnticipationWeekView['publishedBy']}
 */
export function latestPublication(rows) {
  return rows.find((r) => r.publishedBy !== null)?.publishedBy ?? null;
}

/**
 * [Owner A8] — the pairs whose remainder a supplier could agree to take in the
 * first week outside the horizon: a remainder above 0 today and a week to put
 * it in.
 * @param {readonly DemandAnticipationRow[]} rows
 * @returns {DemandAnticipationRow[]}
 */
export const agreementCandidates = (rows) =>
  rows.filter((r) => r.today.remainder > 0 && r.today.firstOutsideWeek !== null);

/**
 * `+2,800` / `−1,000` / null for no change.
 * @param {number} delta
 * @returns {string | null}
 */
export const signedDelta = (delta) =>
  delta === 0 ? null : `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}`;

/** `70%` for a share of 0 to 1. @param {number} share */
export const sharePct = (share) => `${formatNumber(Math.round(share * 1000) / 10)}%`;
