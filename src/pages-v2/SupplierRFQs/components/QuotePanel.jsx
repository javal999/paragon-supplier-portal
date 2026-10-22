/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import TieredQuoteForm from '../../rfqs/TieredQuoteForm';
import { refusalItem } from '../../rfqs/tieredQuoteModel';
import { rfqResponseRefusal } from '../../rfqs/rfqResponseText';
import QuotePriceSection from './QuotePriceSection';
import QuoteTermsSection from './QuoteTermsSection';
import QuoteOnFileSection from './QuoteOnFileSection';
import QuoteNotesSection from './QuoteNotesSection';
import {
  DraftSaveState,
  ResponseProblemsBanner,
  SendBlockedReason
} from '../../rfx/ResponseFormState';
/** @import { QuoteSubmission } from '../hooks/useQuoteSubmission' */

/**
 * The quote side panel: the RFQ it is open on (material, quantity, deadline),
 * the revision note when a version is being superseded, and either the tiered
 * grid (a rebuilt RFQ with items) or the four-step single-price form, with
 * Cancel and Submit in the footer. Everything it reads and every handler it
 * calls comes from `submission` (`useQuoteSubmission`); the panel is open only
 * while `effectiveQuotePanelRFQ` is set, which is `null` for a seat without
 * `quotation:submit`.
 *
 * RFx UX 2026-10: the save state sits at the top of the body (S-01), the
 * banner lists every gap with a jump link to it, and Submit is off with the
 * count beside it while any gap stands (S-02).
 * @type {React.FC<{ submission: QuoteSubmission }>}
 */
const QuotePanel = ({ submission }) => {
  const { t } = useTranslation();
  const {
    effectiveQuotePanelRFQ,
    closeQuotePanel,
    form,
    setForm,
    tieredDraft,
    setTieredDraft,
    supersedes,
    gridRefusal,
    setGridRefusal,
    panelTiered,
    bidPrice,
    leadTime,
    moq,
    submitBlocked,
    problems,
    gridProblems,
    showMissing,
    savedAt,
    saveFailed,
    sampleDateQuestion,
    totalPrice,
    isSubmitting,
    submitQuote
  } = submission;
  return (
    <SidePanel
      open={effectiveQuotePanelRFQ !== null}
      onClose={closeQuotePanel}
      title={
        effectiveQuotePanelRFQ
          ? t('rfqs.panel.title', { rfq: effectiveQuotePanelRFQ.rfqNumber })
          : ''
      }
      // ⚠️ **THE FOOTER IS MOUNTED BY THE DERIVED VALUE, NOT BY `open`, BECAUSE
      //    `SidePanel` KEEPS ITS SUBTREE IN THE DOM WHEN CLOSED.** Closing is a
      //    `translate-x-full` plus `aria-hidden` — the overlay takes
      //    `pointer-events-none`, the `aside` does not — so a "closed" panel
      //    still holds a live, clickable submit button. Deriving `open=` alone
      //    would have moved the commit off-screen and called it gated, which is
      //    the same shape as gating one door out of three. The BODY below was
      //    already conditional; the footer now matches it.
      footerActions={
        effectiveQuotePanelRFQ ? (
          <>
            <Button variant="secondary" onClick={closeQuotePanel}>
              {t('rfqs.panel.cancel')}
            </Button>
            <SendBlockedReason count={problems.length} testId="quote-send-reason" />
            <Button
              variant="outline"
              icon={Send}
              // 2e-b-1 — disabled while an unreadable lead time stands, and
              // while a same-day acknowledgement is owed. `submitQuote` re-checks
              // both; this is the visible half of the same gate. S-02 — and
              // while any other gap stands, named in the banner above.
              disabled={isSubmitting || problems.length > 0 || (!panelTiered && submitBlocked)}
              onClick={submitQuote}
            >
              {isSubmitting ? t('rfqs.panel.submitting') : t('rfqs.panel.submit')}
            </Button>
          </>
        ) : undefined
      }
    >
      {effectiveQuotePanelRFQ && (
        <div className="space-y-5">
          <DraftSaveState savedAt={savedAt} failed={saveFailed} testId="quote-saved" />
          {/* An untouched blank does not nag on sight (the price precedent):
              the banner appears once the supplier has started; the count
              beside Submit says it from the start. */}
          {!!showMissing && <ResponseProblemsBanner problems={problems} testId="quote-problems" />}
          <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
            <div className="text-sm font-semibold text-text-primary">
              {effectiveQuotePanelRFQ.material}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              <span>
                {t('rfqs.card.qty')}{' '}
                <strong className="text-text-primary">{effectiveQuotePanelRFQ.qty}</strong>
              </span>
              <span>
                {t('rfqs.card.deadline')}{' '}
                <strong
                  className={
                    effectiveQuotePanelRFQ.daysRemaining <= 7 ? 'text-danger' : 'text-text-primary'
                  }
                >
                  {effectiveQuotePanelRFQ.deadlineText}
                </strong>{' '}
                <span data-testid="quote-panel-days-left">· {effectiveQuotePanelRFQ.daysLeft}</span>
              </span>
            </div>
          </section>

          {supersedes && (
            <p className="text-xs text-text-secondary" data-testid="quote-revision-note">
              {t('rfqResponse.quotes.revising', { quote: supersedes })}
            </p>
          )}
          {panelTiered && tieredDraft && (
            <>
              {gridRefusal && (
                <div
                  role="alert"
                  data-testid="grid-refusal"
                  className="text-sm text-danger border-l-2 border-danger pl-2"
                >
                  {rfqResponseRefusal(t, gridRefusal)}
                </div>
              )}
              <TieredQuoteForm
                rfq={effectiveQuotePanelRFQ.rfq}
                draft={tieredDraft}
                onChange={(next) => {
                  setTieredDraft(next);
                  setGridRefusal(null);
                }}
                flaggedItem={gridRefusal ? refusalItem(gridRefusal) : null}
                problems={gridProblems}
                showMissing={showMissing}
                sampleDateQuestion={sampleDateQuestion}
              />
            </>
          )}
          {!panelTiered && (
            <>
              <QuotePriceSection
                form={form}
                setForm={setForm}
                bidPrice={bidPrice}
                totalPrice={totalPrice}
              />
              <QuoteTermsSection
                form={form}
                setForm={setForm}
                leadTime={leadTime}
                moq={moq}
                showMissing={showMissing}
              />
              <QuoteOnFileSection />
              <QuoteNotesSection rfq={effectiveQuotePanelRFQ} form={form} setForm={setForm} />
            </>
          )}
        </div>
      )}
    </SidePanel>
  );
};

export default QuotePanel;
