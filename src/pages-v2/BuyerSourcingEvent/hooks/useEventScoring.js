/** @import { useRFQs, useQuotations, useRfqComplianceGate, useSuppliers } from '@services/query/hooks' */
import { useMemo } from 'react';
import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { scoreQuotations, scoreStanding } from '@lib/quoteScore';
import { reliabilityScoreFor } from '@services/transitions/rfxRules';
import {
  defaultEvaluationTierQty,
  isTieredRfq,
  scoreRfqAt
} from '@services/sourcing/rfqComparison';
import { rfxNow } from '../../rfx/rfxDisplay';

/**
 * The event, its bids and how they score — everything the comparison, the
 * response window and the award read: the RFQ, the evaluation break, the
 * CURRENT version of each bid, the compliance gate per supplier, the scoring
 * outcome and the tie standing. Moved out of `BuyerSourcingEvent.jsx` by the
 * Phase 5 page split (no behaviour change); the memos run in the order they did
 * there.
 * @param {{
 *   rfqId: string;
 *   rfqsData: ReturnType<typeof useRFQs>['data'];
 *   quotesData: ReturnType<typeof useQuotations>['data'];
 *   suppliersData: ReturnType<typeof useSuppliers>['data'];
 *   gatesData: ReturnType<typeof useRfqComplianceGate>['data'];
 *   chosenBreak: number | null;
 * }} args
 */
export function useEventScoring({
  rfqId,
  rfqsData,
  quotesData,
  suppliersData,
  gatesData,
  chosenBreak
}) {
  const rfq = useMemo(
    () => (rfqsData?.items ?? []).find((r) => r.id === rfqId) ?? null,
    [rfqsData, rfqId]
  );
  const tiered = rfq !== null && isTieredRfq(rfq);
  const evalQty = rfq && tiered ? (chosenBreak ?? defaultEvaluationTierQty(rfq)) : null;

  /** @param {string} id */
  const supplierName = (id) => suppliersData?.items.find((s) => s.id === id)?.name ?? id;
  /** @param {string} id */
  const supplierOtif = (id) => suppliersData?.items.find((s) => s.id === id)?.otif ?? null;

  const allQuotes = useMemo(() => quotesData?.items ?? [], [quotesData]);
  /** The CURRENT version of each bid — a superseded one is history, not a rival. */
  const current = useMemo(() => {
    const superseded = new Set(
      /** @type {string[]} */ (allQuotes.map((q) => q.supersedesQuotationId).filter(Boolean))
    );
    return allQuotes.filter((q) => !superseded.has(q.id));
  }, [allQuotes]);

  /** @param {string} supplierId */
  const gateOf = (supplierId) => gatesData?.items.find((g) => g.supplierId === supplierId);
  /**
   * Material G2 (MR-10 BR-07) — the supplier against the event's sourcing type, today.
   * @param {string} supplierId
   */
  const eligibilityOf = (supplierId) => gateOf(supplierId)?.eligibility;
  /** REQ-E03-05 BR-01a — only a supplier that PASSES the gate is scored or awardable.
   * @param {string} supplierId
   *  No gate read yet = not qualified: a pass is never assumed. */
  const qualifies = (supplierId) => gateOf(supplierId)?.passes === true;
  const qualified = useMemo(
    () =>
      current.filter((q) =>
        gatesData?.items.some((g) => g.supplierId === q.supplierId && g.passes)
      ),
    [current, gatesData]
  );

  // CR-15 — reliability IS the supplier's OTIF; no history scores 50.
  /** @param {string} id */
  const reliabilityOf = (id) => reliabilityScoreFor(supplierOtif(id));
  const scoringOpts = { pins: rfq?.fxPins, now: new Date(rfxNow()) };
  const scoring = useMemo(
    () =>
      // A TIERED RFQ scores PRICE AS TOTAL COST AT THE EVALUATION BREAK — the
      // same rule the award verb reads (`rfxReadModel.rfqScoring`). A legacy
      // RFQ scores its header unit price exactly as before.
      rfq && tiered && evalQty !== null
        ? scoreRfqAt(rfq, qualified, evalQty, reliabilityOf, scoringOpts)
        : scoreQuotations(
            qualified.map((q) => ({
              id: q.id,
              unitPrice: q.unitPrice,
              currency: q.currency ?? BASE_CURRENCY,
              leadTimeDays: q.leadTimeDays,
              reliabilityScore: reliabilityOf(q.supplierId)
            })),
            scoringOpts
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qualified, rfq, tiered, evalQty, suppliersData]
  );
  const scoreById = useMemo(
    () =>
      new Map(
        scoring.kind === 'scored'
          ? scoring.scores.map((s) => /** @type {const} */ ([s.quoteId, s]))
          : []
      ),
    [scoring]
  );
  const bestId =
    scoring.kind === 'scored' ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;
  // ⚠️ TIE HONESTY. Two quotes can both READ "72" while one is best on the
  // unrounded score (Oslo at 3,000: 72.0 against 71.6) — the scores are then
  // shown to one decimal and the note states that rule. A GENUINE tie marks
  // every tied quote "Tied for best" and no single "Best scored": the engine's
  // stable pick is not a ranking, and presenting it as one would be invented.
  const standing = useMemo(
    () => scoreStanding(scoring.kind === 'scored' ? scoring.scores : []),
    [scoring]
  );
  const tied = standing.tiedIds.length > 1;

  return {
    rfq,
    tiered,
    evalQty,
    supplierName,
    supplierOtif,
    allQuotes,
    current,
    gateOf,
    eligibilityOf,
    qualifies,
    qualified,
    reliabilityOf,
    scoringOpts,
    scoring,
    scoreById,
    bestId,
    standing,
    tied
  };
}

/** @typedef {ReturnType<typeof useEventScoring>} EventScoring */
