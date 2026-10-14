/** @import { CallOffType } from '@services/data/types' */
/** @import { Panel } from '../utils' */
/** @import { useCallOffSections } from './useCallOffSections' */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Material E2 (MR-7 step 6) — "Create call-off" from the stock simulation
 * lands here with `?newFor=<supplier>&material=<code>` and opens the new
 * call-off form on that supplier's agreement line for the material (the one
 * with the most left to release). It creates nothing: the planner still saves
 * the draft or releases. Consumed once, so closing the form does not reopen it.
 * Returns the supplier and material when no line matched, for the page's notice.
 * Called by the page component, so that state is owned by the page.
 * @param {object} args
 * @param {ReturnType<typeof useCallOffSections>['sections']} args.sections
 * @param {boolean} args.posPending  The umbrella POs query is pending.
 * @param {boolean} args.isPending  The call-off views are pending.
 * @param {(f: { quantity: string; needDate: string; type: CallOffType; reason: string; comment: string }) => void} args.setForm
 * @param {(p: Panel) => void} args.setPanel
 */
export const usePrefillFromSimulation = ({
  sections,
  posPending,
  isPending,
  setForm,
  setPanel
}) => {
  const [prefillParams, setPrefillParams] = useSearchParams();
  const prefillSupplier = prefillParams.get('newFor');
  const prefillMaterial = prefillParams.get('material');
  const [prefillMissing, setPrefillMissing] = useState(
    /** @type {{ supplier: string; material: string } | null} */ (null)
  );
  useEffect(() => {
    if (!prefillSupplier || !prefillMaterial || posPending || isPending) return;
    const lines = sections
      .filter((s) => s.po.supplierId === prefillSupplier && s.line.materialCode === prefillMaterial)
      .sort((a, b) => (b.remaining.remainingQty ?? 0) - (a.remaining.remainingQty ?? 0));
    const first = lines[0];
    if (first) {
      setForm({ quantity: '', needDate: '', type: 'forecast', reason: '', comment: '' });
      setPanel({ kind: 'new', poId: first.po.id, lineId: first.line.id });
      setPrefillMissing(null);
    } else {
      setPrefillMissing({ supplier: prefillSupplier, material: prefillMaterial });
    }
    const next = new URLSearchParams(prefillParams);
    next.delete('newFor');
    next.delete('material');
    setPrefillParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSupplier, prefillMaterial, sections, posPending, isPending]);
  return prefillMissing;
};
