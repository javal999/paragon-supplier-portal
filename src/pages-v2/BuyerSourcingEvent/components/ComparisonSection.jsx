/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { QuoteScore, ScoreStanding, ScoringOptions, ScoringOutcome } from '@lib/quoteScore' */
/** @import { RfqSupplierGateView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { useTranslation } from 'react-i18next';
import { EvaluationBreakSelect, TieredComparison } from '../../rfx/TieredRfq';
import ComparisonTable from './ComparisonTable';
import FxRefusalBanner from './FxRefusalBanner';
import FxBasisPanel from './FxBasisPanel';

/**
 * REQ-E03-05 AC-01 — the comparison section: its heading and basis notes, the
 * evaluation-break select on a tiered RFQ, then the refused / empty message or
 * the comparison table, the tie / decimal / none-qualified / single-bid notes,
 * and the tiered per-item comparison. Moved out of `BuyerSourcingEvent.jsx` by
 * the Phase 5 page split (no behaviour change).
 *
 * RFx UX B-02 (owner ruling 2026-10-19) — the FX arc moved here from the board's
 * side panel: a refused comparison now shows the bids, with "—" where the
 * scores were and the banner naming each currency (and, when stale, the rate's
 * date) above them, instead of one line in place of the table. Only what is
 * displayed changed — the scoring and the award verb's refusal are untouched.
 * The recorded basis per foreign currency, and the act to record or supersede a
 * rate, sit under the banner.
 * @type {React.FC<{
 *   rfq: RFQ;
 *   tiered: boolean;
 *   evalQty: number | null;
 *   setChosenBreak: (qty: number) => void;
 *   current: Quotation[];
 *   qualified: Quotation[];
 *   currency: RFQ['currency'];
 *   supplierName: (id: string) => string;
 *   supplierOtif: (id: string) => number | null;
 *   gateOf: (supplierId: string) => RfqSupplierGateView | undefined;
 *   qualifies: (supplierId: string) => boolean;
 *   reliabilityOf: (id: string) => number;
 *   scoringOpts: ScoringOptions;
 *   scoring: ScoringOutcome;
 *   scoreById: Map<string, QuoteScore>;
 *   bestId: string | null;
 *   standing: ScoreStanding;
 *   tied: boolean;
 *   foreignCurrencies: readonly BidCurrency[];
 *   onPin: (currency: BidCurrency) => void;
 *   reviewAvailability: VerbAvailability;
 *   onReview: (quotationId: string) => void;
 *   reviewPending: boolean;
 * }>}
 */
const ComparisonSection = ({
  rfq,
  tiered,
  evalQty,
  setChosenBreak,
  current,
  qualified,
  currency,
  supplierName,
  supplierOtif,
  gateOf,
  qualifies,
  reliabilityOf,
  scoringOpts,
  scoring,
  scoreById,
  bestId,
  standing,
  tied,
  foreignCurrencies,
  onPin,
  reviewAvailability,
  onReview,
  reviewPending
}) => {
  const { t } = useTranslation();
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary">{t('rfx.cmp.title')}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('rfx.cmp.basis')}</p>
        <p className="text-xs text-text-tertiary">{t('rfx.cmp.notAutomatic')}</p>
        {tiered && evalQty !== null && (
          <div className="mt-3">
            <EvaluationBreakSelect rfq={rfq} value={evalQty} onChange={setChosenBreak} />
          </div>
        )}
        {scoring.kind === 'refused' && (
          <FxRefusalBanner rfq={rfq} reason={scoring.reason} currencies={scoring.currencies} />
        )}
        {/* 2e-c-4 — the recorded basis, whenever a foreign bid exists —
            including while the comparison is refused, which is exactly when
            a buyer needs to see what is missing and act on it. */}
        {foreignCurrencies.length > 0 && (
          <div className="mt-3">
            <FxBasisPanel currencies={foreignCurrencies} pins={rfq.fxPins} onPin={onPin} t={t} />
          </div>
        )}
      </div>
      {current.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-text-tertiary" data-testid="cmp-empty">
          {t('rfx.cmp.empty')}
        </p>
      ) : (
        <ComparisonTable
          rfq={rfq}
          tiered={tiered}
          evalQty={evalQty}
          current={current}
          currency={currency}
          supplierName={supplierName}
          supplierOtif={supplierOtif}
          gateOf={gateOf}
          qualifies={qualifies}
          scoreById={scoreById}
          bestId={bestId}
          standing={standing}
          tied={tied}
          reviewAvailability={reviewAvailability}
          onReview={onReview}
          reviewPending={reviewPending}
        />
      )}
      {(standing.oneDecimal || tied) && current.length > 0 && (
        <p
          className="px-4 py-2 text-xs text-text-tertiary"
          data-testid={tied ? 'cmp-tie-note' : 'cmp-decimal-note'}
        >
          {t(tied ? 'rfx.cmp.tieNote' : 'rfx.cmp.decimalNote')}
        </p>
      )}
      {current.length > 0 && qualified.length === 0 && scoring.kind === 'scored' && (
        <p className="px-4 py-2 text-xs text-warning-hover" data-testid="cmp-none-qualified">
          {t('rfx.gate.noneQualified')}
        </p>
      )}
      {current.length === 1 && (
        <p className="px-4 py-2 text-xs text-text-tertiary" data-testid="cmp-single">
          {t('rfx.cmp.single')}
        </p>
      )}
      {/* RFx UX 1C (B-01) — the per-item, per-break tables fold behind the
          summary above; the buyer opens them with "Show every break". */}
      {tiered && evalQty !== null && current.length > 0 && (
        <details className="p-4 border-t border-border-subtle" data-testid="cmp-every-break">
          <summary className="cursor-pointer text-sm text-action-hover">
            {t('rfx.cmp.showEveryBreak')}
          </summary>
          <div className="mt-3">
            <TieredComparison
              rfq={rfq}
              quotes={current}
              evalQty={evalQty}
              qualifies={qualifies}
              gateOf={gateOf}
              supplierName={supplierName}
              reliabilityOf={reliabilityOf}
              scoringOpts={scoringOpts}
            />
          </div>
        </details>
      )}
    </section>
  );
};

export default ComparisonSection;
