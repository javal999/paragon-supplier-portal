/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useToast } from '@hooks/useToast' */
/** @import { PurchaseOrder } from '@services/data/types' */
import StatusPill from '@components/ui-v2/StatusPill';
import { statusTone } from '@lib/statusTone';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { POStatus } from '@services/data/types';
import { fmtDate, fmtIDR } from '../utils';

/**
 * @typedef {object} RecentOrdersTableProps
 * @property {PurchaseOrder[]} sortedPOs  The supplier's POs, newest order date first.
 * @property {ReturnType<typeof useToast>['toast']} toast
 * @property {TFunction} t
 */

/**
 * The recent purchase-orders section: one row per PO with its status pill and
 * a per-status action button (confirm / create ASN / view) that only toasts.
 * Moved out of `SupplierDashboard.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<RecentOrdersTableProps>}
 */
const RecentOrdersTable = ({ sortedPOs, toast, t }) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-border-subtle">
      <h2 className="text-section text-text-primary">{t('supplierDashboard.orders.title')}</h2>
    </div>
    {/* This table sits in the 3fr half of `xl:grid-cols-[3fr_2fr]`, so at
        1280px it has ~574px for six columns that want ~750px — the Action
        button was the part that fell off, silently. Same remedy as the
        compliance table: scroll the table inside its own box rather than
        clip it, with the section keeping `overflow-hidden` for its corners. */}
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('supplierDashboard.orders.col.po')}</TableHeaderCell>
          <TableHeaderCell>{t('supplierDashboard.orders.col.orderDate')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('supplierDashboard.orders.col.items')}
          </TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('supplierDashboard.orders.col.value')}
          </TableHeaderCell>
          <TableHeaderCell>{t('supplierDashboard.orders.col.status')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('supplierDashboard.orders.col.action')}
          </TableHeaderCell>
        </TableHeader>
        <tbody>
          {sortedPOs.map((po) => {
            const isActionable = po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED;
            const isConfirmed = po.status === POStatus.CONFIRMED;
            const btnLabel = isActionable
              ? t('supplierDashboard.orders.action.confirm')
              : isConfirmed
                ? t('supplierDashboard.orders.action.createAsn')
                : t('supplierDashboard.orders.action.view');
            return (
              <TableRow key={po.id}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{po.poNumber}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  <Data>{fmtDate(po.orderDate)}</Data>
                </TableCell>
                <TableCell className="text-right text-text-secondary">
                  {po.lineItems.length}
                </TableCell>
                <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                  <Data>{fmtIDR(po.totalValue)}</Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={statusTone(po.status)}>{po.status}</StatusPill>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={isActionable ? 'outline' : 'secondary'}
                    onClick={() =>
                      toast({
                        variant: 'info',
                        title: isActionable
                          ? t('supplierDashboard.orders.toast.opening', { po: po.poNumber })
                          : isConfirmed
                            ? t('supplierDashboard.orders.toast.creatingAsn', {
                                po: po.poNumber
                              })
                            : t('supplierDashboard.orders.toast.viewing', {
                                po: po.poNumber
                              })
                      })
                    }
                  >
                    {btnLabel}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  </section>
);

export default RecentOrdersTable;
