/** @import { TFunction } from 'i18next' */
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
/** @import { SupplyWeekFields } from '@services/transitions/supplyBelowDemandRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */

// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) — the two rows the Demand anticipation grid shows after
// "Would be": Open supply (released call-offs needed that week) and Gap
// (demand anticipation − open supply, where positive; warning tone above 0).
// Kept in their own module so the grid adds them with one line, and CAP-11's
// rows can sit beside them without touching these.
//
// Every number is the read's (`getDemandAnticipation`, CAP-12 fields); none is
// computed here. A week the read carries no CAP-12 fields for reads "—".
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {DemandAnticipationRow} row
 * @param {string} rowKey
 * @param {TFunction} t
 * @returns {WeekGridRow[]}
 */
export function supplyRows(row, rowKey, t) {
  /**
   * The CAP-12 fields of one week, when the read carries them.
   * @param {string} week
   * @returns {Partial<SupplyWeekFields>}
   */
  const supplyOf = (week) =>
    /** @type {Partial<SupplyWeekFields>} */ (row.weeks.find((w) => w.week === week) ?? {});
  return [
    {
      id: 'openSupply',
      label: t('supplyGap.row.openSupply'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => supplyOf(week).openSupply ?? 0,
      cell: (week) => {
        const v = supplyOf(week).openSupply;
        return v === undefined ? (
          dash
        ) : (
          <Data data-testid={`dant-supply-${rowKey}-${week}`}>{formatNumber(v)}</Data>
        );
      }
    },
    {
      id: 'gap',
      label: t('supplyGap.row.gap'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => supplyOf(week).gap ?? 0,
      cell: (week) => {
        const v = supplyOf(week).gap;
        if (v === undefined || v === null) return dash;
        return v > 0 ? (
          <Data
            className="font-semibold text-warning-hover"
            data-testid={`dant-gap-${rowKey}-${week}`}
            data-tone="warning"
          >
            {formatNumber(v)}
          </Data>
        ) : (
          <Data className="text-text-secondary" data-testid={`dant-gap-${rowKey}-${week}`}>
            {formatNumber(v)}
          </Data>
        );
      }
    }
  ];
}
