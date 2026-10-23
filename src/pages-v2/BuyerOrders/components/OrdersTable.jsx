/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import OrderRow from './OrderRow';

/**
 * @typedef {object} OrdersTableProps
 * @property {PurchaseOrder[]} filtered  The rows for the current tab, range and search.
 * @property {Map<string, string>} supplierCountryById  Supplier id → country code, for the flag.
 * @property {string} nowIso  The orders clock, for the display status.
 * @property {(po: PurchaseOrder) => void} setSelectedPO  Opens the panel on a row.
 * @property {TFunction} t
 */

/**
 * The PO worklist table: nine column headers, one `OrderRow` per filtered PO,
 * and the empty row when nothing matches. Moved out of `BuyerOrders.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<OrdersTableProps>}
 */
const OrdersTable = ({ filtered, supplierCountryById, nowIso, setSelectedPO, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('buyerOrders.table.col.po')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.material')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.orderDate')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.delivery')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('buyerOrders.table.col.value')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.channel')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerOrders.table.col.status')}</TableHeaderCell>
        <TableHeaderCell className="text-right">
          {t('buyerOrders.table.col.actions')}
        </TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((po) => (
          <OrderRow
            key={po.id}
            po={po}
            supplierCountryById={supplierCountryById}
            nowIso={nowIso}
            setSelectedPO={setSelectedPO}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={9} className="text-center text-sm text-text-tertiary py-10">
              {t('buyerOrders.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default OrdersTable;
