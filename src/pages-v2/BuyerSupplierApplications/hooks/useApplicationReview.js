import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@hooks/useToast';
import {
  useApplicationStartReview,
  useApplicationApprove,
  useApplicationReject
} from '@services/query/commandHooks';
import { useNextAct } from '@hooks/useVerbAvailability';
import { useRefusalText, useDataErrorText } from '@hooks/useRefusalText';
/** @import { SupplierApplication } from '@services/data/types' */
/** @import { Pending } from '../const' */
import { describeThrown } from '../utils';

/**
 * @typedef {object} ApplicationReview
 * @property {SupplierApplication | null} selected  the row the review panel shows
 * @property {Pending} pending                      which confirm step is open
 * @property {(pending: Pending) => void} setPending
 * @property {string} reason                        the refusal text being authored
 * @property {(reason: string) => void} setReason
 * @property {ReturnType<typeof useNextAct>} nextAct who acts next on the selected row
 * @property {boolean} canCommitReject              the reason has substance
 * @property {boolean} startReviewPending           `application:review` is in flight
 * @property {boolean} approvePending               approve is in flight
 * @property {boolean} rejectPending                reject is in flight
 * @property {(id: string) => void} selectRow       open the panel on a row, resetting the confirm step
 * @property {() => void} closePanel                close the panel and reset the confirm step
 * @property {() => Promise<void>} startReviewSelected
 * @property {() => Promise<void>} approveSelected
 * @property {() => Promise<void>} rejectSelected
 */

/**
 * The review panel's state and its three review verbs (start review, approve,
 * reject). Called from the page, so the selection and the confirm step survive
 * the list section re-rendering. Moved out of `BuyerSupplierApplications` by
 * the Phase 5 page split (no behaviour change: same state, same dispatches,
 * same toasts).
 * @param {SupplierApplication[]} applications the rows the page read
 * @returns {ApplicationReview}
 */
export const useApplicationReview = (applications) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();

  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [pending, setPending] = useState(/** @type {Pending} */ (null));
  const [reason, setReason] = useState('');

  const startReview = useApplicationStartReview();
  const approve = useApplicationApprove();
  const reject = useApplicationReject();

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId]
  );

  // WHO ACTS NEXT (S2a). `SupplierApplicationStatus` matches the machine
  // exactly, so `status` is the canonical state on this surface.
  const nextAct = useNextAct('supplierApplication', selected?.status);

  /** @param {string} id */
  const selectRow = (id) => {
    setSelectedId(id);
    setPending(null);
    setReason('');
  };

  const closePanel = () => {
    setSelectedId(null);
    setPending(null);
    setReason('');
  };

  /** The reason must be SUBSTANCE, not presence — the policy's mirror. */
  const canCommitReject = reason.trim().length > 0;

  const startReviewSelected = async () => {
    if (!selected || startReview.isPending) return;
    try {
      const result = await startReview.mutateAsync({ applicationId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.reviewFailed.title', {
            number: selected.applicationNumber
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.reviewStarted.title', {
          number: selected.applicationNumber
        }),
        description: t('applications.toast.reviewStarted.desc')
      });
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.reviewFailed.title', {
          number: selected.applicationNumber
        }),
        description: describeThrown(dataErrorText, e, t('applications.toast.actionFailed.desc'))
      });
    }
  };

  const approveSelected = async () => {
    if (!selected || approve.isPending) return;
    try {
      const result = await approve.mutateAsync({ applicationId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.approveFailed.title', {
            number: selected.applicationNumber
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.approved.title', {
          number: selected.applicationNumber
        }),
        description: t('applications.toast.approved.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.approveFailed.title', {
          number: selected.applicationNumber
        }),
        description: describeThrown(dataErrorText, e, t('applications.toast.actionFailed.desc'))
      });
    }
  };

  const rejectSelected = async () => {
    if (!selected || !canCommitReject || reject.isPending) return;
    try {
      const result = await reject.mutateAsync({
        applicationId: selected.id,
        rejectionReason: reason.trim()
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('applications.toast.rejectFailed.title', {
            number: selected.applicationNumber
          }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('applications.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('applications.toast.rejected.title', {
          number: selected.applicationNumber
        }),
        description: t('applications.toast.rejected.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('applications.toast.rejectFailed.title', {
          number: selected.applicationNumber
        }),
        description: describeThrown(dataErrorText, e, t('applications.toast.actionFailed.desc'))
      });
    }
  };

  return {
    selected,
    pending,
    setPending,
    reason,
    setReason,
    nextAct,
    canCommitReject,
    startReviewPending: startReview.isPending,
    approvePending: approve.isPending,
    rejectPending: reject.isPending,
    selectRow,
    closePanel,
    startReviewSelected,
    approveSelected,
    rejectSelected
  };
};
