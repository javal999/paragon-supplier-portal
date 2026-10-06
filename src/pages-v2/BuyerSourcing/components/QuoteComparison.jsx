// ────────────────────────────────────────────────────────────────────────────
// The side panel's comparison section: the quote count, the evaluation break
// on a tiered RFQ, the FX refusal when the ranking is withheld, the recorded
// FX basis, and the comparison table (or its empty state). Moved out of
// `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
//
// `FX_REFUSAL_KEY` lives HERE, beside the refusal it renders, because GL-1's
// chip-coverage guard pairs a message map's uses with its declaration in one
// file.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { FxRefusalReason } from '@lib/fxPin' */
/** @import { PinDraft } from '../const' */
import { Link } from 'react-router-dom';
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { formatDate } from '@lib/format';
import { effectivePin } from '@lib/fxPin';
import { blankPinDraft } from '../utils';
import FxBasisPanel from './FxBasisPanel';
import ComparisonTable from './ComparisonTable';

// ── CP-0 · 2e-c-6 — every named cause has a translation, by construction ─────
//
// The arc's five user-facing reason strings were all looked up by CONCATENATION
// (`t(\`sourcing.fx.refused.${reason}\`)`), which means nothing could tell that a
// reason had no key: a new refusal ships, and the buyer reads the raw key on
// screen — in both languages equally. An i18n sweep that only checks today's
// keys is a sweep that has to be run again every time a reason is added.
//
// These are EXACT maps, the same shape and for the same reason as
// `RFQ_QTY_REFUSAL_KEY` (in `WizardScopeStep.jsx`): `Record<Reason, string>`
// makes a reason with no key a COMPILE error rather than a rendering defect.
// Widening any of these unions now fails the build until the EN and ID strings
// exist. The parity guard in `fragments.test.js` then does the other half —
// that the ID key is really there, and interpolates the same variables. The
// sibling maps are `FX_RATE_REFUSAL_KEY` / `FX_VINTAGE_REFUSAL_KEY`
// (`FxPinDialog.jsx`), `FX_PIN_SOURCE_KEY` (`FxBasisPanel.jsx`) and
// `SPREAD_SILENT_KEY` (`ComparisonParts.jsx`).
/** @type {Record<FxRefusalReason, string>} */
export const FX_REFUSAL_KEY = {
  FX_UNPINNED: 'sourcing.cmp.fx.refused.FX_UNPINNED',
  FX_STALE: 'sourcing.cmp.fx.refused.FX_STALE'
};

/**
 * @typedef {object} QuoteComparisonProps
 * @property {RFQ} selectedRfq
 * @property {React.ComponentProps<typeof ComparisonTable>['comparison']} comparison
 * @property {Map<string, string>} supplierNameById
 * @property {React.ComponentProps<typeof ComparisonTable>['reviewAvailability']} reviewAvailability
 * @property {(quotationId: string) => void} handleReview
 * @property {boolean} reviewPending
 * @property {(d: PinDraft) => void} setPinDraft Opens the FX-pin dialog for a currency.
 * @property {TFunction} t
 */

/**
 * The comparison section of the side panel.
 * @type {React.FC<QuoteComparisonProps>}
 */
const QuoteComparison = ({
  selectedRfq,
  comparison,
  supplierNameById,
  reviewAvailability,
  handleReview,
  reviewPending,
  setPinDraft,
  t
}) => {
  const { quotesForSelected, panelEvalQty, scoring, foreignCurrencies } = comparison;
  return (
    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t(quotesForSelected.length === 1 ? 'sourcing.cmp.title.one' : 'sourcing.cmp.title.other', {
          count: quotesForSelected.length
        })}
      </h3>
      {panelEvalQty !== null && (
        <p className="mb-3 text-xs text-text-secondary" data-testid="panel-eval-break">
          {t('rfqCompare.panel.atBreak', { qty: panelEvalQty.toLocaleString('en-US') })}{' '}
          <Link
            to={`/buyer/rfq/${selectedRfq.id}`}
            className="text-action hover:underline"
            data-testid="panel-compare-by-break"
          >
            {t('rfqCompare.panel.compareByBreak')}
          </Link>
        </p>
      )}
      {/* 2e-c-3 — the refusal, stated ABOVE the table it applies to.
          The bids are still shown (they are facts the supplier stated);
          what is withheld is the RANKING, because ranking them would
          mean comparing prices in currencies with no recorded basis.
          Names the currencies, so the buyer knows exactly which pin to
          record rather than being told something is wrong. */}
      {scoring.kind === 'refused' && (
        <div
          role="status"
          data-testid="fx-refusal"
          className="mb-3 text-xs text-warning-hover bg-warning-soft border border-warning rounded-md px-3 py-2"
        >
          {t(FX_REFUSAL_KEY[scoring.reason], {
            currencies: scoring.currencies.join(', '),
            // 2e-c-4 — a STALE refusal names the vintage it is judging.
            // "Too old" without saying how old leaves the buyer unable
            // to tell a rate from this morning apart from one from
            // January. Empty for FX_UNPINNED, where no pin exists to
            // have a vintage; that message does not interpolate it.
            asOf: scoring.currencies
              .map((c) => effectivePin(selectedRfq.fxPins, c)?.asOf)
              .filter(Boolean)
              .map((d) => formatDate(/** @type {string} */ (d)))
              .join(', ')
          })}{' '}
          <GlossaryTermChip refTo={{ sourceType: 'FxRefusalReason', term: scoring.reason }} />
        </div>
      )}
      {/* 2e-c-4 — THE RECORDED BASIS, on screen. A buyer must be able to
          answer "what rate ranked this comparison, and how old is it?"
          from the surface, not from an audit query. Rendered whenever a
          foreign bid exists — including while the comparison is refused,
          because that is exactly when a buyer needs to see what is
          missing and act on it. */}
      {foreignCurrencies.length > 0 && (
        <FxBasisPanel
          currencies={foreignCurrencies}
          pins={selectedRfq.fxPins}
          onPin={(/** @type {BidCurrency} */ c) =>
            setPinDraft(blankPinDraft(c, effectivePin(selectedRfq.fxPins, c)))
          }
          t={t}
        />
      )}
      {quotesForSelected.length === 0 ? (
        <div className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
          {t('sourcing.cmp.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          {/* RFQ-DRAWER-01: one horizontally-scrolling table, no sticky
              criterion column. The criterion (row-header) column and the
              quote columns each carry a min-width and scroll together, so
              they can never overlap — the pinned column previously
              collided with the first quote and clipped its composite dial
              (position:sticky + border-collapse). */}
          <ComparisonTable
            selectedRfq={selectedRfq}
            comparison={comparison}
            supplierNameById={supplierNameById}
            reviewAvailability={reviewAvailability}
            handleReview={handleReview}
            reviewPending={reviewPending}
            t={t}
          />
        </div>
      )}
    </section>
  );
};

export default QuoteComparison;
