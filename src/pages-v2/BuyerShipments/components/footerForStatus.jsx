/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { NavigateFunction } from 'react-router-dom' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { Shipment } from '@data/mockShipments' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
import Button from '@components/ui-v2/Button';

/**
 * @typedef {object} FooterContext
 * @property {TFunction} t
 * @property {UseToastReturn['toast']} toast
 * @property {NavigateFunction} navigate
 * @property {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 */

/**
 * The side panel's footer action for one shipment, chosen by its DISPLAY
 * state: send a reminder, track, begin or view the GR, or contact the carrier.
 * A plain function, not a component, so `null` still reaches `SidePanel` as
 * `null` for a state with no action. Moved out of `BuyerShipments.jsx`'s
 * workspace by the Phase 5 page split (no behaviour change).
 * @param {Shipment} s
 * @param {FooterContext} ctx
 * @returns {React.ReactNode}
 */
export const footerForStatus = (s, { t, toast, navigate, displayOf }) => {
  switch (displayOf(s)) {
    case 'Pending ASN':
      return (
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'success',
              title: t('shipments.toast.reminder.title'),
              description: t('shipments.toast.reminder.desc', {
                supplier: s.supplierName,
                asn: s.asnNumber
              })
            })
          }
        >
          {t('shipments.footer.sendReminder')}
        </Button>
      );
    case 'In Transit':
    case 'Arrived at Port':
    case 'Customs Clearance':
      return (
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'info',
              title: t('shipments.toast.tracking.title'),
              description: t('shipments.toast.tracking.desc', {
                carrier: s.carrier,
                tracking: s.trackingNumber
              })
            })
          }
        >
          {t('shipments.footer.trackShipment')}
        </Button>
      );
    case 'At Dock':
    case 'Unloading':
      return (
        <Button variant="outline" onClick={() => navigate('/buyer/goods-receipt')}>
          {t('shipments.footer.beginGr')}
        </Button>
      );
    case 'Delivered':
      return (
        <Button variant="outline" onClick={() => navigate('/buyer/goods-receipt')}>
          {t('shipments.footer.viewGr')}
        </Button>
      );
    case 'Delayed':
      return (
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'warning',
              title: t('shipments.toast.carrierAlerted.title'),
              description: t('shipments.toast.carrierAlerted.desc', {
                asn: s.asnNumber
              })
            })
          }
        >
          {t('shipments.footer.contactCarrier')}
        </Button>
      );
    default:
      return null;
  }
};
