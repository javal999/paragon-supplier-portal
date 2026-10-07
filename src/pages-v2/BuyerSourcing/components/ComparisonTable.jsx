// ────────────────────────────────────────────────────────────────────────────
// The side panel's quote-comparison table: one column per quote, one row per
// criterion, the top-ranked column highlighted, and the per-quote result or
// review move. Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no
// behaviour change).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { useQuoteComparison } from '../hooks/useQuoteComparison' */
import { Trophy } from 'lucide-react';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import StatusPill from '@components/ui-v2/StatusPill';
import ScoreBadge from '@components/ui-v2/ScoreBadge';
import Data from '@components/ui-v2/Data';
import { formatMoney, formatNumber } from '@lib/format';
import { AXIS_LIVENESS, COMPOSITE_LIVENESS } from '@lib/quoteScore';
import { spreadForQuote } from '@lib/shouldCostSpread';
import { GateMarker } from '../../rfx/rfxDisplay';
import { SPREAD_DEPS } from '../const';
import { ComparisonCell, ComparisonRow, ScoreOrSilence, SpreadCell } from './ComparisonParts';

/**
 * @typedef {ReturnType<typeof useQuoteComparison>} QuoteComparisonModel
 * @typedef {object} ComparisonTableProps
 * @property {RFQ} selectedRfq
 * @property {QuoteComparisonModel} comparison The quotes, their scores and the top-ranked id.
 * @property {Map<string, string>} supplierNameById
 * @property {VerbAvailability} reviewAvailability The seat's `quotation:review`.
 * @property {(quotationId: string) => void} handleReview Move a submitted quote to review.
 * @property {boolean} reviewPending Whether a review dispatch is in flight.
 * @property {TFunction} t
 */

/**
 * The table's head row: one header per quote, the top-ranked one marked.
 * @type {React.FC<Pick<ComparisonTableProps, 'comparison' | 'supplierNameById' | 't'>>}
 */
const ComparisonHead = ({ comparison, supplierNameById, t }) => (
  <thead>
    <tr>
      <th className="text-left px-2 py-2 font-semibold text-text-tertiary uppercase tracking-wider align-bottom w-36 min-w-[9rem]">
        {t('sourcing.cmp.criterion')}
      </th>
      {comparison.quotesForSelected.map((q) => {
        const supplier = supplierNameById.get(q.supplierId) ?? q.supplierId;
        return (
          <th
            key={q.id}
            data-testid={`panel-cmp-head-${q.supplierId}`}
            className={`align-bottom px-2 pt-2 pb-2 font-semibold text-text-primary text-left min-w-[10rem] ${
              q.id === comparison.topRankedId
                ? 'border-2 border-action rounded-t-md bg-action-soft/40'
                : ''
            }`}
          >
            {q.id === comparison.topRankedId && (
              <span className="flex flex-col items-start gap-0.5 mb-1">
                <span className="inline-flex items-center gap-1 text-label text-teal-hover uppercase">
                  <Trophy size={10} /> {t('sourcing.cmp.topRanked')}
                </span>
                {COMPOSITE_LIVENESS === 'simulated' && (
                  <span
                    title={t('sourcing.cmp.simulatedTitle')}
                    className="inline-block normal-case text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px"
                  >
                    {t('sourcing.cmp.simulated')}
                  </span>
                )}
              </span>
            )}
            <div className="text-sm">{supplier}</div>
          </th>
        );
      })}
    </tr>
  </thead>
);

/**
 * The last row: the ACTUAL outcome per quote on an Awarded RFQ, otherwise each
 * quote's lifecycle status and the buyer's review move.
 * @type {React.FC<Omit<ComparisonTableProps, 'supplierNameById'>>}
 */
const ComparisonOutcomeRow = ({
  selectedRfq,
  comparison,
  reviewAvailability,
  handleReview,
  reviewPending,
  t
}) =>
  selectedRfq.status === 'Awarded' ? (
    // Awarded: the picker is moot — show the ACTUAL outcome
    // per quote (winner Awarded, others Rejected), winner
    // column highlighted. No re-award affordance.
    <ComparisonRow label={t('sourcing.cmp.row.result')}>
      {comparison.quotesForSelected.map((q) => (
        <ComparisonCell key={q.id} highlight={q.id === selectedRfq.awardedQuotationId}>
          <StatusPill
            variant={
              q.status === 'Awarded' ? 'success' : q.status === 'Rejected' ? 'danger' : 'neutral'
            }
          >
            {q.status}
          </StatusPill>
        </ComparisonCell>
      ))}
    </ComparisonRow>
  ) : (
    <>
      {/* Per-quote lifecycle status + the buyer's review move.
        A freshly-submitted quote (t_quotation_submit) reads
        'Submitted'; "Move to review" fires t_quotation_review
        (Submitted → Under Review) in place. */}
      <ComparisonRow label={t('sourcing.cmp.row.status')}>
        {comparison.quotesForSelected.map((q) => (
          <ComparisonCell key={q.id}>
            <div className="flex flex-col items-center gap-1.5">
              <StatusPill variant={q.status === 'Under Review' ? 'info' : 'neutral'}>
                {q.status}
              </StatusPill>
              {/* MOVE TO REVIEW — one act PER QUOTE, so one
                notice per quote. The cell either offers
                the move or names its owner; a single
                notice for the column would answer about a
                quote the reader did not pick. Only a
                `Submitted` quote has the act at all. */}
              {q.status === 'Submitted' &&
                (reviewAvailability.kind === 'held' ? (
                  <button
                    type="button"
                    onClick={() => handleReview(q.id)}
                    disabled={reviewPending}
                    className="text-xs font-semibold text-action hover:text-action-hover disabled:opacity-50"
                  >
                    {t('sourcing.cmp.moveToReview')}
                  </button>
                ) : (
                  <HandoffNotice availability={reviewAvailability} testId="handoff-rfq-review" />
                ))}
            </div>
          </ComparisonCell>
        ))}
      </ComparisonRow>
    </>
  );

/**
 * The comparison table.
 * @type {React.FC<ComparisonTableProps>}
 */
const ComparisonTable = (props) => {
  const { selectedRfq, comparison, t } = props;
  const { pricedQuotes, topRankedId, scoreById, gateOf } = comparison;
  return (
    <table className="min-w-full text-xs border-collapse">
      <ComparisonHead comparison={comparison} supplierNameById={props.supplierNameById} t={t} />
      <tbody className="text-text-secondary">
        <ComparisonRow label={t('sourcing.cmp.row.unitPrice')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                {formatMoney(q.unitPrice, q.currency)}/{selectedRfq.uom}
              </Data>
            </ComparisonCell>
          ))}
        </ComparisonRow>
        {/* CI-2 — the should-cost-vs-quote spread, read-only, right
            under unit price. Per quote: the resolver joins the RFQ
            material to a SIMULATED basket and returns a MODELED,
            banded spread — or honest silence (tail / unit-mismatch /
            unmapped). Never fed into the score; never a verdict. */}
        <ComparisonRow label={t('sourcing.cmp.row.spread')}>
          {pricedQuotes.map((q) => {
            // 2e-c-1 — the policy/capability gate, ahead of the
            // resolver. A bid in a currency the engine cannot
            // price gets the same honest silence every other
            // missing reference gets, with its OWN reason: the
            // material is mapped, is not tail, and is priced by
            // weight, so none of the other three would be true.
            //
            // 2e-c-5 — the currency now goes STRAIGHT to the
            // resolver, which owns the gate. The surface no longer
            // decides what the engine can price.
            return (
              <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                <SpreadCell
                  result={spreadForQuote(
                    selectedRfq.materialIds[0],
                    selectedRfq.uom,
                    q.unitPrice,
                    q.currency,
                    SPREAD_DEPS
                  )}
                  t={t}
                />
              </ComparisonCell>
            );
          })}
        </ComparisonRow>
        <ComparisonRow label={t('sourcing.cmp.row.totalPrice')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                {formatMoney(q.totalPrice, q.currency)}
              </Data>
            </ComparisonCell>
          ))}
        </ComparisonRow>
        {/* CP-0 2e-b-1a — the lead time is a REQUIRED ESTIMATE at
            quote stage, not a commitment: a supplier cannot firmly
            commit before final quantity, PO date and capacity are
            known, and forcing "firm" here would buy false
            precision. It is still scored and still ranked on — the
            buyer simply sees it for what it is. The firm date is
            confirmed at PO (a separate arc). */}
        <ComparisonRow
          label={t('sourcing.cmp.row.leadTime')}
          tag={t('sourcing.cmp.estimated')}
          tagTitle={t('sourcing.cmp.estimatedTitle')}
        >
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <Data as="span" className="whitespace-nowrap">
                {t('sourcing.cmp.leadTimeDays', {
                  count: q.leadTimeDays
                })}
              </Data>
            </ComparisonCell>
          ))}
        </ComparisonRow>
        {/* CP-0 2e-b-2 (FIND-02) — the supplier's minimum order
            quantity. It has always been collected on the quote
            form and dropped before the payload, so until now this
            comparison could not show it: a buyer weighing two
            quotes had no way to see that one of them cannot be
            ordered at the quantity being sourced. Rendered as the
            fact it is — no verdict, no comparison against
            `selectedRfq.totalQty`; that ruling is MOQ-FIND-01. */}
        <ComparisonRow label={t('sourcing.cmp.row.moq')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              {q.moq === undefined ? (
                // An ABSENT minimum is a real answer ("same as the
                // RFQ quantity"), not missing data — so it reads as
                // a sentence, never as a 0 or a dash.
                <span className="text-text-tertiary">{t('sourcing.cmp.moqNone')}</span>
              ) : (
                <Data as="span" className="whitespace-nowrap">
                  {formatNumber(q.moq)} {selectedRfq.uom}
                </Data>
              )}
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonRow label={t('sourcing.cmp.row.paymentTerms')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              {q.paymentTermsOffered}
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonRow label={t('sourcing.cmp.row.priceScore')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <ScoreOrSilence score={scoreById.get(q.id)?.priceScore} />
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonRow
          label={t('sourcing.cmp.row.leadTimeScore')}
          tag={t('sourcing.cmp.estimated')}
          tagTitle={t('sourcing.cmp.estimatedTitle')}
        >
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <ScoreOrSilence score={scoreById.get(q.id)?.leadTimeScore} />
            </ComparisonCell>
          ))}
        </ComparisonRow>
        {/* CR-23 — compliance is a GATE, not a weighted axis: it
            decides who is scored, and names why a supplier is not. */}
        <ComparisonRow label={t('sourcing.cmp.row.compliance')}>
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <GateMarker
                gate={gateOf(q.supplierId)}
                showPass
                testId={`drawer-gate-${q.supplierId}`}
              />
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonRow
          label={t('sourcing.cmp.row.reliability')}
          tag={AXIS_LIVENESS.reliability === 'simulated' ? t('sourcing.cmp.simulated') : undefined}
          tagTitle={t('sourcing.cmp.simulatedTitle')}
        >
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              <ScoreOrSilence score={scoreById.get(q.id)?.reliabilityScore} />
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonRow
          label={t('sourcing.cmp.row.composite')}
          tag={COMPOSITE_LIVENESS === 'simulated' ? t('sourcing.cmp.simulated') : undefined}
          tagTitle={t('sourcing.cmp.simulatedTitle')}
        >
          {pricedQuotes.map((q) => (
            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
              {/* The composite is the number the recommendation is
                  argmax'd over, so a refused comparison must be
                  silent HERE above all — a 0 composite would read
                  as "scored, and worst". */}
              {scoreById.get(q.id) === undefined ? (
                <span className="text-text-tertiary">—</span>
              ) : (
                <ScoreBadge
                  score={
                    /** @type {import('@lib/quoteScore').QuoteScore} */ (scoreById.get(q.id))
                      .composite
                  }
                  size="md"
                  variant="circular"
                />
              )}
            </ComparisonCell>
          ))}
        </ComparisonRow>
        <ComparisonOutcomeRow
          selectedRfq={selectedRfq}
          comparison={comparison}
          reviewAvailability={props.reviewAvailability}
          handleReview={props.handleReview}
          reviewPending={props.reviewPending}
          t={t}
        />
      </tbody>
    </table>
  );
};

export default ComparisonTable;
