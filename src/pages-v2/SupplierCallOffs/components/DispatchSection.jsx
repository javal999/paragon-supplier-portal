/** @import React from 'react' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { useCallOffViews } from '../../callOffs/callOffDisplay' */
/** @import { useAsnWizardAvailability } from '../../shipments/asnWizardEntry' */
/** @import { useCallOffResponse } from '../hooks/useCallOffResponse' */
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
 * @property {typeof EMPTY} form  The page's response-and-dispatch form.
 * @property {(f: typeof EMPTY) => void} setForm  Its setter.
 * @property {boolean} busy  A call-off command is in flight.
 * @property {ReturnType<typeof useVerbAvailability>} dispatchAvailability  Whether this user holds `calloff:dispatch`.
 * @property {ReturnType<typeof useAsnWizardAvailability>} asnWizard  Whether the Create-ASN wizard is open to this user (IA-S04).
 * @property {ReturnType<typeof useCallOffViews>['asns']} asns  The supplier's ASNs, offered as the dispatch's ASN.
 * @property {ReturnType<typeof useCallOffResponse>['run']} run  Sends one command and toasts its outcome.
 */

/**
 * The panel's dispatch section for a confirmed and accepted call-off
 * (REQ-E09-04): the heads-ups sent so far, the link to the Create-ASN wizard,
 * and the dispatch-notice form (or the hand-off notices when the user does
 * not hold the verbs). Moved out of `SupplierCallOffs.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<DispatchSectionProps>}
 */
const DispatchSection = ({
  selected,
  form,
  setForm,
  busy,
  dispatchAvailability,
  asnWizard,
  asns,
  run
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="supplier-calloff-dispatch">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.dispatch.title')}</h3>
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
      <p className="text-xs text-text-tertiary">{t('co.dispatch.asnCounts')}</p>
      {/* IA-S04 — the wizard opens on this call-off's PO with the
          call-off chosen (REQ-E09-03 BR-06, SCENARIOS UC3 step 4). */}
      {asnWizard.held ? (
        <Link
          to={createAsnHref({
            poId: selected.callOff.poId,
            callOffId: selected.callOff.id
          })}
          data-testid="calloff-create-asn"
          className="inline-flex items-center gap-1.5 text-sm text-action-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
        >
          <Truck size={14} aria-hidden="true" />
          {t('co.dispatch.createAsn')}
        </Link>
      ) : (
        <HandoffNotice availability={asnWizard.notice} testId="handoff-asn-create" />
      )}
      {dispatchAvailability.kind === 'held' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="co-dispatch-shipped" className={labelClass}>
                {t('co.dispatch.shippedDate')}
              </label>
              <input
                id="co-dispatch-shipped"
                type="date"
                className={inputClass}
                value={form.shippedDate}
                onChange={(e) => setForm({ ...form, shippedDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="co-dispatch-arrival" className={labelClass}>
                {t('co.dispatch.expectedArrival')}
              </label>
              <input
                id="co-dispatch-arrival"
                type="date"
                className={inputClass}
                value={form.expectedArrival}
                onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="co-dispatch-qty" className={labelClass}>
                {t('co.field.quantity', { uom: selected.callOff.uom })}
              </label>
              <input
                id="co-dispatch-qty"
                inputMode="numeric"
                className={inputClass}
                value={form.dispatchQty}
                onChange={(e) => setForm({ ...form, dispatchQty: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="co-dispatch-asn" className={labelClass}>
                {t('co.dispatch.asn')}
              </label>
              <select
                id="co-dispatch-asn"
                className={inputClass}
                value={form.asnNumber}
                onChange={(e) => setForm({ ...form, asnNumber: e.target.value })}
              >
                <option value="">{t('co.dispatch.noAsn')}</option>
                {asns
                  .filter(
                    (a) => a.poReference === selected.callOff.poNumber && a.status !== 'Cancelled'
                  )
                  .map((a) => (
                    <option key={a.asnNumber} value={a.asnNumber}>
                      {a.asnNumber}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {form.expectedArrival !== '' && form.expectedArrival > selected.dueDate && (
            <p role="alert" className="text-xs text-warning-hover">
              {t('co.dispatch.lateWarning')}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={
                busy ||
                form.shippedDate === '' ||
                form.expectedArrival === '' ||
                !(numberOf(form.dispatchQty) > 0)
              }
              onClick={() =>
                void run(
                  {
                    verb: 'dispatch',
                    id: selected.callOff.id,
                    shippedDate: form.shippedDate,
                    expectedArrival: form.expectedArrival,
                    quantity: numberOf(form.dispatchQty),
                    ...(form.asnNumber ? { asnNumber: form.asnNumber } : {})
                  },
                  t('co.toast.dispatched', { number: selected.callOff.callOffNumber })
                )
              }
            >
              {t('co.dispatch.send')}
            </Button>
          </div>
        </>
      ) : (
        <HandoffNotice availability={dispatchAvailability} testId="handoff-calloff-dispatch" />
      )}
    </section>
  );
};

export default DispatchSection;
