/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { PanelMode } from './InvoiceRow' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import InvoiceRow from './InvoiceRow';

/**
 * @typedef {object} InvoiceTableProps
 * @property {readonly SupplierInvoice[]} shown  The rows after the drill and stage filters.
 * @property {ReturnType<typeof useVerbAvailability>} invoiceAvailability  `invoice:submit`.
 * @property {boolean} submitPending  Whether a draft submit is in flight.
 * @property {(inv: SupplierInvoice) => void} openDetail  Opens the detail panel.
 * @property {(inv: SupplierInvoice) => void} submitDraft  Submits a draft invoice.
 * @property {(inv: SupplierInvoice) => void} openFix  Opens the correct-and-resubmit panel.
 * @property {(inv: SupplierInvoice | null) => void} setSelected  Selects the panel's invoice.
 * @property {(mode: PanelMode) => void} setPanelMode  Switches the panel's mode.
 * @property {TFunction} t
 */

/**
 * The invoice table: its header and one `InvoiceRow` per shown invoice. Moved
 * out of `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<InvoiceTableProps>}
 */
const InvoiceTable = ({ shown, t, ...rowProps }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('supplierInvoices.table.invoiceNo')}</TableHeaderCell>
        <TableHeaderCell>{t('supplierInvoices.table.poRef')}</TableHeaderCell>
        <TableHeaderCell className="text-right">
          {t('supplierInvoices.table.amount')}
        </TableHeaderCell>
        <TableHeaderCell>{t('supplierInvoices.table.status')}</TableHeaderCell>
        <TableHeaderCell term="supThreeWayMatch" />
        <TableHeaderCell>{t('supplierInvoices.table.dueDate')}</TableHeaderCell>
        <TableHeaderCell>{t('supplierInvoices.table.paymentDate')}</TableHeaderCell>
        <TableHeaderCell className="text-right">
          {t('supplierInvoices.table.action')}
        </TableHeaderCell>
      </TableHeader>
      <tbody>
        {shown.map((inv) => (
          <InvoiceRow key={inv.id} inv={inv} t={t} {...rowProps} />
        ))}
      </tbody>
    </Table>
  </div>
);

export default InvoiceTable;
