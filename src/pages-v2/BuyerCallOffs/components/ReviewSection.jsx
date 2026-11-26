/** @import React from 'react' */
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { CallOffForm } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';
import PairFacts from '../../orders/PairFacts';

/**
 * @typedef {object} ReviewSectionProps
 * @property {CallOffView['callOff']} c The call-off under review.
 * @property {CallOffForm} form The page's call-off form; its `comment` is the review comment.
 * @property {(f: CallOffForm) => void} setForm
 * @property {boolean} busy A call-off command is in flight.
 * @property {boolean} reviewHeld Whether the seat holds `calloff:review`; otherwise the handoff notice shows.
 * @property {ReturnType<typeof useVerbAvailability>} reviewAvailability
 * @property {(vars: CallOffCommandVars, success: string, close?: boolean) => Promise<boolean>} run
 */

/**
 * BR-04 — the planner's review of a confirmation outside tolerance: approve,
 * or reject with a comment. Rendered by the panel only while the call-off
 * awaits approval. Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<ReviewSectionProps>}
 */
const ReviewSection = ({ c, form, setForm, busy, reviewHeld, reviewAvailability, run }) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-2" data-testid="calloff-review">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.review.title')}</h3>
      {reviewHeld ? (
        <>
          {/* UCX-P7 · UCX-F16 — the figures that decide the approval. */}
          <div className="mb-2" data-testid="calloff-review-facts">
            <PairFacts supplierId={c.supplierId} materialCode={c.materialCode} />
          </div>
          <p className="text-sm text-text-secondary">{t('co.review.intro')}</p>
          <label htmlFor="co-review-comment" className={labelClass}>
            {t('co.review.comment')}
          </label>
          <textarea
            id="co-review-comment"
            rows={3}
            className={inputClass}
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              disabled={busy || form.comment.trim() === ''}
              onClick={() =>
                void run(
                  { verb: 'rejectConfirmation', id: c.id, reviewComment: form.comment.trim() },
                  t('co.toast.confirmationRejected')
                )
              }
            >
              {t('co.review.reject')}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run({ verb: 'approve', id: c.id }, t('co.toast.approved'))}
            >
              {t('co.review.approve')}
            </Button>
          </div>
        </>
      ) : (
        <HandoffNotice availability={reviewAvailability} testId="handoff-calloff-review" />
      )}
    </section>
  );
};

export default ReviewSection;
