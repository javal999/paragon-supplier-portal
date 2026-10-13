import Data from '@components/ui-v2/Data';
import { formatDate, formatNumber } from '@lib/format';
/** @import { TFunction } from 'i18next' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from '@services/transitions/demandAnticipationRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { sharePct, weekRange } from './display';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — the grid's "Recorded consumption" and "Absorbed" rows,
// one module so the CAP-10 grid adds them with one entry (as CAP-12 adds
// "Open supply" and "Gap").
//
//   · Recorded consumption: the supplier's share of the material's recorded
//     consumption that week (CAP-D14: split by demand anticipation share); the
//     title names the material's figure, the share, the source and the date.
//   · Absorbed: "−n absorbed from the W36–W39 excess" on a week of the next
//     horizon that takes part of an earlier horizon's excess (BR-05). The
//     Demand anticipation row above already shows the figure in force.
// No figure is computed here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {DemandAnticipationRow} row
 * @param {string} rowKey
 * @param {(week: string) => DemandAnticipationWeekView} weekOf
 * @param {TFunction} t
 * @returns {WeekGridRow[]}
 */
export function consumptionRows(row, rowKey, weekOf, t) {
  return [
    {
      id: 'consumption',
      label: t('consumption.row.recorded'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).consumption ?? 0,
      cell: (week) => {
        const w = weekOf(week);
        const rec = w.consumptionRecord;
        if (w.consumption === null || rec === null) return dash;
        return (
          <Data
            data-testid={`dant-consumption-${rowKey}-${week}`}
            title={t('consumption.row.recordedTitle', {
              material: formatNumber(rec.materialQty),
              share: sharePct(rec.share),
              source: t(`consumption.source.${rec.source}`),
              date: formatDate(rec.recordedAt),
              id: rec.recordId
            })}
          >
            {formatNumber(w.consumption)}
          </Data>
        );
      }
    },
    {
      id: 'absorbed',
      label: t('consumption.row.absorbed'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).absorbed?.qty ?? 0,
      cell: (week) => {
        const a = weekOf(week).absorbed;
        if (a === null) return dash;
        return (
          <span
            className="text-xs text-text-secondary"
            data-testid={`dant-absorbed-${rowKey}-${week}`}
            data-from={a.fromHorizonStart}
          >
            {t('consumption.row.absorbedCell', {
              qty: formatNumber(a.qty),
              range: weekRange(a.fromWeeks)
            })}
          </span>
        );
      }
    }
  ];
}
