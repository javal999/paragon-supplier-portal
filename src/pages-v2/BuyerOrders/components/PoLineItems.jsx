/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { formatIDR } from '@lib/format';
import { poLineQuantityText } from '../../orders/poLineQuantity';
import { lineTotal } from '../utils';

/**
 * @typedef {object} PoLineItemsProps
 * @property {PurchaseOrder} selectedPO  The PO whose lines are listed.
 * @property {TFunction} t
 */

/**
 * The panel's line-items table: material, quantity, unit price and line total
 * per line, and the PO total in the footer. Moved out of `BuyerOrders.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<PoLineItemsProps>}
 */
const PoLineItems = ({ selectedPO, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerOrders.panel.lineItems')}
    </h3>
    <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">
              {t('buyerOrders.lines.col.material')}
            </th>
            <th className="text-right px-3 py-2 font-semibold">{t('buyerOrders.lines.col.qty')}</th>
            <th className="text-right px-3 py-2 font-semibold">
              {t('buyerOrders.lines.col.unit')}
            </th>
            <th className="text-right px-3 py-2 font-semibold">
              {t('buyerOrders.lines.col.lineTotal')}
            </th>
          </tr>
        </thead>
        <tbody>
          {selectedPO.lineItems.map((li) => (
            <tr key={li.id} className="border-t border-border-subtle">
              <td className="px-3 py-2">
                <Data as="div" className="text-xs text-text-tertiary">
                  {li.materialCode}
                </Data>
                <div className="text-text-primary mt-0.5">{li.description}</div>
              </td>
              <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                <Data>{poLineQuantityText(t, li)}</Data>
              </td>
              <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                <Data>{formatIDR(li.unitPrice)}</Data>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{formatIDR(lineTotal(li))}</Data>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-subtle bg-bg-hover">
            <td
              className="px-3 py-2 text-right font-semibold text-text-tertiary uppercase tracking-wider"
              colSpan={3}
            >
              {t('buyerOrders.lines.total')}
            </td>
            <td className="px-3 py-2 text-right font-semibold text-text-primary whitespace-nowrap">
              <Data>{formatIDR(selectedPO.totalValue)}</Data>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
);

export default PoLineItems;
