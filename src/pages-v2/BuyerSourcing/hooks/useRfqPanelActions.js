/** @import { RFQ } from '@data/mockRfqs' */
/** @import { PinDraft } from '../const' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import {
  useRfqFxPin,
  useRfqCancel,
  useRfqPublish,
  useRfqReopen,
  useQuotationReview
} from '@services/query/commandHooks';
import { readFxRate, readFxVintage } from '../../sourcing/fxRateInput';

/**
 * The side panel's governed acts on the selected RFQ: record or supersede an FX
 * pin, move a quote to review, publish, cancel and reopen. Each dispatches its
 * verb and answers with an honest toast; cancel and reopen close the panel.
 * Returns the handlers and the mutations (the panel reads `isPending`). Moved
 * out of `SourcingWorkspace` by the Phase 5 page split (no behaviour change).
 * @param {{
 *   selectedRfq: RFQ | null;
 *   pinDraft: PinDraft | null;
 *   setPinDraft: (d: PinDraft | null) => void;
 *   closePanel: () => void;
 * }} args
 */
export const useRfqPanelActions = ({ selectedRfq, pinDraft, setPinDraft, closePanel }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const cancelMutation = useRfqCancel();
  const reopenMutation = useRfqReopen();
  const publishMutation = useRfqPublish();
  const reviewMutation = useQuotationReview();
  const fxPinMutation = useRfqFxPin();

  // Award the selected quotation (fires the cascade source t_rfq_award): the
  // winner is awarded, every other quotation on the RFQ is rejected, and the
  // reads re-derive. Honest toast; a failed dispatch surfaces its reason.
  // 2e-c-4 — record (or supersede) the FX basis. The rate and the vintage are
  // both read ONCE here, through the pure gates, and the parsed values are what
  // the dispatch carries: the number the buyer confirmed is the number that
  // lands on the ledger, with no second reading to disagree with it.
  const handlePinConfirm = () => {
    if (!selectedRfq || !pinDraft) return;
    const rate = readFxRate(pinDraft.rate);
    const vintage = readFxVintage(pinDraft.asOf);
    // The dialog's own button is already disabled on a refusal; this is the
    // structural twin, so a keyboard or a future caller cannot route around it.
    if (!rate.ok || !vintage.ok) return;
    const currency = pinDraft.currency;
    const superseding = Boolean(pinDraft.superseding);
    fxPinMutation.mutate(
      {
        rfqId: selectedRfq.id,
        quote: currency,
        rate: rate.value,
        asOf: vintage.value,
        source: pinDraft.source,
        ...(pinDraft.rateType.trim() ? { rateType: pinDraft.rateType.trim() } : {})
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.fxPinFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.fxPinFailed.default')
            });
            return;
          }
          setPinDraft(null);
          // Two distinct messages, because they are two distinct acts. A
          // supersede says the prior basis is KEPT — the buyer has not erased
          // anything, and the trail will show both.
          toast({
            variant: 'success',
            title: t(
              superseding ? 'sourcing.toast.fxSuperseded.title' : 'sourcing.toast.fxPinned.title',
              { currency }
            ),
            description: t(
              superseding ? 'sourcing.toast.fxSuperseded.desc' : 'sourcing.toast.fxPinned.desc'
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.fxPinFailed.title'),
            description: t('sourcing.toast.fxPinFailed.default')
          })
      }
    );
  };

  // Move a submitted quote into evaluation (fires t_quotation_review, Submitted →
  // Under Review). No cascade, no artifact — a buyer-side lifecycle advance. On a
  // non-failed outcome the quotation reads re-derive and the pill flips in place.
  /** @param {string} quotationId */
  const handleReview = (quotationId) => {
    reviewMutation.mutate(
      { quotationId },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reviewFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.reviewFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reviewed.title'),
            description: t('sourcing.toast.reviewed.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reviewFailed.title'),
            description: t('sourcing.toast.reviewFailed.default')
          })
      }
    );
  };

  // PF-1a — publish the RFQ (fires t_rfq_publish, Draft → Open). THE ACT THAT
  // MAKES THE EVENT VISIBLE: supplier reads exclude Draft, so until this fires
  // the invited list has not been shown anything. The panel stays open — the
  // buyer's next move (award, cancel, pin a rate) is on this same RFQ, and the
  // board re-derives underneath it.
  const handlePublish = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    const invitedCount = selectedRfq.invitedSupplierIds.length;
    publishMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.publishFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.publishFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.published.title', { rfqNumber }),
            // Manual plural selection, the convention this file already uses for
            // the create toast — not i18next's `_one/_other` suffixes, which are
            // configured nowhere here and would silently fall back.
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.published.desc.one'
                : 'sourcing.toast.published.desc.other',
              { count: invitedCount }
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.publishFailed.title'),
            description: t('sourcing.toast.publishFailed.dispatch')
          })
      }
    );
  };

  // Cancel the RFQ (fires t_rfq_cancel, Draft/Open/Closed → Cancelled). Terminal
  // abandon — no cascade, no artifact. On success the board re-derives and the
  // panel closes (its local snapshot would otherwise show the stale prior status).
  const handleCancel = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    cancelMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.cancelFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.cancelFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.cancelled.title', { rfqNumber }),
            description: t('sourcing.toast.cancelled.desc')
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.cancelFailed.title'),
            description: t('sourcing.toast.cancelFailed.dispatch')
          })
      }
    );
  };

  // Reopen a closed RFQ (fires t_rfq_reopen, Closed → Open) for further responses.
  const handleReopen = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    reopenMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reopenFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.reopenFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reopened.title', { rfqNumber }),
            description: t('sourcing.toast.reopened.desc')
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reopenFailed.title'),
            description: t('sourcing.toast.reopenFailed.dispatch')
          })
      }
    );
  };

  return {
    handlePinConfirm,
    handleReview,
    handlePublish,
    handleCancel,
    handleReopen,
    cancelMutation,
    reopenMutation,
    publishMutation,
    reviewMutation,
    fxPinMutation
  };
};
