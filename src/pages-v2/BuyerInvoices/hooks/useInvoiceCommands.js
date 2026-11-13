/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { BuyerInvoice } from '@services/data/types' */
/** @import { SettleFault } from '@services/transitions' */
/** @import { PanelMode } from '../const' */
import { useEffect, useRef, useState } from 'react';
import {
  useInvoiceReleasePayment,
  useInvoiceSettlePayment,
  useInvoiceDispute,
  useInvoiceResolve
} from '@services/query/commandHooks';
import { invoiceActionsFor } from '../../invoices/invoiceActionModel';
import { classifySettleFault } from '@services/transitions';

/**
 * The open invoice's commands: the release → settle flow (with the settle
 * watch and its retry), dispute, resolve, the footer's dispatcher
 * (`handleFooterAction`), and the remittance send / PDF toasts. Called by the
 * page, so the settle watch lives as long as the page does (behaviour of the
 * unsplit page). Moved out of `BuyerInvoices.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @param {object} args
 * @param {BuyerInvoice | null} args.selected  The open invoice, or `null`.
 * @param {(mode: PanelMode) => void} args.setPanelMode  The panel mode setter (page state).
 * @param {string} args.disputeReason  The typed dispute reason (page state).
 * @param {(reason: string) => void} args.setDisputeReason
 * @param {TFunction} args.t  The page's translator, for the toasts.
 * @param {UseToastReturn['toast']} args.toast  The page's toast function.
 * @param {(reason: string | undefined) => string | null} args.refusalText  The page's refusal glossary.
 */
export function useInvoiceCommands({
  selected,
  setPanelMode,
  disputeReason,
  setDisputeReason,
  t,
  toast,
  refusalText
}) {
  const releaseMutation = useInvoiceReleasePayment();
  const settleMutation = useInvoiceSettlePayment();
  const disputeMutation = useInvoiceDispute();
  const resolveMutation = useInvoiceResolve();
  // The settles scheduled after a release, by timer id. Cleared on unmount, so a
  // page that closes inside the delay dispatches no settle and runs no setter.
  const settleTimers = useRef(/** @type {Set<number>} */ (new Set()));
  useEffect(() => {
    const timers = settleTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);
  // ── THE SETTLE WATCH ──────────────────────────────────────────────────────
  // A settle that fails leaves the command `submitted` and the invoice parked in
  // the interim 'Releasing Payment' — the dispatcher's deliberate design, so the
  // same action genuinely re-attempts. Until now the ONLY trace of that failure
  // was the hook's toast, which a user dismisses and cannot get back; the row
  // then sat in an interim state with no account of itself and no way forward.
  // This holds the correlationId and the classified fault for the settles THIS
  // session started, which is exactly the set we can honestly offer a retry for.
  // We do not fabricate one for an invoice parked by an earlier session — that
  // surface says it is waiting and offers nothing, because that is the truth.
  const [settleWatch, setSettleWatch] = useState(
    /** @type {Record<string, { correlationId: string; fault: SettleFault | null }>} */ ({})
  );
  /**
   * @param {string} id
   * @param {string} correlationId
   * @param {SettleFault | null} fault
   */
  const watchSettle = (id, correlationId, fault) =>
    setSettleWatch((w) => ({ ...w, [id]: { correlationId, fault } }));
  /** @param {string} id */
  const clearSettle = (id) =>
    setSettleWatch((w) => {
      const { [id]: _done, ...rest } = w;
      return rest;
    });
  // ⚠️ ORDER IS THE CONTRACT HERE: THE MACHINE IS ASKED FIRST, WITH THE CANONICAL
  // STATE, AND ONLY WHAT IT DECLINES TO ANSWER FALLS THROUGH TO THE DISPLAY
  // LABEL. Reversing these two blocks reintroduces the defect exactly — a
  // past-due Approved invoice matches `status === 'Overdue'` before it ever
  // reaches the legality question, and the release affordance disappears again.
  const handleFooterAction = () => {
    if (!selected) return;
    const actions = invoiceActionsFor(selected.lifecycleState);
    if (actions.some((a) => a.reservedCommit)) {
      setPanelMode('confirming');
      return;
    }
    if (actions.some((a) => a.transitionId === 't_invoice_resolve')) {
      handleResolve();
      return;
    }
    // Below this line NO transition is legal from the canonical state, so what
    // remains are informational affordances — and those genuinely are about the
    // display label (aging, the remittance advice), which is why they key on it.
    if (selected.lifecycleState === 'Releasing Payment') {
      // In flight at the SAP boundary. The footer renders a notice, not a verb.
      return;
    }
    if (selected.status === 'Payment Released') {
      setPanelMode('remittance');
      return;
    }
    if (selected.status === 'Pending Match') {
      // Honest: match completes on the GR post (INV-GR-OVERLAY-01) — no fabrication.
      toast({
        variant: 'info',
        title: t('invoice.match.deferred.title'),
        description: t('invoice.match.deferred.desc')
      });
      return;
    }
    if (selected.status === 'Overdue') {
      // Honest: NOTHING IS ESCALATED HERE. No dispatch, no mutation, no channel
      // send — the Communication Hub lane that would carry an escalation is not
      // built, and wiring one is an operator ruling, not this branch's business.
      // The copy used to read "{{invoiceNumber}} escalated / Routed to Finance
      // Controller for urgent action", which is a claim about an act that does
      // not occur; it now says the act is unavailable and that nothing was
      // routed. `info`, not `warning`, matches the `Pending Match` branch three
      // clauses above: the notice is about a MISSING CAPABILITY, not about this
      // invoice needing attention.
      toast({
        variant: 'info',
        title: t('buyerInvoices.toast.escalate.title', { invoiceNumber: selected.invoiceNumber }),
        description: t('buyerInvoices.toast.escalate.desc')
      });
      return;
    }
  };

  // Option B (canonical SAP-boundary pattern): release resolves `submitted` and
  // moves the invoice to the interim 'Releasing Payment' with NO FI document; the
  // async callback SETTLES to 'Payment Released' + a real FI doc. No "paid" claim
  // is shown before it is true (law 0.6 — this replaces the old client-side
  // fabrication that asserted payment immediately).
  const handleReleasePayment = () => {
    if (!selected) return;
    const inv = selected;
    releaseMutation.mutate(
      { invoiceId: inv.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.pay.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description:
                refusalText(res.reason) ??
                t('invoice.pay.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          setPanelMode('detail');
          toast({
            variant: 'info',
            title: t('invoice.pay.releasing.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.pay.releasing.desc')
          });
          const { correlationId } = res;
          watchSettle(inv.id, correlationId, null);
          const timerId = window.setTimeout(() => {
            settleTimers.current.delete(timerId);
            settleMutation.mutate(
              { correlationId },
              {
                onSuccess: () => {
                  clearSettle(inv.id);
                  toast({
                    variant: 'success',
                    title: t('invoice.pay.released.title', { invoiceNumber: inv.invoiceNumber }),
                    description: t('invoice.pay.released.desc')
                  });
                },
                // ⚠️ THE HOOK'S `onError` STILL FIRES — this does not replace it.
                // `useInvoiceSettlePayment` carries `useSettleErrorToast`, which
                // classifies the fault and names its remedy (§43). That handler
                // was built two batches ago and every consumer so far has done
                // nothing but let it toast. This records the fault ON THE ROW, so
                // the account of the failure outlives the toast — TanStack runs
                // the mutation-level callback first, then this one.
                onError: (err) => watchSettle(inv.id, correlationId, classifySettleFault(err))
              }
            );
          }, 1200);
          settleTimers.current.add(timerId);
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('invoice.denied.title'),
            description: t('invoice.denied.desc')
          })
      }
    );
  };

  // Re-attempt a settle THIS session started and saw fail. Honest because the
  // dispatcher leaves a failed settle `submitted` — the same correlationId is
  // genuinely re-settleable, and `SETTLE_FAULT_RETRYABLE` says which faults can
  // legitimately answer differently on a second ask. A REFUSED or UNGOVERNED
  // fault gets no retry button: asking again cannot change a governed answer,
  // and offering it would be a `PF-1a` affordance promising what it cannot do.
  /** @param {string} invoiceId */
  const retrySettle = (invoiceId) => {
    const watch = settleWatch[invoiceId];
    if (!watch) return;
    settleMutation.mutate(
      { correlationId: watch.correlationId },
      {
        onSuccess: () => {
          clearSettle(invoiceId);
          toast({
            variant: 'success',
            title: t('invoice.settle.retried.title'),
            description: t('invoice.settle.retried.desc')
          });
        },
        onError: (err) => watchSettle(invoiceId, watch.correlationId, classifySettleFault(err))
      }
    );
  };

  const confirmDispute = () => {
    if (!selected) return;
    const inv = selected;
    if (!disputeReason.trim()) {
      toast({ variant: 'warning', title: t('invoice.dispute.missingReason') });
      return;
    }
    disputeMutation.mutate(
      { invoiceId: inv.id, disputeReason: disputeReason.trim() },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.dispute.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description:
                refusalText(res.reason) ??
                t('invoice.dispute.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          setPanelMode('detail');
          setDisputeReason('');
          toast({
            variant: 'success',
            title: t('invoice.dispute.success.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.dispute.success.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('invoice.denied.title'),
            description: t('invoice.denied.desc')
          })
      }
    );
  };

  function handleResolve() {
    if (!selected) return;
    const inv = selected;
    resolveMutation.mutate(
      { invoiceId: inv.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.resolve.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description:
                refusalText(res.reason) ??
                t('invoice.resolve.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('invoice.resolve.success.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.resolve.success.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('invoice.denied.title'),
            description: t('invoice.denied.desc')
          })
      }
    );
  }

  const sendRemittance = () => {
    if (!selected) return;
    // Honest: the advice is generated for the supplier to retrieve — not a live
    // external send we cannot verify (law 0.6).
    toast({
      variant: 'success',
      title: t('invoice.remittance.generated.title'),
      description: t('invoice.remittance.generated.desc', { channel: selected.channel })
    });
    setPanelMode('detail');
  };

  const downloadPdf = () => {
    toast({
      variant: 'warning',
      title: t('buyerInvoices.toast.remitPdfNotAvailable.title'),
      description: t('buyerInvoices.toast.remitPdfNotAvailable.desc')
    });
  };

  return {
    releasePending: releaseMutation.isPending,
    disputePending: disputeMutation.isPending,
    resolvePending: resolveMutation.isPending,
    settleWatch,
    handleFooterAction,
    handleReleasePayment,
    retrySettle,
    confirmDispute,
    sendRemittance,
    downloadPdf
  };
}
