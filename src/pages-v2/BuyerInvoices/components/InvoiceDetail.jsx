/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
/** @import { PanelMode } from '../const' */
import { InvoiceLinesSection } from '../../invoices/InvoiceCollaboration';
import KeyFactsSection from './KeyFactsSection';
import MatchSection from './MatchSection';
import SapPaymentSections from './SapPaymentSections';
import ConfirmReleaseSection from './ConfirmReleaseSection';
import DisputeReasonSection from './DisputeReasonSection';
import RemittanceSection from './RemittanceSection';

/**
 * @typedef {object} InvoiceDetailProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {PanelMode} panelMode  Which mode section shows under the facts.
 * @property {React.ComponentProps<typeof KeyFactsSection>['nextAct']} nextAct
 * @property {string} disputeReason  State owned by the page, so it survives a mode switch.
 * @property {(reason: string) => void} setDisputeReason
 * @property {() => void} downloadPdf
 * @property {TFunction} t
 */

/**
 * The side panel's body for the open invoice: key facts, match, the returned
 * reason (Disputed only), the invoice lines, SAP documents and payment, then
 * the section for the current mode (confirm release, dispute reason or
 * remittance advice). Moved out of `BuyerInvoices.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<InvoiceDetailProps>}
 */
const InvoiceDetail = ({
  selected,
  panelMode,
  nextAct,
  disputeReason,
  setDisputeReason,
  downloadPdf,
  t
}) => (
  <div className="space-y-6">
    <KeyFactsSection selected={selected} nextAct={nextAct} t={t} />

    <MatchSection selected={selected} t={t} />

    {/* REQ-E07-07 — what the supplier invoiced, from which receipts, with
        its tax invoice; and the reason Finance gave when it returned it. */}
    {selected.lifecycleState === 'Disputed' && selected.returnReason && (
      <div
        role="status"
        className="bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger"
      >
        <strong>{t('fc.inv.detail.returned')}:</strong> {selected.returnReason}
      </div>
    )}
    {/* CR-12 (BL-44) — per line: which rule applied and why it is held. */}
    <InvoiceLinesSection
      lines={selected.lines}
      invoiceDate={selected.invoiceDate}
      taxInvoiceFile={selected.taxInvoiceFile}
      amount={selected.amount}
      matchStatus={selected.matchStatus}
    />

    <SapPaymentSections selected={selected} t={t} />

    {panelMode === 'confirming' && <ConfirmReleaseSection selected={selected} t={t} />}

    {panelMode === 'disputing' && (
      <DisputeReasonSection
        selected={selected}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        t={t}
      />
    )}

    {panelMode === 'remittance' && (
      <RemittanceSection selected={selected} downloadPdf={downloadPdf} t={t} />
    )}
  </div>
);

export default InvoiceDetail;
