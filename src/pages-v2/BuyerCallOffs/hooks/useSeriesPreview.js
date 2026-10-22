/** @import { SeriesForm, SeriesRow } from '../utils' */
import { useRef } from 'react';
import { generateCallOffSeries } from '@services/transitions/callOffRules';
import { numberOf } from '../../callOffs/callOffDisplay';

/**
 * REQ-E09-01 — the series form's Preview handler: generates the series rows
 * from the form and stores them in the page's `seriesRows`. A ref counts the
 * previews, so each preview's rows get fresh ids (`SeriesRow.id`) and its
 * inputs start fresh. The page calls it where it created that ref before.
 * Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @param {SeriesForm} series
 * @param {(rows: SeriesRow[]) => void} setSeriesRows
 */
export function useSeriesPreview(series, setSeriesRows) {
  // Counts previews, so each preview's rows get fresh ids (SeriesRow.id).
  const seriesPreview = useRef(0);

  const previewSeries = () => {
    seriesPreview.current += 1;
    setSeriesRows(
      generateCallOffSeries({
        totalQty: numberOf(series.total),
        qtyPerCallOff: numberOf(series.perCallOff),
        cadence: series.cadence,
        firstNeedDate: series.firstDate
      }).map((d, n) => ({
        id: `${seriesPreview.current}-${n}`,
        quantity: String(d.quantity),
        date: d.date
      }))
    );
  };
  return previewSeries;
}
