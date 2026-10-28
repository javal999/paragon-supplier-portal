/** @import { TFunction } from 'i18next' */
import Data from '@components/ui-v2/Data';
import { formatDate, formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
/** @import { LtpFgWeekFields } from '@services/transitions/ltpFgDemandRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { LTP_FG_DEMAND_RULES } from '@services/transitions/ltpFgDemandRules';
import { sharePct } from '../display';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-18 (BL-203) — three read-only rows on the Demand anticipation grid:
//   · FG demand: the supplier's share of the material's finished-goods demand
//     (the engine's gross requirement through the BOM);
//   · LTP − FG demand;
//   · Consumption, 13-week average [Default A11]: with fewer weeks recorded,
//     the label says how many it averages.
// Kept in their own module so the BL-188 rework of the grid keeps them with
// one line. Every number is the read's (`withLtpFgDemand`); none is computed
// here. A week the read carries no DRC-18 fields for reads "—".
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {DemandAnticipationRow} row
 * @param {string} rowKey
 * @param {TFunction} t
 * @returns {WeekGridRow[]}
 */
export function ltpFgDemandRows(row, rowKey, t) {
  /**
   * The DRC-18 fields of one week, when the read carries them.
   * @param {string} week
   * @returns {Partial<LtpFgWeekFields>}
   */
  const fieldsOf = (week) =>
    /** @type {Partial<LtpFgWeekFields>} */ (row.weeks.find((w) => w.week === week) ?? {});
  const available = /** @type {{ fgDemandAvailable?: boolean }} */ (row).fgDemandAvailable;
  const weeksN = LTP_FG_DEMAND_RULES.consumptionAverageWeeks;
  // Every shown week from the current one averages the same window (it ends
  // at the current hub week), so the label's note reads the first week's basis.
  const basis = row.weeks[0] ? fieldsOf(row.weeks[0].week).consumptionAverageBasis : undefined;
  const note =
    basis === undefined ? null : basis.weeksWithRecords === 0 ? (
      <span data-testid={`dant-cavg-note-${rowKey}`}>
        {t('ltpFg.noRecords', { weeks: weeksN })}
      </span>
    ) : basis.partial ? (
      <span data-testid={`dant-cavg-note-${rowKey}`}>
        {t('ltpFg.partial', { count: basis.weeksWithRecords, weeks: weeksN })}
      </span>
    ) : null;

  return [
    {
      id: 'fgDemand',
      label:
        available === false ? (
          <span>
            {t('ltpFg.row.fgDemand')}
            <span
              className="block text-xs text-text-tertiary"
              data-testid={`dant-fg-unavailable-${rowKey}`}
            >
              {t('ltpFg.notAvailable')}
            </span>
          </span>
        ) : (
          t('ltpFg.row.fgDemand')
        ),
      unit: row.uom,
      combine: 'sum',
      value: (week) => fieldsOf(week).fgDemand ?? 0,
      cell: (week) => {
        const f = fieldsOf(week);
        if (f.fgDemand === undefined || f.fgDemand === null) return dash;
        return (
          <Data
            data-testid={`dant-fg-${rowKey}-${week}`}
            title={t('ltpFg.fgTitle', {
              material: formatNumber(f.fgDemandMaterial ?? 0),
              share: row.share === null ? '—' : sharePct(row.share)
            })}
          >
            {formatNumber(f.fgDemand)}
          </Data>
        );
      }
    },
    {
      id: 'ltpLessFg',
      label: t('ltpFg.row.ltpLessFg'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => fieldsOf(week).ltpLessFgDemand ?? 0,
      cell: (week) => {
        const v = fieldsOf(week).ltpLessFgDemand;
        if (v === undefined || v === null) return dash;
        return (
          <Data className="text-text-secondary" data-testid={`dant-ltpfg-${rowKey}-${week}`}>
            {formatNumber(v)}
          </Data>
        );
      }
    },
    {
      id: 'consumptionAverage',
      label: (
        <span>
          {t('ltpFg.row.consumptionAverage', { weeks: weeksN })}
          {/* A11's 13 weeks are confirmed [Team, 2026-10-28]: no Provisional label. */}
          {note ? <span className="block text-xs text-text-tertiary">{note}</span> : null}
        </span>
      ),
      unit: row.uom,
      cell: (week) => {
        const f = fieldsOf(week);
        const b = f.consumptionAverageBasis;
        if (f.consumptionAverage === undefined || f.consumptionAverage === null || !b) return dash;
        return (
          <Data
            data-testid={`dant-cavg-${rowKey}-${week}`}
            title={t('ltpFg.averageTitle', {
              material: formatNumber(Math.round(b.average ?? 0)),
              count: b.weeksWithRecords,
              end: formatDate(b.windowEnd),
              share: row.share === null ? '—' : sharePct(row.share)
            })}
          >
            {formatNumber(f.consumptionAverage)}
          </Data>
        );
      }
    }
  ];
}
