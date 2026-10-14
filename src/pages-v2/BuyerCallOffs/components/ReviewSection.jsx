/** @import React from 'react' */
/** @import { PanelBodyProps } from './CallOffPanelBody' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';

/**
 * @typedef {Pick<PanelBodyProps, 'form' | 'setForm' | 'busy' | 'reviewHeld' | 'reviewAvailability' | 'run'> & { c: PanelBodyProps['view']['callOff'] }} ReviewSectionProps
 */

/**
 * REQ-E09-03 / BR-04 — the planner's review of a confirmation outside
 * tolerance: a comment, then reject (comment required) or approve. A seat
 * without `calloff:review` sees the handoff notice instead.
 * @type {React.FC<ReviewSectionProps>}
 */
const ReviewSection = ({ c, form, setForm, busy, reviewHeld, reviewAvailability, run }) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-2" data-testid="calloff-review">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.review.title')}</h3>
      {reviewHeld ? (
        <>
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
