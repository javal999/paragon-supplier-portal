import Data from '@components/ui-v2/Data';
import { formatDate, formatNumber } from '@lib/format';
/** @import { TFunction } from 'i18next' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from '@services/transitions/demandAnticipationRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { sharePct } from './display';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) — the grid's "Recorded consumption" row, one module so the
// grid adds it with one entry (as CAP-12 adds "Open supply" and "Gap").
//
//   · Recorded consumption: the supplier's share of the material's recorded
//     consumption that week (CAP-D14: split by demand anticipation share); the
//     title names the material's figure, the share, the source and the date.
// CAP-11's "Absorbed" row (an earlier horizon's excess spread over weeks 5 to
// 8) is retired with BR-02/03: DRC-4 BR-02 absorbs a surplus in the last week
// of the rolling horizon, shown by the grid's own "Absorbed" row.
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
    }
  ];
}
