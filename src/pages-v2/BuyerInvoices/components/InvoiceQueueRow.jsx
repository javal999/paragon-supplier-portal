/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import { ChevronRight } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { formatIDR, formatDate } from '@lib/format';
import { CHANNEL_ICON, MATCH_VARIANT, STATUS_VARIANT } from '../const';
import { fmtCompact } from '../utils';

/**
 * @typedef {object} InvoiceQueueRowProps
 * @property {BuyerInvoice} inv
 * @property {(inv: BuyerInvoice) => void} onOpen  Opens the invoice in the side panel (row click).
 * @property {TFunction} t
 */

/**
 * One row of the invoice queue: number, supplier and channel, PO, amount,
 * match and status pills, due / paid dates, SAP FI document. Clicking the row
 * opens the invoice. Moved out of `BuyerInvoices.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<InvoiceQueueRowProps>}
 */
const InvoiceQueueRow = ({ inv, onOpen, t }) => {
  const Channel = CHANNEL_ICON[inv.channel];
  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(inv)}>
      <TableCell>
        <Data as="div" className="text-xs font-semibold text-text-primary">
          {inv.invoiceNumber}
        </Data>
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-primary">{inv.supplierName}</div>
        <div className="inline-flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
          <Channel size={12} />
          {t('buyerInvoices.table.via', { channel: inv.channel })}
        </div>
      </TableCell>
      <TableCell>
        <Data className="text-xs text-text-secondary">{inv.poNumber}</Data>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <Data as="div" className="font-semibold text-text-primary">
          {fmtCompact(inv.amount)}
        </Data>
        <Data as="div" className="text-xs text-text-tertiary">
          {formatIDR(inv.amount)}
        </Data>
      </TableCell>
      <TableCell>
        <StatusPill variant={MATCH_VARIANT[inv.matchStatus]}>{inv.matchStatus}</StatusPill>
      </TableCell>
      <TableCell>
        <StatusPill variant={STATUS_VARIANT[inv.status]}>{inv.status}</StatusPill>
        {inv.status === 'Overdue' && (
          <div className="text-xs text-danger mt-1">
            {t('buyerInvoices.table.daysOverdue', { days: inv.daysOutstanding })}
          </div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data as="div" className="text-sm text-text-secondary">
          {formatDate(inv.dueDate)}
        </Data>
        {inv.paymentDate && (
          <div className="text-xs text-success">
            {t('buyerInvoices.table.paid')} <Data>{formatDate(inv.paymentDate)}</Data>
          </div>
        )}
      </TableCell>
      <TableCell>
        <Data className={`text-xs ${inv.sapFiDoc ? 'text-success' : 'text-text-tertiary'}`}>
          {inv.sapFiDoc ?? '—'}
        </Data>
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight size={16} className="text-text-tertiary inline-block" />
      </TableCell>
    </TableRow>
  );
};

export default InvoiceQueueRow;
