/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import InvoiceQueueRow from './InvoiceQueueRow';

/**
 * @typedef {object} InvoiceQueueTableProps
 * @property {BuyerInvoice[]} filtered  The drilled list, narrowed by the status chip.
 * @property {(inv: BuyerInvoice) => void} onOpen  Opens an invoice in the side panel.
 * @property {TFunction} t
 */

/**
 * The queue tab's invoice table: the nine column headers, one
 * `InvoiceQueueRow` per filtered invoice, and an empty row when the filter
 * matches nothing. Moved out of `BuyerInvoices.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<InvoiceQueueTableProps>}
 */
const InvoiceQueueTable = ({ filtered, onOpen, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('buyerInvoices.table.invoiceNo')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.poRef')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('buyerInvoices.table.amount')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.match')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.status')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.dueDate')}</TableHeaderCell>
        <TableHeaderCell>{t('buyerInvoices.table.sapFi')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('buyerInvoices.table.actions')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((inv) => (
          <InvoiceQueueRow key={inv.id} inv={inv} onOpen={onOpen} t={t} />
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={9} className="text-center text-sm text-text-tertiary py-10">
              {t('buyerInvoices.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default InvoiceQueueTable;
