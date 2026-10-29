/** @import { CallOffForm, Panel, UmbrellaLine } from '../utils' */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Material E2 (MR-7 step 6) — "Create call-off" from the stock simulation
 * lands here with `?newFor=<supplier>&material=<code>` and opens the new
 * call-off form on that supplier's agreement line for the material (the one
 * with the most left to release). It creates nothing: the planner still saves
 * the draft or releases. Consumed once, so closing the form does not reopen it.
 * Returns the supplier and material a link named when no line matched, for the
 * page's notice; that state lives in the calling page. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @param {UmbrellaLine[]} allSections Every umbrella line, unfiltered.
 * @param {boolean} posPending The PO read is still loading.
 * @param {boolean} isPending The call-off read is still loading.
 * @param {(f: CallOffForm) => void} setForm
 * @param {(p: Panel) => void} setPanel
 */
export function usePrefillFromSimulation(allSections, posPending, isPending, setForm, setPanel) {
  const [prefillParams, setPrefillParams] = useSearchParams();
  const prefillSupplier = prefillParams.get('newFor');
  const prefillMaterial = prefillParams.get('material');
  const [prefillMissing, setPrefillMissing] = useState(
    /** @type {{ supplier: string; material: string } | null} */ (null)
  );
  useEffect(() => {
    if (!prefillSupplier || !prefillMaterial || posPending || isPending) return;
    const lines = allSections
      .filter((s) => s.po.supplierId === prefillSupplier && s.line.materialCode === prefillMaterial)
      .sort((a, b) => (b.remaining.remainingQty ?? 0) - (a.remaining.remainingQty ?? 0));
    const first = lines[0];
    if (first) {
      setForm({ quantity: '', needDate: '', type: 'forecast', reason: '', comment: '' });
      setPanel({ kind: 'new', poId: first.po.id, lineId: first.line.id });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the simulation deep link once its data has loaded
      setPrefillMissing(null);
    } else {
      setPrefillMissing({ supplier: prefillSupplier, material: prefillMaterial });
    }
    const next = new URLSearchParams(prefillParams);
    next.delete('newFor');
    next.delete('material');
    setPrefillParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSupplier, prefillMaterial, allSections, posPending, isPending]);
  return prefillMissing;
}
