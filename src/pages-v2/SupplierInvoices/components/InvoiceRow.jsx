/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
import { Receipt } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { statusTone } from '@lib/statusTone';
import { MatchPill } from '../../invoices/InvoiceCollaboration';
import { CHANNEL_ICON } from '../const';
import { fmtDate, fmtIDR, fmtIDRFull } from '../utils';
import DueCell from './DueCell';

/** @typedef {'detail' | 'remittance'} PanelMode */

/**
 * @typedef {object} InvoiceRowProps
 * @property {SupplierInvoice} inv  The invoice this row shows.
 * @property {ReturnType<typeof useVerbAvailability>} invoiceAvailability  `invoice:submit`,
 *   which gates the row's submit (Draft) and resubmit (Returned) in their own slots.
 * @property {boolean} submitPending  Whether a draft submit is in flight.
 * @property {(inv: SupplierInvoice) => void} openDetail  Opens the detail panel.
 * @property {(inv: SupplierInvoice) => void} submitDraft  Submits a draft invoice.
 * @property {(inv: SupplierInvoice) => void} openFix  Opens the correct-and-resubmit panel.
 * @property {(inv: SupplierInvoice | null) => void} setSelected  Selects the panel's invoice.
 * @property {(mode: PanelMode) => void} setPanelMode  Switches the panel to remittance.
 * @property {TFunction} t
 */

/**
 * One invoice row: number and channel, PO, amount, stage, match, due date,
 * payment date and the row action (remittance, submit, resubmit, a handoff
 * notice, or view). Clicking the row opens the detail panel; the action cell
 * stops that click. Moved out of `SupplierInvoices.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<InvoiceRowProps>}
 */
const InvoiceRow = ({
  inv,
  invoiceAvailability,
  submitPending,
  openDetail,
  submitDraft,
  openFix,
  setSelected,
  setPanelMode,
  t
}) => {
  const Channel = CHANNEL_ICON[inv.channel];
  const isPaid = inv.stage === 'Paid';
  return (
    <TableRow className="cursor-pointer" onClick={() => openDetail(inv)}>
      <TableCell>
        <Data as="div" className="text-xs font-bold text-text-primary">
          {inv.invoiceNumber}
        </Data>
        <div className="inline-flex items-center gap-1 text-[10px] text-text-tertiary mt-0.5">
          <Channel size={10} />
          {t('supplierInvoices.table.via', { channel: inv.channel })}
        </div>
      </TableCell>
      <TableCell>
        <Data className="text-xs text-text-secondary">{inv.poNumber}</Data>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <div className="font-semibold text-text-primary">
          <Data>{fmtIDR(inv.amount)}</Data>
        </div>
        <div className="text-xs text-text-tertiary">
          <Data>{fmtIDRFull(inv.amount)}</Data>
        </div>
      </TableCell>
      <TableCell>
        <StatusPill variant={statusTone(inv.stage)}>{inv.stage}</StatusPill>
      </TableCell>
      <TableCell>
        {inv.stage === 'Draft' ? (
          <span className="text-text-tertiary text-xs">—</span>
        ) : (
          <MatchPill status={inv.matchStatus} />
        )}
      </TableCell>
      <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
        <DueCell inv={inv} t={t} />
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {inv.paymentDate ? (
          <span className="text-success font-semibold">
            <Data>{fmtDate(inv.paymentDate)}</Data>
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {isPaid ? (
          <Button
            variant="outline"
            icon={Receipt}
            onClick={() => {
              setSelected(inv);
              setPanelMode('remittance');
            }}
          >
            {t('supplierInvoices.action.remittance')}
          </Button>
        ) : inv.stage === 'Draft' || inv.stage === 'Returned' ? (
          invoiceAvailability.kind === 'held' ? (
            inv.stage === 'Draft' ? (
              <Button variant="outline" disabled={submitPending} onClick={() => submitDraft(inv)}>
                {t('invoice.submit.action')}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => openFix(inv)}>
                {t('fc.inv.resubmit.action')}
              </Button>
            )
          ) : (
            <HandoffNotice
              availability={invoiceAvailability}
              testId={inv.stage === 'Draft' ? 'handoff-invoice-submit' : 'handoff-invoice-resubmit'}
            />
          )
        ) : (
          <Button variant="secondary" onClick={() => openDetail(inv)}>
            {t('supplierInvoices.action.view')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

export default InvoiceRow;
