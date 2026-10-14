/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { QuoteScore, ScoreStanding, ScoringOptions, ScoringOutcome } from '@lib/quoteScore' */
/** @import { RfqSupplierGateView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import { EvaluationBreakSelect, TieredComparison } from '../../rfx/TieredRfq';
import ComparisonTable from './ComparisonTable';

/**
 * REQ-E03-05 AC-01 — the comparison section: its heading and basis notes, the
 * evaluation-break select on a tiered RFQ, then the refused / empty message or
 * the comparison table, the tie / decimal / none-qualified / single-bid notes,
 * and the tiered per-item comparison. Moved out of `BuyerSourcingEvent.jsx` by
 * the Phase 5 page split (no behaviour change).
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
  tied
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
      </div>
      {scoring.kind === 'refused' ? (
        <p className="px-4 py-8 text-center text-sm text-warning-hover" data-testid="cmp-refused">
          {t('rfx.cmp.refused')}
        </p>
      ) : current.length === 0 ? (
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
      {tiered && evalQty !== null && current.length > 0 && (
        <div className="p-4 border-t border-border-subtle">
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
      )}
    </section>
  );
};

export default ComparisonSection;
