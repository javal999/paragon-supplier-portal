// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 — what the Demand anticipation page derives from the read for display:
// the hub-week range a publish would freeze, how many figures it would freeze,
// the publication in force, and the "would be" text. No figure is computed
// here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, isoWeek } from '@services/engine/dates';
import { formatDate, formatNumber } from '@lib/format';
import { nextHorizon } from '@services/transitions/demandAnticipationRules';
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
 * BR-01 / AC-02 — the horizon a publication made now would freeze (the verb's
 * own `nextHorizon` over the frozen weeks the read shows; null when the next
 * horizon is frozen too), and how many supplier × material × weeks of it are
 * not frozen yet: what it would add.
 * @param {readonly DemandAnticipationRow[]} rows
 * @param {string} nowIso
 * @returns {{ horizon: string[] | null; toFreeze: number }}
 */
export function publishPreview(rows, nowIso) {
  const horizon = nextHorizon(frozenWeeks(rows), nowIso);
  if (horizon === null) return { horizon, toFreeze: 0 };
  const toFreeze = rows.reduce(
    (n, r) =>
      n + r.weeks.filter((w) => horizon.includes(w.week) && !w.frozen && w.wouldBe !== null).length,
    0
  );
  return { horizon, toFreeze };
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
