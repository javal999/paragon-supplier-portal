/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ASN, PurchaseOrder } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { POStatus } from '@services/data/types';
import { isActiveAsn } from '@services/transitions/fulfilmentRules';
import { isIsoDate } from '@services/transitions/policies';
import {
  PoLifecycleSteps,
  PoResponseDetails,
  ShippingNoticeDetails
} from '../../orders/PoCollaboration';
import { inputClass, labelClass } from '../const';

/**
 * @typedef {object} DetailSectionsProps
 * @property {PurchaseOrder} selected  The PO open in the panel (its open-time snapshot).
 * @property {PurchaseOrder | null} selectedLive  The same PO read from the live query.
 * @property {VerbAvailability} shippingAvailability  The seat's answer for `po:shipping-notice`.
 * @property {string} completionDate  The expected completion date being edited (ISO).
 * @property {(v: string) => void} setCompletionDate
 * @property {() => void} saveCompletionDate
 * @property {{ isPending: boolean }} shippingMutation
 * @property {readonly ASN[]} asns  The supplier's ASNs, counted per PO for the lifecycle steps.
 * @property {TFunction} t
 */

/**
 * The order panel's `detail` mode sections: the supplier's recorded response,
 * the shipping notice with its completion-date control (Confirmed and
 * Partially Delivered POs only), and the PO lifecycle steps. Moved out of
 * `SupplierOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DetailSectionsProps>}
 */
const DetailSections = ({
  selected,
  selectedLive,
  shippingAvailability,
  completionDate,
  setCompletionDate,
  saveCompletionDate,
  shippingMutation,
  asns,
  t
}) => (
  <>
    {(selectedLive ?? selected).response && <PoResponseDetails po={selectedLive ?? selected} />}
    {/* `as POStatus[]`: POStatus is a const object now, not an enum (see BuyerOrders). */}
    {
      /** @type {POStatus[]} */ ([POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED]).includes(
        (selectedLive ?? selected).status
      ) && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-3">{t('oc.shipping.title')}</h3>
          <ShippingNoticeDetails po={selectedLive ?? selected} />
          {shippingAvailability.kind === 'held' ? (
            <div className="flex flex-wrap items-end gap-2 mt-3">
              <div>
                <label className={labelClass} htmlFor="po-completion-date">
                  {t('oc.shipping.dateLabel')}
                </label>
                <input
                  id="po-completion-date"
                  type="date"
                  className={inputClass}
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={saveCompletionDate}
                disabled={shippingMutation.isPending || !isIsoDate(completionDate)}
              >
                {t('oc.shipping.save')}
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <HandoffNotice
                availability={shippingAvailability}
                testId="handoff-po-shipping-notice"
              />
            </div>
          )}
        </section>
      )
    }
    <PoLifecycleSteps
      persona="supplier"
      po={selectedLive ?? selected}
      asnCount={
        asns.filter((a) => a.poReference === (selectedLive ?? selected).poNumber && isActiveAsn(a))
          .length
      }
    />
  </>
);

export default DetailSections;
