/** @import React from 'react' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { useAsnWizardAvailability } from '../../shipments/asnWizardEntry' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatDate } from '@lib/format';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { inputClass, labelClass, numberOf, qty } from '../../callOffs/callOffDisplay';
import { createAsnHref } from '../../shipments/asnWizardEntry';
/** @import { EMPTY } from '../const' */

/**
 * @typedef {object} DispatchSectionProps
 * @property {CallOffView} selected  The call-off open in the panel (confirmed and accepted).
 * @property {typeof EMPTY} form  The page's response-and-mark form, prefilled from the call-off.
 * @property {(f: typeof EMPTY) => void} setForm  Its setter.
 * @property {boolean} busy  A verb this section fires is in flight.
 * @property {ReturnType<typeof useVerbAvailability>} dispatchAvailability  Whether this user holds `calloff:dispatch`.
 * @property {ReturnType<typeof useAsnWizardAvailability>} asnWizard  Whether this user holds both ASN atoms (IA-S04).
 * @property {string | null} draftAsn  UCX-P3 — the open draft ASN this call-off's mark step created, if any.
 * @property {(v: CallOffView, form: typeof EMPTY) => Promise<void>} markShipped  UCX-P3 — send the notice and open the draft.
 */

/**
 * UCX-P3 (BL-364) — the ONE shipment step for a confirmed and accepted
 * call-off. It replaces the dispatch-notice form and the "Create the ASN for
 * this call-off" link with one act named "Mark as shipped" (UCX-D28): the
 * notice PTI reads and the draft ASN the warehouse completes are the same
 * report, sent once (UCX-F10; goal UCX-SG7).
 *
 *   · the values start from the call-off (its need date and agreed quantity),
 *     all editable — never the PO's open quantity (UCX-F9);
 *   · while a draft for this call-off is open, the step shows its step 2
 *     ("Complete the delivery details") instead of offering a second mark;
 *   · a seat missing either verb reads the wait instead (one notice per verb).
 * @type {React.FC<DispatchSectionProps>}
 */
const DispatchSection = ({
  selected,
  form,
  setForm,
  busy,
  dispatchAvailability,
  asnWizard,
  draftAsn,
  markShipped
}) => {
  const { t } = useTranslation();
  // One step, two verbs: dispatch + create. A seat short of either reads the
  // notice for the atom it must gain first (the wizard's own precedent).
  const held = dispatchAvailability.kind === 'held' && asnWizard.held;
  const availability =
    dispatchAvailability.kind === 'held' ? asnWizard.notice : dispatchAvailability;
  return (
    <section className="space-y-3" data-testid="supplier-calloff-dispatch">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.markShipped.title')}</h3>
      {selected.headsUps.length > 0 && (
        <ul className="text-sm space-y-1">
          {selected.headsUps.map((h) => (
            <li key={h.ref}>
              <Data>{`${qty(h.quantity)} ${selected.callOff.uom}`}</Data> ·{' '}
              {t('co.headsUp.line', {
                shipped: formatDate(h.shippedDate),
                arrival: formatDate(h.expectedArrival)
              })}
              {h.source === 'asn' && (
                <>
                  {' '}
                  · <Data>{h.ref}</Data>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {draftAsn !== null ? (
        // The mark landed: PTI has the heads-up and the draft waits for step 2.
        <div className="space-y-2" data-testid="supplier-calloff-draft">
          <p className="text-sm text-success" role="status">
            {t('co.markShipped.sent', { number: selected.callOff.callOffNumber })}
          </p>
          <div className="border border-dashed border-border-input rounded-md px-3 py-2 space-y-2">
            <p className="text-sm text-text-secondary">
              {t('co.markShipped.draftWaiting', { asn: draftAsn })}
            </p>
            <Link
              to={createAsnHref({
                poId: selected.callOff.poId,
                callOffId: selected.callOff.id,
                draft: draftAsn
              })}
              data-testid="calloff-complete-details"
              className="inline-flex items-center gap-1.5 text-sm text-action-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
            >
              <Truck size={14} aria-hidden="true" />
              {t('co.markShipped.complete')}
            </Link>
          </div>
        </div>
      ) : held ? (
        <>
          <p className="text-xs text-text-tertiary">{t('co.markShipped.intro')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-mark-shipped-date" className={labelClass}>
                {t('co.markShipped.shippedDate')}
              </label>
              <input
                id="co-mark-shipped-date"
                type="date"
                className={inputClass}
                value={form.shippedDate}
                onChange={(e) => setForm({ ...form, shippedDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-text-tertiary">{t('co.markShipped.today')}</p>
            </div>
            <div>
              <label htmlFor="co-mark-arrival" className={labelClass}>
                {t('co.markShipped.expectedArrival')}
              </label>
              <input
                id="co-mark-arrival"
                type="date"
                className={inputClass}
                value={form.expectedArrival}
                onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                {t('co.markShipped.arrivalFromCallOff')}
              </p>
            </div>
            <div>
              <label htmlFor="co-mark-qty" className={labelClass}>
                {t('co.markShipped.quantity', { uom: selected.callOff.uom })}
              </label>
              <input
                id="co-mark-qty"
                inputMode="decimal"
                className={inputClass}
                value={form.dispatchQty}
                onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                {t('co.markShipped.quantityFromCallOff')}
              </p>
            </div>
          </div>
          {form.expectedArrival !== '' && form.expectedArrival > selected.dueDate && (
            <p role="alert" className="text-xs text-warning-hover">
              {t('co.markShipped.lateWarning')}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              data-testid="calloff-mark-shipped"
              disabled={
                busy ||
                form.shippedDate === '' ||
                form.expectedArrival === '' ||
                !(numberOf(form.dispatchQty) > 0)
              }
              onClick={() => void markShipped(selected, form)}
            >
              {t('co.markShipped.action')}
            </Button>
          </div>
        </>
      ) : (
        <HandoffNotice availability={availability} testId="handoff-calloff-mark-shipped" />
      )}
    </section>
  );
};

export default DispatchSection;
