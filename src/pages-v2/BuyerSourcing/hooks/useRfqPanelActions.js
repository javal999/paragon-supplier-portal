/** @import { RFQ } from '@data/mockRfqs' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useRfqCancel, useRfqPublish, useRfqReopen } from '@services/query/commandHooks';

/**
 * The side panel's governed acts on the selected RFQ: publish, cancel and
 * reopen. Each dispatches its verb and answers with an honest toast; cancel and
 * reopen close the panel. Returns the handlers and the mutations (the panel
 * reads `isPending`). Moved out of `SourcingWorkspace` by the Phase 5 page split
 * (no behaviour change). RFx UX B-02 moved the FX pin and the move to review to
 * the event page (`BuyerSourcingEvent/hooks/useEvaluationActions`).
 * @param {{
 *   selectedRfq: RFQ | null;
 *   closePanel: () => void;
 * }} args
 */
export const useRfqPanelActions = ({ selectedRfq, closePanel }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const cancelMutation = useRfqCancel();
  const reopenMutation = useRfqReopen();
  const publishMutation = useRfqPublish();

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
    handlePublish,
    handleCancel,
    handleReopen,
    cancelMutation,
    reopenMutation,
    publishMutation
  };
};
