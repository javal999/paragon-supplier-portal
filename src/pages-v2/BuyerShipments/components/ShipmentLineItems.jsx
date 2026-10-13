/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Shipment } from '@data/mockShipments' */
import Data from '@components/ui-v2/Data';
import { formatNumber } from '../utils';

/**
 * The side panel's line-items table for the open shipment: material,
 * description, quantity, unit. Moved out of `BuyerShipments.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<{ selected: Shipment; t: TFunction }>}
 */
const ShipmentLineItems = ({ selected, t }) => (
  <section>
    <div className="text-label text-text-tertiary uppercase mb-2">
      {t('shipments.panel.lineItems')}
    </div>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-text-tertiary uppercase">
          <th className="text-left py-1">{t('shipments.panel.col.material')}</th>
          <th className="text-left py-1">{t('shipments.panel.col.description')}</th>
          <th className="text-right py-1">{t('shipments.panel.col.qty')}</th>
          <th className="text-left py-1 pl-2">{t('shipments.panel.col.uom')}</th>
        </tr>
      </thead>
      <tbody>
        {/* Key: materialCode — a shipment carries one line per
            material (same key as the ASN line list above). */}
        {selected.lineItems.map((li) => (
          <tr key={li.materialCode} className="border-t border-border-subtle">
            <td className="py-2 text-text-primary">
              <Data>{li.materialCode}</Data>
            </td>
            <td className="py-2 text-text-secondary">{li.description}</td>
            <td className="py-2 text-right text-text-primary">
              <Data>{formatNumber(li.qty)}</Data>
            </td>
            <td className="py-2 pl-2 text-text-tertiary">{li.uom}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

export default ShipmentLineItems;
