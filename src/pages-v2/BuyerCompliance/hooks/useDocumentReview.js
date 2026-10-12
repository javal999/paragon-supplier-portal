import { useState } from 'react';
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
import { useSupplierDocumentVerify, useSupplierDocumentReject } from '@services/query/commandHooks';
import { useVerbAvailabilities } from '@hooks/useVerbAvailability';

/**
 * The review queue's verify / reject half (§82): each verb's availability, the
 * row whose reject form stands open, its reason, the row a command is running
 * on, and the two runners that dispatch the verbs and toast the outcome. Called
 * by the page, not by `ReviewQueue`, so the open form and its reason survive
 * the queue section unmounting when it empties (behaviour of the unsplit page).
 * @param {TFunction} t  The page's translator, for the toasts.
 * @param {(reason: string | undefined) => string | null} refusalText  The page's refusal glossary (`useRefusalText()`).
 * @param {UseToastReturn['toast']} toast  The page's toast function.
 */
export function useDocumentReview(t, refusalText, toast) {
  // ⚠️ ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT (§76). Verify and reject are
  // separate atoms and are co-reachable on the same row, so each carries its own.
  const review = useVerbAvailabilities(
    /** @type {const} */ ({
      verify: 'supplierdoc:verify',
      reject: 'supplierdoc:reject'
    })
  );
  const verifyDoc = useSupplierDocumentVerify();
  const rejectDoc = useSupplierDocumentReject();
  const [rejecting, setRejecting] = useState(/** @type {string | null} */ (null));
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));

  /**
   * ⚠️ **THE OUTCOME IS READ FROM THE RESULT, NEVER ASSUMED FROM THE CALL.**
   * `CommandResult.status` can be `failed` — a refusal rendered as a success is
   * the defect this whole batch exists to remove, and reproducing it in the
   * review half would be the same lie facing the other way.
   * @param {string} docId
   */
  const runVerify = async (docId) => {
    setBusyId(docId);
    try {
      const result = await verifyDoc.mutateAsync({ docId });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.queue.toast.failed'),
          description: refusalText(result.reason) ?? result.reason
        });
        return;
      }
      toast({ variant: 'success', title: t('compliance.queue.toast.verified') });
    } finally {
      setBusyId(null);
    }
  };

  /** @param {string} docId */
  const runReject = async (docId) => {
    setBusyId(docId);
    try {
      const result = await rejectDoc.mutateAsync({
        docId,
        rejectionReason: rejectReason.trim()
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('compliance.queue.toast.failed'),
          description: refusalText(result.reason) ?? result.reason
        });
        return;
      }
      setRejecting(null);
      setRejectReason('');
      // The supplier sees the reason and the timestamp on their own documents
      // page (§80) — this toast says the refusal was recorded, and says where it
      // went, rather than implying it vanished into a queue.
      toast({
        variant: 'success',
        title: t('compliance.queue.toast.rejected'),
        description: t('compliance.queue.toast.rejectedDesc')
      });
    } finally {
      setBusyId(null);
    }
  };

  return {
    review,
    rejecting,
    setRejecting,
    rejectReason,
    setRejectReason,
    busyId,
    runVerify,
    runReject
  };
}
