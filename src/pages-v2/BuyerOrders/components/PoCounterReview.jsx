/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { usePurchaseOrderAcceptCounter, usePurchaseOrderRejectCounter } from '@services/query/commandHooks' */
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * @typedef {object} PoCounterReviewProps
 * @property {PurchaseOrder} selectedPO  The PO the panel was opened on.
 * @property {PurchaseOrder | null} livePO  The same PO's live row; the review acts on it.
 * @property {ReturnType<typeof useVerbAvailability>} reviewAvailability  Whether this seat holds `po:review-response`.
 * @property {boolean} reviewRejecting  Whether the reject-with-comment form is open.
 * @property {(v: boolean) => void} setReviewRejecting
 * @property {string} reviewComment  The rejection comment.
 * @property {(v: string) => void} setReviewComment
 * @property {ReturnType<typeof usePurchaseOrderAcceptCounter>} acceptCounter
 * @property {ReturnType<typeof usePurchaseOrderRejectCounter>} rejectCounter
 * @property {(po: PurchaseOrder, titleKey: string) => {
 *   onSuccess: (result: { status: string; reason?: string }) => void;
 *   onError: () => void;
 * }} reviewOutcome  The toast + reset callbacks for a review command.
 * @property {TFunction} t
 */

/**
 * The counter-offer review section of an adjusted PO: the hand-off notice when
 * this seat does not hold the verb, else accept / reject, and the
 * reject-with-comment form. Moved out of `BuyerOrders.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<PoCounterReviewProps>}
 */
const PoCounterReview = ({
  selectedPO,
  livePO,
  reviewAvailability,
  reviewRejecting,
  setReviewRejecting,
  reviewComment,
  setReviewComment,
  acceptCounter,
  rejectCounter,
  reviewOutcome,
  t
}) => (
  <section data-testid="po-counter-review">
    <h3 className="text-label text-text-tertiary uppercase mb-3">{t('oc.review.title')}</h3>
    {reviewAvailability.kind !== 'held' ? (
      <HandoffNotice availability={reviewAvailability} testId="handoff-po-review-response" />
    ) : !reviewRejecting ? (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={acceptCounter.isPending}
          onClick={() => {
            const po = livePO ?? selectedPO;
            acceptCounter.mutate({ poId: po.id }, reviewOutcome(po, 'oc.toast.accepted.title'));
          }}
        >
          {t('oc.review.accept')}
        </Button>
        <Button variant="secondary" onClick={() => setReviewRejecting(true)}>
          {t('oc.review.reject')}
        </Button>
      </div>
    ) : (
      <div className="space-y-2">
        <label
          className="block text-label text-text-tertiary uppercase"
          htmlFor="po-review-comment"
        >
          {t('oc.review.comment')}
        </label>
        <textarea
          id="po-review-comment"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action min-h-[72px]"
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setReviewRejecting(false)}>
            {t('oc.action.back')}
          </Button>
          <Button
            variant="outline"
            disabled={rejectCounter.isPending || !reviewComment.trim()}
            onClick={() => {
              const po = livePO ?? selectedPO;
              rejectCounter.mutate(
                { poId: po.id, reviewComment: reviewComment.trim() },
                reviewOutcome(po, 'oc.toast.reopened.title')
              );
            }}
          >
            {t('oc.review.sendReject')}
          </Button>
        </div>
      </div>
    )}
  </section>
);

export default PoCounterReview;
