/** @import React from 'react' */
/** @import { SeriesRow } from '../utils' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { inputClass } from '../../callOffs/callOffDisplay';

/**
 * The previewed series: one editable row (quantity, need date) per call-off
 * the series will draft. Renders nothing before a preview. The rows are page
 * state (`seriesRows`), so they survive the panel re-rendering. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ seriesRows: SeriesRow[]; setSeriesRows: (rows: SeriesRow[]) => void }>}
 */
const SeriesPreview = ({ seriesRows, setSeriesRows }) => {
  const { t } = useTranslation();
  if (!(seriesRows.length > 0)) return null;
  return (
    <table className="w-full text-xs" data-testid="calloff-series-preview">
      <thead>
        <tr className="text-text-tertiary uppercase">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">{t('co.col.quantity')}</th>
          <th className="text-left py-1">{t('co.col.needDate')}</th>
        </tr>
      </thead>
      <tbody>
        {seriesRows.map((row, i) => (
          <tr key={row.id} className="border-t border-border-subtle">
            <td className="py-1.5 pr-2">
              <Data>{i + 1}</Data>
            </td>
            <td className="py-1.5 pr-2">
              <input
                aria-label={t('co.series.rowQty', { n: i + 1 })}
                className={inputClass}
                value={row.quantity}
                onChange={(e) =>
                  setSeriesRows(
                    seriesRows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r))
                  )
                }
              />
            </td>
            <td className="py-1.5">
              <input
                type="date"
                aria-label={t('co.series.rowDate', { n: i + 1 })}
                className={inputClass}
                value={row.date}
                onChange={(e) =>
                  setSeriesRows(
                    seriesRows.map((r, j) => (j === i ? { ...r, date: e.target.value } : r))
                  )
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SeriesPreview;
