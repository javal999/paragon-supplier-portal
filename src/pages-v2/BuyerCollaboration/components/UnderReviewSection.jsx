/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RequirementResponse } from '@services/sdc' */
/** @import { useAcceptRequirementResponse } from '@services/query/sdcBuyerHooks' */
/** @import { CoverageRow } from '../const' */
/** @import { useOutcomeOf } from '../hooks/useOutcomeOf' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { CHIP_INFO, DISPUTE_VERB } from '../const';
import { offers, responseOf, supplierName } from '../utils';

/**
 * Responses under review: accept or dispute. One handoff notice per verb, then
 * one line per response with an accept CTA (fires the accept mutation) and a
 * dispute CTA (opens the page's dispute capture via `setDisputing` and clears
 * `setObjection`), each shown only when the seat holds that verb.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change). The capture state stays on the page.
 * @type {React.FC<{
 *   underReviewRows: CoverageRow[];
 *   acceptAvailability: VerbAvailability;
 *   disputeAvailability: VerbAvailability;
 *   acceptMutation: ReturnType<typeof useAcceptRequirementResponse>;
 *   outcomeOf: ReturnType<typeof useOutcomeOf>;
 *   setDisputing: (row: CoverageRow | null) => void;
 *   setObjection: (objection: string) => void;
 * }>}
 */
const UnderReviewSection = ({
  underReviewRows,
  acceptAvailability,
  disputeAvailability,
  acceptMutation,
  outcomeOf,
  setDisputing,
  setObjection
}) => {
  const { t } = useTranslation();

  return (
    <section className="mb-8" data-testid="sdc-under-review">
      <h2 className="mb-1 text-base font-semibold text-text-primary">
        {t('sdc.underReview.title')}
      </h2>
      <p className="mb-3 text-sm text-text-secondary">{t('sdc.underReview.subtitle')}</p>
      <div className="mb-3 flex flex-col gap-2">
        <HandoffNotice availability={acceptAvailability} testId="handoff-sdc-accept" />
        <HandoffNotice availability={disputeAvailability} testId="handoff-sdc-dispute" />
      </div>
      {underReviewRows.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sdc.underReview.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {underReviewRows.map((row) => {
            const response = /** @type {RequirementResponse} */ (responseOf(row.state));
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
              >
                <span className={CHIP_INFO}>{t('sdc.underReview.chip')}</span>
                <span className="font-medium text-text-primary">
                  {supplierName(row.line.supplierId)}
                </span>
                <Data className="text-xs">{row.line.materialCode}</Data>
                <Data className="text-xs">{row.line.periodBucket}</Data>
                <Data className="text-xs text-text-tertiary">{response.id}</Data>
                <span className="ml-auto flex items-center gap-2">
                  {acceptAvailability.kind === 'held' && (
                    <button
                      type="button"
                      data-testid="sdc-accept-cta"
                      disabled={acceptMutation.isPending}
                      title={t('sdc.accept.ctaTitle', {
                        material: row.line.materialCode,
                        period: row.line.periodBucket
                      })}
                      onClick={() =>
                        acceptMutation.mutate(
                          { responseId: response.id, supplierId: response.supplierId },
                          outcomeOf(row, response, 'accept')
                        )
                      }
                      className="rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft disabled:opacity-50"
                    >
                      {t('sdc.accept.cta')}
                    </button>
                  )}
                  {disputeAvailability.kind === 'held' && offers(DISPUTE_VERB, response.status) && (
                    <button
                      type="button"
                      data-testid="sdc-dispute-cta"
                      title={t('sdc.dispute.ctaTitle', {
                        material: row.line.materialCode,
                        period: row.line.periodBucket
                      })}
                      onClick={() => {
                        setDisputing(row);
                        setObjection('');
                      }}
                      className="rounded-md border border-border-subtle bg-transparent px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                    >
                      {t('sdc.dispute.cta')}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default UnderReviewSection;
