/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RequirementResponse } from '@services/sdc' */
/** @import { CoverageRow } from '../const' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { CHIP_WARNING } from '../const';
import { responseOf, supplierName } from '../utils';

/**
 * Disputes awaiting resolution: the seat's handoff notice, then one line per
 * disputed response with a resolve CTA when the seat holds the verb, or a
 * "none" note. The CTA opens the page's resolve capture (`setResolving`) and
 * clears its text (`setAnswer`).
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change). The capture state stays on the page.
 * @type {React.FC<{
 *   disputedRows: CoverageRow[];
 *   resolveAvailability: VerbAvailability;
 *   setResolving: (row: CoverageRow | null) => void;
 *   setAnswer: (answer: string) => void;
 * }>}
 */
const DisputesSection = ({ disputedRows, resolveAvailability, setResolving, setAnswer }) => {
  const { t } = useTranslation();

  return (
    <section className="mb-8" data-testid="sdc-disputes">
      <h2 className="mb-1 text-base font-semibold text-text-primary">{t('sdc.disputes.title')}</h2>
      <p className="mb-3 text-sm text-text-secondary">{t('sdc.disputes.subtitle')}</p>
      <div className="mb-3">
        <HandoffNotice availability={resolveAvailability} testId="handoff-sdc-resolve" />
      </div>
      {disputedRows.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sdc.disputes.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {disputedRows.map((row) => {
            const response = /** @type {RequirementResponse} */ (responseOf(row.state));
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
              >
                <span className={CHIP_WARNING}>{t('sdc.resolve.raised')}</span>
                <span className="font-medium text-text-primary">
                  {supplierName(row.line.supplierId)}
                </span>
                <Data className="text-xs">{row.line.materialCode}</Data>
                <Data className="text-xs">{row.line.periodBucket}</Data>
                <Data className="text-xs text-text-tertiary">{response.id}</Data>
                {resolveAvailability.kind === 'held' && (
                  <button
                    type="button"
                    data-testid="sdc-resolve-cta"
                    title={t('sdc.resolve.ctaTitle', {
                      material: row.line.materialCode,
                      period: row.line.periodBucket
                    })}
                    onClick={() => {
                      setResolving(row);
                      setAnswer('');
                    }}
                    className="ml-auto rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft"
                  >
                    {t('sdc.resolve.cta')}
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

export default DisputesSection;
