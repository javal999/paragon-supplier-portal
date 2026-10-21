/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { SettleFault } from '@services/transitions' */
/** @import { PanelMode } from '../const' */
import { Send } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { SETTLE_FAULT_RETRYABLE } from '@services/transitions';
import { invoiceActionsFor } from '../../invoices/invoiceActionModel';
import { FOOTER_ACTION_KEY } from '../const';
import { fmtCompact } from '../utils';

/**
 * @typedef {object} InvoicePanelFooterProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {PanelMode} panelMode
 * @property {(mode: PanelMode) => void} setPanelMode
 * @property {() => void} closePanel
 * @property {(transitionId: string) => VerbAvailability} availabilityOfVerb  The seat's availability per verb.
 * @property {Record<string, { correlationId: string; fault: SettleFault | null }>} settleWatch
 *   The settles this session started, by invoice id (`useInvoiceCommands`).
 * @property {(invoiceId: string) => void} retrySettle
 * @property {string | null} footerVerbId  The verb the primary slot dispatches, if any.
 * @property {VerbAvailability} commitAvailability  That verb's availability for the seat.
 * @property {{ labelKey: string } | null} commitAction  The machine's reserved commit, if any.
 * @property {boolean} releasePending  The release mutation is running.
 * @property {boolean} disputePending  The dispute mutation is running.
 * @property {boolean} resolvePending  The resolve mutation is running.
 * @property {() => void} handleFooterAction
 * @property {() => void} handleReleasePayment
 * @property {() => void} confirmDispute
 * @property {(reason: string) => void} setDisputeReason
 * @property {() => void} sendRemittance
 * @property {TFunction} t
 */

/**
 * The side panel's footer buttons, one set per panel mode: detail (close,
 * dispute or its handoff notice, and the primary slot — settle wait / retry,
 * the commit's handoff notice, or the footer action), confirming (cancel,
 * confirm release), disputing (cancel, raise dispute) and remittance (back,
 * send to supplier). Moved out of `BuyerInvoices.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<InvoicePanelFooterProps>}
 */
const InvoicePanelFooter = ({
  selected,
  panelMode,
  setPanelMode,
  closePanel,
  availabilityOfVerb,
  settleWatch,
  retrySettle,
  footerVerbId,
  commitAvailability,
  commitAction,
  releasePending,
  disputePending,
  resolvePending,
  handleFooterAction,
  handleReleasePayment,
  confirmDispute,
  setDisputeReason,
  sendRemittance,
  t
}) => (
  <>
    {panelMode === 'detail' && (
      <>
        <Button variant="secondary" onClick={closePanel}>
          {t('buyerInvoices.action.close')}
        </Button>
        {/* Dispute is offered exactly where the MACHINE says it is legal
            (Submitted | Matched | Approved) — not where a display label
            happened to list it. A past-due Approved invoice keeps it. */}
        {invoiceActionsFor(selected.lifecycleState).some(
          (a) => a.transitionId === 't_invoice_dispute'
        ) &&
          (availabilityOfVerb('t_invoice_dispute').kind === 'held' ? (
            <Button variant="secondary" onClick={() => setPanelMode('disputing')}>
              {t('buyerInvoices.action.dispute')}
            </Button>
          ) : (
            <HandoffNotice
              availability={availabilityOfVerb('t_invoice_dispute')}
              testId="handoff-dispute"
            />
          ))}
        {selected.lifecycleState === 'Releasing Payment' ? (
          // AT THE SAP BOUNDARY. No verb is legal from the interim
          // state; the footer accounts for the wait, or for the failure
          // if this session saw one, and offers a retry only when the
          // classified fault says a second ask can answer differently.
          settleWatch[selected.id]?.fault ? (
            SETTLE_FAULT_RETRYABLE[
              /** @type {"REFUSED" | "TRANSPORT" | "UNGOVERNED"} */ (settleWatch[selected.id].fault)
            ] ? (
              <Button variant="outline" onClick={() => retrySettle(selected.id)}>
                {t('buyerInvoices.action.retrySettle')}
              </Button>
            ) : (
              <span className="text-xs text-danger self-center">
                {t('buyerInvoices.settle.notRetryable')}
              </span>
            )
          ) : (
            <span className="text-xs text-text-tertiary self-center">
              {t('buyerInvoices.settle.inFlight')}
            </span>
          )
        ) : footerVerbId && commitAvailability.kind !== 'held' ? (
          // ⚠️ THE RESERVED COMMIT IS FINANCE'S. A procurement seat
          // gets the WAIT in the primary slot — not a disabled button,
          // and never an empty footer: the machine says a release is
          // legal from this state, so the surface must say whose it is.
          // (It used to render SOLID; §68 retired that register, and
          // the ownership statement is untouched by the change.)
          <HandoffNotice availability={commitAvailability} testId="handoff-commit" />
        ) : (
          <Button
            variant="outline"
            disabled={releasePending || resolvePending}
            onClick={handleFooterAction}
          >
            {t(commitAction ? commitAction.labelKey : FOOTER_ACTION_KEY[selected.status])}
          </Button>
        )}
      </>
    )}
    {panelMode === 'confirming' && (
      <>
        <Button variant="secondary" onClick={() => setPanelMode('detail')}>
          {t('buyerInvoices.action.cancel')}
        </Button>
        <Button variant="outline" disabled={releasePending} onClick={handleReleasePayment}>
          {t('buyerInvoices.action.confirmRelease', {
            amount: fmtCompact(selected.amount)
          })}
        </Button>
      </>
    )}
    {panelMode === 'disputing' && (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            setPanelMode('detail');
            setDisputeReason('');
          }}
        >
          {t('buyerInvoices.action.cancel')}
        </Button>
        <Button variant="outline" disabled={disputePending} onClick={confirmDispute}>
          {t('buyerInvoices.action.raiseDispute')}
        </Button>
      </>
    )}
    {panelMode === 'remittance' && (
      <>
        <Button variant="secondary" onClick={() => setPanelMode('detail')}>
          {t('buyerInvoices.action.back')}
        </Button>
        <Button variant="outline" icon={Send} onClick={sendRemittance}>
          {t('buyerInvoices.action.sendToSupplier')}
        </Button>
      </>
    )}
  </>
);

export default InvoicePanelFooter;
