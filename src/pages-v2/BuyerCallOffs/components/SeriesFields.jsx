/** @import React from 'react' */
/** @import { ReleaseCadence } from '@services/delivery/types' */
/** @import { SeriesForm, SeriesRow } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { CALL_OFF_CADENCES } from '@services/transitions/callOffRules';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';
import SeriesPreview from './SeriesPreview';

/**
 * @typedef {object} SeriesFieldsProps
 * @property {SeriesForm} series The series form (page state).
 * @property {(s: SeriesForm) => void} setSeries
 * @property {SeriesRow[]} seriesRows The previewed rows (page state).
 * @property {(rows: SeriesRow[]) => void} setSeriesRows
 * @property {string} today The earliest first need date (`min`).
 * @property {() => void} previewSeries Generates the rows from the form.
 */

/**
 * REQ-E09-01 — the series form of the new call-off panel: total, quantity per
 * call-off, cadence and first need date, the Preview button, and the editable
 * preview. Renders a fragment, so its elements sit in the panel as before.
 * Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<SeriesFieldsProps>}
 */
const SeriesFields = ({ series, setSeries, seriesRows, setSeriesRows, today, previewSeries }) => {
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
      <SeriesPreview seriesRows={seriesRows} setSeriesRows={setSeriesRows} />
    </>
  );
};

export default SeriesFields;
