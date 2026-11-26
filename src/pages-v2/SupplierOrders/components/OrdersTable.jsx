/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { PanelMode } from '../const' */
import StatusPill from '@components/ui-v2/StatusPill';
import { statusTone } from '@lib/statusTone';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { POStatus } from '@services/data/types';
import { poDisplayStatus } from '@services/data/poResponseProjection';
import { ACTION_STATUSES } from '../const';
import { fmtDate, fmtIDR } from '../utils';

/**
 * @typedef {object} OrdersTableProps
 * @property {PurchaseOrder[]} displayPOs  The POs of the active sub-tab.
 * @property {string} nowIso  The clock the display status is derived against.
 * @property {boolean} canConfirmHere  The seat holds `po:confirm` (seat-level, see the page's note).
 * @property {{ held: boolean }} asnWizard  Whether the seat holds the Create-ASN wizard's atoms.
 * @property {(po: PurchaseOrder, mode?: PanelMode) => void} openOrderPanel  A row click opens the PO.
 * @property {(po: PurchaseOrder, e: React.MouseEvent) => void} handleRowAction  The row button's act.
 * @property {ReadonlySet<string>} bulkEligibleIds  UCX-P2 — the ids a bulk
 *   confirm may tick (the record's own rules decide; the helper derives).
 * @property {ReadonlySet<string>} bulkTickedIds  The ids ticked in the bar.
 * @property {(po: PurchaseOrder) => void} onToggleBulk  Ticks or unticks one row.
 * @property {(po: PurchaseOrder) => string} bulkReasonOf  Why a row is not tickable ('' when it is).
 * @property {TFunction} t
 */

/**
 * The PO worklist table: number, dates, item count, value, display status and
 * the row action (Confirm, Create ASN or View — the label names what pressing
 * it does for this seat), with an empty row when the tab holds none. Moved out
 * of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<OrdersTableProps>}
 */
const OrdersTable = ({
  displayPOs,
  nowIso,
  canConfirmHere,
  asnWizard,
  openOrderPanel,
  handleRowAction,
  bulkEligibleIds,
  bulkTickedIds,
  onToggleBulk,
  bulkReasonOf,
  t
}) => {
  /**
   * @param {PurchaseOrder} po
   * @returns {string}
   */
  const panelActionLabel = (po) => {
    if (ACTION_STATUSES.includes(po.status))
      return canConfirmHere ? t('supplierOrders.action.confirm') : t('supplierOrders.action.view');
    if (po.status === POStatus.CONFIRMED)
      return asnWizard.held
        ? t('supplierOrders.action.createAsn')
        : t('supplierOrders.action.view');
    return t('supplierOrders.action.view');
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableHeaderCell className="w-8">
            <span className="sr-only">{t('supplierOrders.bulk.colTick')}</span>
          </TableHeaderCell>
          <TableHeaderCell>{t('supplierOrders.col.po')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierOrders.col.orderDate')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierOrders.col.requestedDelivery')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('supplierOrders.col.items')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('supplierOrders.col.value')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierOrders.col.status')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('supplierOrders.col.action')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {displayPOs.map((po) => (
            <TableRow
              key={po.id}
              className="cursor-pointer"
              onClick={() => openOrderPanel(po, 'detail')}
            >
              <TableCell className="align-middle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={bulkTickedIds.has(po.id)}
                  disabled={!bulkEligibleIds.has(po.id)}
                  title={bulkReasonOf(po)}
                  aria-label={t('supplierOrders.bulk.tickRow', { po: po.poNumber })}
                  onChange={() => onToggleBulk(po)}
                  data-testid={`po-bulk-tick-${po.id}`}
                />
              </TableCell>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">{po.poNumber}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{fmtDate(po.orderDate)}</Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                {po.lineItems.length}
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{fmtIDR(po.totalValue)}</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={statusTone(poDisplayStatus(po, nowIso))}>
                  {poDisplayStatus(po, nowIso)}
                </StatusPill>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={
                    ACTION_STATUSES.includes(po.status) && canConfirmHere ? 'outline' : 'secondary'
                  }
                  onClick={(e) => handleRowAction(po, e)}
                >
                  {panelActionLabel(po)}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {displayPOs.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
                {t('supplierOrders.table.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default OrdersTable;
