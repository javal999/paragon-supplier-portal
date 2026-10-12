import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useSuppliers } from '@services/query/hooks';
import { materialEntry } from '@services/sdc/materialMaster';
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { NewPRForm } from '../const' */
import { emptyForm } from '../const';

/**
 * @typedef {object} RequisitionDeepLinkArgs
 * @property {PurchaseRequisition[]} prs The loaded requisitions (`?open=` looks the id up here).
 * @property {VerbAvailability} createAvailability Only a seat holding `pr:create` gets the pre-filled form.
 * @property {(pr: PurchaseRequisition) => void} setSelectedRow Opens a requisition's detail panel.
 * @property {(form: NewPRForm) => void} setForm
 * @property {(open: boolean) => void} setNewOpen
 */

/**
 * The page's two URL entrances, each consumed once and then removed from the
 * URL: `?open=<id>` opens that requisition's panel, and
 * `?new=1&material=<code>&supplier=<id>` (Material E2, from the stock
 * simulation) opens the New-PR form pre-filled. Moved out of
 * `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change: the
 * same two effects, in the same order).
 * @param {RequisitionDeepLinkArgs} args
 * @returns {void}
 */
const useRequisitionDeepLinks = ({
  prs,
  createAvailability,
  setSelectedRow,
  setForm,
  setNewOpen
}) => {
  const { t } = useTranslation();

  // `?open=<id>` lands on one requisition's panel — the RFQ event page's
  // "Created from PR-…" link points here. Consumed once, so closing the panel
  // does not re-open it.
  const [openParams, setOpenParams] = useSearchParams();
  const openParam = openParams.get('open');
  useEffect(() => {
    if (!openParam) return;
    const pr = prs.find((p) => p.id === openParam);
    if (!pr) return;
    setSelectedRow(pr);
    const next = new URLSearchParams(openParams);
    next.delete('open');
    setOpenParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, prs]);

  // Material E2 (MR-7 step 6) — "Create PO request" from the stock simulation
  // lands here with `?new=1&material=<code>&supplier=<id>` and opens the New PR
  // form pre-filled with the material, its unit and a note naming the supplier
  // (a requisition carries no supplier field). It creates nothing by itself,
  // and only a seat holding `pr:create` gets the form. Consumed once.
  const prefillNew = openParams.get('new');
  const suppliersQuery = useSuppliers();
  useEffect(() => {
    if (prefillNew !== '1' || suppliersQuery.isPending) return;
    const material = openParams.get('material') ?? '';
    const supplier = openParams.get('supplier') ?? '';
    if (createAvailability.kind === 'held' && material) {
      setForm({
        ...emptyForm,
        material,
        uom: materialEntry(material)?.canonicalUom ?? emptyForm.uom,
        justification: t('requisitions.new.prefill.fromSimulation', {
          material,
          supplier: suppliersQuery.data?.items.find((x) => x.id === supplier)?.name ?? supplier
        })
      });
      setNewOpen(true);
    }
    const next = new URLSearchParams(openParams);
    for (const k of ['new', 'material', 'supplier']) next.delete(k);
    setOpenParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillNew, suppliersQuery.isPending]);
};

export default useRequisitionDeepLinks;
