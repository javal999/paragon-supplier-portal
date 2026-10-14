// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 — what the Demand anticipation page derives from the read for display:
// the hub-week range a publish would freeze, how many figures it would freeze,
// the publication in force, and the "would be" text. No figure is computed
// here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, isoWeek } from '@services/engine/dates';
import { formatDate, formatNumber } from '@lib/format';
import { currentHorizon, horizonContaining } from '@services/transitions/demandAnticipationRules';
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
 * The shown weeks frozen for at least one row, in order.
 * @param {readonly DemandAnticipationRow[]} rows
 * @returns {string[]}
 */
export const frozenWeeks = (rows) =>
  [...new Set(rows.flatMap((r) => r.weeks.filter((w) => w.frozen).map((w) => w.week)))].sort();

/**
 * CAP-D17 — the fixed horizon holding the current hub week (named by the read
 * on every week: `horizonStart`, `horizonFrozen`), the one after it, whether
 * the current one is frozen, and how many supplier × material × weeks a
 * publish would freeze in it. With no row to read, nothing is published, so
 * the horizon is the 4 weeks from the current week.
 * @param {readonly DemandAnticipationRow[]} rows
 * @param {string} nowIso
 * @returns {{ horizon: string[]; next: string[]; frozen: boolean; toFreeze: number }}
 */
export function publishPreview(rows, nowIso) {
  const first = rows[0]?.weeks[0];
  if (!first) {
    const h = currentHorizon([], nowIso);
    return { horizon: h.weeks, next: h.next, frozen: false, toFreeze: 0 };
  }
  const horizon = horizonContaining(first.horizonStart, first.horizonStart);
  const next = horizonContaining(first.horizonStart, addDays(horizon[0], horizon.length * 7));
  const frozen = first.horizonFrozen;
  const toFreeze = frozen
    ? 0
    : rows.reduce(
        (n, r) =>
          n +
          r.weeks.filter((w) => horizon.includes(w.week) && !w.frozen && w.wouldBe !== null).length,
        0
      );
  return { horizon, next, frozen, toFreeze };
}

/**
 * The newest publication any shown week is frozen by, or null. The demo hub
 * clock does not move by itself, so two publications can share `publishedAt`;
 * the store's ids rise with every append and break the tie.
 * @param {readonly DemandAnticipationRow[]} rows
 * @returns {NonNullable<DemandAnticipationWeekView['frozenBy']> | null}
 */
export function latestPublication(rows) {
  /** @type {NonNullable<DemandAnticipationWeekView['frozenBy']> | null} */
  let latest = null;
  for (const r of rows)
    for (const w of r.weeks) {
      const p = w.frozenBy;
      if (
        p &&
        (latest === null ||
          p.publishedAt > latest.publishedAt ||
          (p.publishedAt === latest.publishedAt && p.publicationId > latest.publicationId))
      )
        latest = p;
    }
  return latest;
}

/**
 * `+2,800` / `−1,000` / null for no change.
 * @param {number} delta
 * @returns {string | null}
 */
export const signedDelta = (delta) =>
  delta === 0 ? null : `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}`;

/** `70%` for a share of 0 to 1. @param {number} share */
export const sharePct = (share) => `${formatNumber(Math.round(share * 1000) / 10)}%`;
