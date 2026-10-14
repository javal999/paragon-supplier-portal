/** @import React from 'react' */
/** @import { ReleaseCadence } from '@services/delivery/types' */
/** @import { SeriesRow } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { CALL_OFF_CADENCES } from '@services/transitions/callOffRules';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';

/**
 * @typedef {{ total: string; perCallOff: string; cadence: ReleaseCadence; firstDate: string }} SeriesForm
 */

/**
 * @typedef {object} SeriesFieldsProps
 * @property {SeriesForm} series  The series inputs; the state lives in the page.
 * @property {(s: SeriesForm) => void} setSeries
 * @property {SeriesRow[]} seriesRows  The previewed call-offs, editable before they are drafted.
 * @property {(rows: SeriesRow[]) => void} setSeriesRows
 * @property {() => void} previewSeries  Generates `seriesRows` from `series` (the page's handler).
 * @property {string} today  The hub clock's date, the earliest first need date.
 */

/**
 * REQ-E09-01 — the series form in the new-call-off panel: total, per call-off,
 * cadence and first date; the preview button; and the editable preview table.
 * @type {React.FC<SeriesFieldsProps>}
 */
const SeriesFields = ({ series, setSeries, seriesRows, setSeriesRows, previewSeries, today }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="co-series-total" className={labelClass}>
            {t('co.series.total')}
          </label>
          <input
            id="co-series-total"
            inputMode="numeric"
            className={inputClass}
            value={series.total}
            onChange={(e) => setSeries({ ...series, total: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="co-series-per" className={labelClass}>
            {t('co.series.perCallOff')}
          </label>
          <input
            id="co-series-per"
            inputMode="numeric"
            className={inputClass}
            value={series.perCallOff}
            onChange={(e) => setSeries({ ...series, perCallOff: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="co-series-cadence" className={labelClass}>
            {t('co.series.cadence')}
          </label>
          <select
            id="co-series-cadence"
            className={inputClass}
            value={series.cadence}
            onChange={(e) =>
              setSeries({
                ...series,
                cadence: /** @type {ReleaseCadence} */ (e.target.value)
              })
            }
          >
            {CALL_OFF_CADENCES.map((c) => (
              <option key={c} value={c}>
                {t(`co.cadence.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="co-series-first" className={labelClass}>
            {t('co.series.firstDate')}
          </label>
          <input
            id="co-series-first"
            type="date"
            min={today}
            className={inputClass}
            value={series.firstDate}
            onChange={(e) => setSeries({ ...series, firstDate: e.target.value })}
          />
        </div>
      </div>
      <Button variant="secondary" onClick={previewSeries}>
        {t('co.series.preview')}
      </Button>
      <p className="text-xs text-text-tertiary">{t('co.series.hint')}</p>
      {seriesRows.length > 0 && (
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
      )}
    </>
  );
};

export default SeriesFields;
