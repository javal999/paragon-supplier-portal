/** @import { CallOffType } from '@services/data/types' */
/** @import { ReleaseCadence } from '@services/delivery/types' */
/** @import { Panel, SeriesRow } from '../utils' */
import { useState } from 'react';

/**
 * The page's panel state: which side panel is open, the call-off form, the
 * series form, and the previewed series rows (the preview counter, a ref,
 * stays in the page). Called by the page component, so the state is owned by the page
 * and survives its loading / error early returns and both panels closing.
 */
export const useCallOffPanelState = () => {
  const [panel, setPanel] = useState(/** @type {Panel} */ (null));
  const [form, setForm] = useState({
    quantity: '',
    needDate: '',
    type: /** @type {CallOffType} */ ('forecast'),
    reason: '',
    comment: ''
  });
  const [series, setSeries] = useState({
    total: '',
    perCallOff: '',
    cadence: /** @type {ReleaseCadence} */ ('weekly'),
    firstDate: ''
  });
  const [seriesRows, setSeriesRows] = useState(/** @type {SeriesRow[]} */ ([]));
  return {
    panel,
    setPanel,
    form,
    setForm,
    series,
    setSeries,
    seriesRows,
    setSeriesRows
  };
};
