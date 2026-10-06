/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
/** @import { SubmittedQuote } from '../utils' */

/**
 * The "My quotes" tab: each of the supplier's own quotation versions with its
 * status and stated terms (no score, no rank — 3b-C), and a Revise action on a
 * version that can still be revised (or the handoff notice for a seat without
 * `quotation:submit`). `onRevise` opens the quote panel on that version.
 *
 * `canRevise`:  Whether a version can still be revised: current, and its RFQ still open.
 * @type {React.FC<{ quotes: SubmittedQuote[]; canRevise: (q: SubmittedQuote) => boolean; onRevise: (q: SubmittedQuote) => void; }>}
 */
const MyQuotesTab = ({ quotes, canRevise, onRevise }) => {
  const { t } = useTranslation();
  const quoteAvailability = useVerbAvailability('quotation:submit');

  if (quotes.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.quotes.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.quotes.emptyBody')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {quotes.map((q) => (
        <div
          key={q.quoteNumber}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">{q.rfqNumber}</Data>
                <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                  {q.quoteNumber}
                </Data>
              </div>
              <div className="text-base font-semibold text-text-primary mt-1">{q.material}</div>
            </div>
            {/* Status only — a competitive score/rank needs the sibling set that
                per-supplier scoping hides (3b-C); the supplier never sees it. */}
            <div className="flex items-center gap-2">
              {!q.current && (
                <StatusPill variant="neutral">{t('rfqResponse.quotes.superseded')}</StatusPill>
              )}
              <StatusPill variant="neutral">{q.status}</StatusPill>
              {/* RFx spec — revising before the deadline mints a new version
                  that names this one; every version is kept (AC-03). */}
              {canRevise(q) &&
                (quoteAvailability.kind === 'held' ? (
                  <Button
                    variant="outline"
                    data-testid={`revise-${q.quoteNumber}`}
                    onClick={() => onRevise(q)}
                  >
                    {t('rfqResponse.quotes.revise')}
                  </Button>
                ) : (
                  <HandoffNotice
                    availability={quoteAvailability}
                    testId="handoff-quotation-submit"
                  />
                ))}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              { label: t('rfqs.quotes.col.quoteNo'), value: q.quoteNumber },
              { label: t('rfqs.quotes.col.submitted'), value: q.submittedDate },
              { label: t('rfqs.quotes.col.unitPrice'), value: q.unitPrice },
              { label: t('rfqs.quotes.col.totalPrice'), value: q.totalPrice },
              { label: t('rfqs.quotes.col.leadTime'), value: q.leadTime },
              // 2e-b-2 — the minimum order quantity appears here for the first
              // time. It was collected on the form and dropped before this card
              // existed, so the supplier's own record of their quote silently
              // omitted a term they had stated.
              { label: t('rfqs.quotes.col.moq'), value: q.moq },
              { label: t('rfqs.quotes.col.validUntil'), value: q.validUntil }
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">{d.label}</dt>
                <Data as="dd" className="text-sm font-semibold text-text-primary">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default MyQuotesTab;
