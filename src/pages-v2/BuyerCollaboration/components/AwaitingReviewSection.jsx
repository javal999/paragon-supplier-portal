/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RequirementResponse } from '@services/sdc' */
/** @import { useReviewRequirementResponse } from '@services/query/sdcBuyerHooks' */
/** @import { CoverageRow } from '../const' */
/** @import { useOutcomeOf } from '../hooks/useOutcomeOf' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { CHIP_INFO } from '../const';
import { responseOf, supplierName } from '../utils';

/**
 * Responses awaiting review (`t_requirementresponse_review`): the seat's
 * handoff notice, then one line per submitted response with a review CTA when
 * the seat holds the verb, or a "none" note. The CTA fires the review mutation
 * with the page's shared outcome handling.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{
 *   awaitingReviewRows: CoverageRow[];
 *   reviewAvailability: VerbAvailability;
 *   reviewMutation: ReturnType<typeof useReviewRequirementResponse>;
 *   outcomeOf: ReturnType<typeof useOutcomeOf>;
 * }>}
 */
const AwaitingReviewSection = ({
  awaitingReviewRows,
  reviewAvailability,
  reviewMutation,
  outcomeOf
}) => {
  const { t } = useTranslation();

  return (
    <section className="mb-8" data-testid="sdc-awaiting-review">
      <h2 className="mb-1 text-base font-semibold text-text-primary">{t('sdc.review.title')}</h2>
      <p className="mb-3 text-sm text-text-secondary">{t('sdc.review.subtitle')}</p>
      <div className="mb-3">
        <HandoffNotice availability={reviewAvailability} testId="handoff-sdc-review" />
      </div>
      {awaitingReviewRows.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sdc.review.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {awaitingReviewRows.map((row) => {
            const response = /** @type {RequirementResponse} */ (responseOf(row.state));
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
              >
                <span className={CHIP_INFO}>{t('sdc.review.submitted')}</span>
                <span className="font-medium text-text-primary">
                  {supplierName(row.line.supplierId)}
                </span>
                <Data className="text-xs">{row.line.materialCode}</Data>
                <Data className="text-xs">{row.line.periodBucket}</Data>
                <Data className="text-xs text-text-tertiary">{response.id}</Data>
                {reviewAvailability.kind === 'held' && (
                  <button
                    type="button"
                    data-testid="sdc-review-cta"
                    disabled={reviewMutation.isPending}
                    title={t('sdc.review.ctaTitle', {
                      material: row.line.materialCode,
                      period: row.line.periodBucket
                    })}
                    onClick={() =>
                      reviewMutation.mutate(
                        { responseId: response.id, supplierId: response.supplierId },
                        outcomeOf(row, response, 'review')
                      )
                    }
                    className="ml-auto rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft disabled:opacity-50"
                  >
                    {t('sdc.review.cta')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AwaitingReviewSection;
