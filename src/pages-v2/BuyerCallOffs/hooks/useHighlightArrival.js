/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { useRowHighlight } from '@hooks/useRowHighlight' */
/** @import { CallOffForm, Panel } from '../utils' */
import { useState } from 'react';

/**
 * IA-B13 — a link naming one call-off (`?highlight=`) opens its panel once, on
 * arrival, with the form filled from the call-off. Adjusted during render, not
 * in an effect (react-hooks/set-state-in-effect), the same way `useRowHighlight`
 * resets itself: the stale render is dropped. The "already opened" id is state
 * of the calling page. Moved out of `BuyerCallOffs.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @param {ReturnType<typeof useRowHighlight>} highlight
 * @param {readonly CallOffView[]} views
 * @param {(f: CallOffForm) => void} setForm
 * @param {(p: Panel) => void} setPanel
 */
export function useHighlightArrival(highlight, views, setForm, setPanel) {
  const [openedHighlight, setOpenedHighlight] = useState(/** @type {string | null} */ (null));
  const arriving =
    highlight.id !== null && highlight.id !== openedHighlight
      ? views.find((x) => x.callOff.id === highlight.id)
      : undefined;
  if (arriving) {
    setOpenedHighlight(arriving.callOff.id);
    setForm({
      quantity: String(arriving.callOff.quantity),
      needDate: arriving.callOff.needDate,
      type: arriving.callOff.type,
      reason: '',
      comment: ''
    });
    setPanel({ kind: 'callOff', id: arriving.callOff.id });
  }
}
