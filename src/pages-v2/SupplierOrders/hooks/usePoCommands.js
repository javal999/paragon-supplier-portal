/** @import React from 'react' */
/** @import { PoLineResponse, PoRejectionCause, PurchaseOrder } from '@services/data/types' */
/** @import { PanelMode } from '../const' */
/** @import { readPanelDrafts } from '../utils' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import {
  usePurchaseOrderConfirm,
  usePurchaseOrderAcknowledge,
  usePurchaseOrderAdjust,
  usePurchaseOrderReject,
  usePurchaseOrderShippingNotice
} from '@services/query/commandHooks';
import { isIsoDate } from '@services/transitions/policies';
import { ordersNow } from '../../orders/PoCollaboration';

/**
 * What the commands read from the page's panel state.
 * @typedef {object} PoCommandsInput
 * @property {PurchaseOrder | null} selected  The PO open in the panel.
 * @property {ReturnType<typeof readPanelDrafts>['qtysRead']} qtysRead  The composite confirm read.
 * @property {boolean} allBoundsOk  Every read confirm cell is within its bound.
 * @property {string} deliveryDate  The confirmed delivery date.
 * @property {string} notes  The note sent with the confirm.
 * @property {(v: string) => void} setConfirmedAt
 * @property {React.Dispatch<React.SetStateAction<PanelMode>>} setPanelMode
 * @property {ReturnType<typeof readPanelDrafts>['adjustLines']} adjustLines  The ticked adjust lines, read.
 * @property {boolean} adjustReady  At least one adjust line, none refused.
 * @property {string} responseComment  The optional comment sent with adjust / reject.
 * @property {PoRejectionCause[]} rejectCauses  The reject causes ticked.
 * @property {string} completionDate  The shipping-notice completion date.
 */

/**
 * The commands the order panel dispatches, each with the toast that reports
 * what the dispatcher answered: confirm (`t_po_confirm`), acknowledge
 * (`t_po_acknowledge`), adjust and reject (REQ-E07-02) and the shipping-notice
 * completion date. Returns the five mutations (the footer reads their
 * `isPending`) and the handlers. Reads the open PO and its drafts from the
 * panel state, and moves the panel to `confirmed` / `detail` on success.
 * Moved out of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @param {PoCommandsInput} panel  The order panel's state and its derived reads.
 */
export function usePoCommands(panel) {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const confirmMutation = usePurchaseOrderConfirm();
  const acknowledgeMutation = usePurchaseOrderAcknowledge();
  // The other two answers and the shipping notice — each asked of its own atom.
  const adjustMutation = usePurchaseOrderAdjust();
  const rejectMutation = usePurchaseOrderReject();
  const shippingMutation = usePurchaseOrderShippingNotice();
  const {
    selected,
    qtysRead,
    allBoundsOk,
    deliveryDate,
    notes,
    setConfirmedAt,
    setPanelMode,
    adjustLines,
    adjustReady,
    responseComment,
    rejectCauses,
    completionDate
  } = panel;

  // Step 3.10 proof: confirm dispatches t_po_confirm through the service seam
  // (user trigger + confirmedQuantities payload + scope + status + event +
  // invalidation). The store mutation drives the table re-derive on success.
  const confirmOrder = () => {
    if (!selected) return;
    const po = selected;
    // THE FIRST LOCK. Only parsed, in-bounds numbers may dispatch — the button
    // is disabled under any refusal, so this guard is belt-and-braces; the
    // POLICY behind the dispatcher remains the enforcement for anything that
    // does not come through this surface.
    if (!qtysRead.ok || !allBoundsOk) return;
    confirmMutation.mutate(
      {
        poId: po.id,
        confirmedQuantities: [...qtysRead.quantities],
        // REQ-E07-02 — the date the form always collected is now kept.
        ...(isIsoDate(deliveryDate) ? { confirmedDeliveryDate: deliveryDate } : {}),
        ...(notes.trim() ? { comment: notes.trim() } : {})
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('po.confirm.failed.title', { poNumber: po.poNumber }),
              description:
                refusalText(result.reason) ??
                t('po.confirm.failed.desc', { reason: result.reason ?? '' })
            });
            return;
          }
          const time = new Date(ordersNow()).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
          });
          setConfirmedAt(time);
          setPanelMode('confirmed');
          toast({
            variant: 'success',
            title: t('po.confirm.success.title', { poNumber: po.poNumber })
          });
        },
        onError: () => {
          toast({
            variant: 'error',
            title: t('po.confirm.denied.title'),
            description: t('po.confirm.denied.desc')
          });
        }
      }
    );
  };

  /**
   * @param {PurchaseOrder} po
   * @param {string} successKey
   * @param {string} successDesc
   */
  const responseToast = (po, successKey, successDesc) => ({
    /** @param {{ status: string; reason?: string }} result */
    onSuccess: (result) => {
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('oc.toast.failed.title', { poNumber: po.poNumber }),
          description: refusalText(result.reason) ?? result.reason ?? ''
        });
        return;
      }
      toast({
        variant: 'success',
        title: t(successKey, { poNumber: po.poNumber }),
        description: t(successDesc)
      });
      setPanelMode('detail');
    },
    onError: () => toast({ variant: 'error', title: t('oc.toast.denied') })
  });

  const submitAdjust = () => {
    if (!selected || !adjustReady) return;
    const po = selected;
    adjustMutation.mutate(
      {
        poId: po.id,
        lineResponses: adjustLines.map((l) => /** @type {PoLineResponse} */ (l.read)),
        ...(responseComment.trim() ? { comment: responseComment.trim() } : {})
      },
      responseToast(po, 'oc.toast.adjusted.title', 'oc.toast.adjusted.desc')
    );
  };

  const submitReject = () => {
    if (!selected || rejectCauses.length === 0) return;
    const po = selected;
    rejectMutation.mutate(
      {
        poId: po.id,
        rejectionCauses: rejectCauses,
        ...(responseComment.trim() ? { comment: responseComment.trim() } : {})
      },
      responseToast(po, 'oc.toast.rejected.title', 'oc.toast.rejected.desc')
    );
  };

  const saveCompletionDate = () => {
    if (!selected || !isIsoDate(completionDate)) return;
    const po = selected;
    shippingMutation.mutate(
      { poId: po.id, expectedCompletionDate: completionDate },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('oc.toast.failed.title', { poNumber: po.poNumber }),
              description: refusalText(result.reason) ?? result.reason ?? ''
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('oc.toast.shipping.title', { poNumber: po.poNumber })
          });
        },
        onError: () => toast({ variant: 'error', title: t('oc.toast.denied') })
      }
    );
  };

  /** @param {PurchaseOrder} po */
  const acknowledgeOrder = (po) => {
    acknowledgeMutation.mutate(
      { poId: po.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('supplierOrders.ack.failed.title', { poNumber: po.poNumber }),
              description:
                refusalText(res.reason) ??
                t('supplierOrders.ack.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('supplierOrders.ack.success.title', { poNumber: po.poNumber }),
            description: t('supplierOrders.ack.success.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('supplierOrders.ack.denied.title'),
            description: t('supplierOrders.ack.denied.desc')
          })
      }
    );
  };

  return {
    confirmMutation,
    acknowledgeMutation,
    adjustMutation,
    rejectMutation,
    shippingMutation,
    confirmOrder,
    submitAdjust,
    submitReject,
    saveCompletionDate,
    acknowledgeOrder
  };
}
