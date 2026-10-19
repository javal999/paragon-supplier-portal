// ────────────────────────────────────────────────────────────────────────────
// The FX refusal, stated ABOVE the comparison it applies to (2e-c-3). Moved
// from the side panel's `QuoteComparison` to the event page by RFx UX B-02
// (owner ruling 2026-10-19). The bids are still shown (they are facts the
// supplier stated); what is withheld is the RANKING, because ranking them would
// mean comparing prices in currencies with no recorded basis. Names the
// currencies, so the buyer knows exactly which rate to record.
//
// `FX_REFUSAL_KEY` lives HERE, beside the refusal it renders, because GL-1's
// chip-coverage guard pairs a message map's uses with its declaration in one
// file.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { FxRefusalReason } from '@lib/fxPin' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { useTranslation } from 'react-i18next';
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { formatDate } from '@lib/format';
import { effectivePin } from '@lib/fxPin';

// ── CP-0 · 2e-c-6 — every named cause has a translation, by construction ─────
//
// An EXACT map, the same shape and for the same reason as `RFQ_QTY_REFUSAL_KEY`
// (in `WizardScopeStep.jsx`): `Record<Reason, string>` makes a reason with no
// key a COMPILE error rather than a rendering defect. The parity guard in
// `fragments.test.js` then checks the ID key is really there. The sibling maps
// are `FX_RATE_REFUSAL_KEY` / `FX_VINTAGE_REFUSAL_KEY` (`FxPinDialog.jsx`),
// `FX_PIN_SOURCE_KEY` (`FxBasisPanel.jsx`) and `SPREAD_SILENT_KEY`
// (`ComparisonParts.jsx`).
/** @type {Record<FxRefusalReason, string>} */
export const FX_REFUSAL_KEY = {
  FX_UNPINNED: 'sourcing.cmp.fx.refused.FX_UNPINNED',
  FX_STALE: 'sourcing.cmp.fx.refused.FX_STALE'
};

/**
 * The refusal banner: the reason, every currency that needs a rate, and — for
 * a STALE refusal — the vintage it is judging.
 * @type {React.FC<{ rfq: RFQ; reason: FxRefusalReason; currencies: readonly BidCurrency[] }>}
 */
const FxRefusalBanner = ({ rfq, reason, currencies }) => {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      data-testid="fx-refusal"
      className="mt-3 text-xs text-warning-hover bg-warning-soft border border-warning rounded-md px-3 py-2"
    >
      {t(FX_REFUSAL_KEY[reason], {
        currencies: currencies.join(', '),
        // 2e-c-4 — a STALE refusal names the vintage it is judging. Empty for
        // FX_UNPINNED, where no pin exists to have a vintage; that message does
        // not interpolate it.
        asOf: currencies
          .map((c) => effectivePin(rfq.fxPins, c)?.asOf)
          .filter(Boolean)
          .map((d) => formatDate(/** @type {string} */ (d)))
          .join(', ')
      })}{' '}
      <GlossaryTermChip refTo={{ sourceType: 'FxRefusalReason', term: reason }} />
    </div>
  );
};

export default FxRefusalBanner;
