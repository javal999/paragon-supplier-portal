/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { Supplier } from '@services/data/types' */
import { useMemo } from 'react';
import { useRfqComplianceGate } from '@services/query/hooks';
import {
  defaultEvaluationTierQty,
  eventPiecesAt,
  isTieredRfq,
  quoteTotalAt,
  scoreRfqAt
} from '@services/sourcing/rfqComparison';
import { reliabilityScoreFor } from '@services/transitions/rfxRules';
import { scoreQuotations } from '@lib/quoteScore';
import { BASE_CURRENCY } from '@lib/currencyPolicy';

/**
 * The selected RFQ's quote comparison, as the side panel renders it: the
 * quotes, priced at the panel's evaluation break and with the currency and the
 * reliability axis resolved once; the compliance gate per supplier; the scoring
 * outcome (scored or refused) and the top-ranked quote; the foreign currencies
 * that need an FX basis; and the actually-awarded quote. Moved out of
 * `SourcingWorkspace` by the Phase 5 page split (no behaviour change).
 * @param {{ selectedRfq: RFQ | null; quotations: readonly Quotation[]; suppliers: readonly Supplier[] }} args
 */
export const useQuoteComparison = ({ selectedRfq, quotations, suppliers }) => {
  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return quotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq, quotations]);

  // 2e-c-4 — the currency is resolved ONCE, here, and every consumer reads the
  // resolved value. It used to be re-derived per cell (`q.currency ??
  // BASE_CURRENCY` at the unit-price, spread and total-price cells), which is
  // the same convention restated three times: three places to forget it, and
  // three places for the engine's view of a quote to drift from the surface's.
  //
  // REQ-E03-05 / CR-15 — THE RELIABILITY AXIS IS THE SUPPLIER'S OTIF, and it is
  // resolved HERE for the same reason the currency is. It used to be the
  // quotation's stored `reliabilityScore`, which is one of the retired
  // hand-authored axes (F0.3-FIND-01): a quote cannot state how reliable its
  // author is, the performance record can. A supplier with no OTIF history
  // scores 50 — the rule says so, and `reliabilityScoreFor` is where it lives so
  // the screen and the award verb cannot disagree about it.
  // THE PANEL NEVER DISAGREES WITH THE EVENT PAGE ON A TIERED RFQ. It reads the
  // same default evaluation break the event page opens at (nearest
  // `totalQty`) and shows each quote's cost per piece and total AT THAT
  // BREAK, not the stored first-break header; the ranking below is scored with
  // the same rule (`scoreRfqAt`). Choosing another break happens on the event
  // page, which the panel links to.
  const panelEvalQty =
    selectedRfq && isTieredRfq(selectedRfq) ? defaultEvaluationTierQty(selectedRfq) : null;
  const pricedQuotes = useMemo(
    () =>
      quotesForSelected.map((q) => {
        const atBreak =
          selectedRfq && panelEvalQty !== null ? quoteTotalAt(selectedRfq, q, panelEvalQty) : null;
        const pieces =
          selectedRfq && panelEvalQty !== null ? eventPiecesAt(selectedRfq, panelEvalQty) : 0;
        return {
          ...q,
          ...(atBreak !== null && pieces > 0
            ? { unitPrice: atBreak / pieces, totalPrice: atBreak }
            : {}),
          currency: q.currency ?? BASE_CURRENCY,
          reliabilityScore: reliabilityScoreFor(
            suppliers.find((s) => s.id === q.supplierId)?.otif ?? null
          )
        };
      }),
    [quotesForSelected, suppliers, selectedRfq, panelEvalQty]
  );

  // The actually-awarded quotation (Awarded RFQs only), resolved from the real
  // award metadata — NOT the AI-recommended pick, which may differ. Drives the
  // award-summary block so the panel names the true winner at a glance.
  const awardedQuote = useMemo(() => {
    if (!selectedRfq || selectedRfq.status !== 'Awarded') return null;
    return pricedQuotes.find((q) => q.id === selectedRfq.awardedQuotationId) ?? null;
  }, [selectedRfq, pricedQuotes]);

  // Governed derived scores (F0.3 quote-scoring primitive): the drawer COMPUTES
  // the comparison axes via `scoreQuotations` instead of reading the hand-authored
  // fixture literals (the fabricated-score root cause). price/leadTime are LIVE
  // (ratio-to-best over this RFQ's set), reliability is declared SIMULATED,
  // compliance is the CR-23 gate (who is scored, not a weight), the composite carries weakest-link liveness, and topRanked =
  // argmax(composite) — replacing the old fixture `aiRecommended` flag.
  //
  // 2e-c-3 — the engine now returns a DISCRIMINATED OUTCOME. A multi-currency
  // set with no recorded FX basis (or one too old to rank on) is REFUSED, not
  // approximated: `scoreById` stays empty, `topRankedId` stays null, and the
  // surface says why. This is the operator's ruling (b) on 2e-c-2-FIND-01 —
  // withhold the ranking rather than publish one computed from bare numerals.
  // CR-23 / REQ-E03-05 BR-01a — only suppliers that PASS the compliance gate
  // are scored. A failing supplier's quote stays in the comparison, marked; it
  // is never ranked and cannot be selected for award. No gate read yet = not
  // qualified: a pass is never assumed.
  const rfqGates = useRfqComplianceGate(selectedRfq?.id);
  /** @param {string} supplierId */
  const gateOf = (supplierId) => rfqGates.data?.items.find((g) => g.supplierId === supplierId);
  const qualifiedQuotes = useMemo(
    () =>
      pricedQuotes.filter((q) =>
        rfqGates.data?.items.some((g) => g.supplierId === q.supplierId && g.passes)
      ),
    [pricedQuotes, rfqGates.data]
  );
  /** BL-64 — the gate has answered and no quoting supplier passes it: nothing can be awarded. */
  const noneAwardable =
    rfqGates.data !== undefined && pricedQuotes.length > 0 && qualifiedQuotes.length === 0;
  const scoring = useMemo(
    () =>
      selectedRfq && panelEvalQty !== null
        ? scoreRfqAt(
            selectedRfq,
            qualifiedQuotes,
            panelEvalQty,
            (sid) => reliabilityScoreFor(suppliers.find((s) => s.id === sid)?.otif ?? null),
            { pins: selectedRfq.fxPins }
          )
        : scoreQuotations(qualifiedQuotes, { pins: selectedRfq?.fxPins }),
    [qualifiedQuotes, selectedRfq, panelEvalQty, suppliers]
  );
  /** The non-base currencies actually bid on this RFQ — what needs a basis. */
  const foreignCurrencies = useMemo(
    () => [...new Set(pricedQuotes.map((q) => q.currency))].filter((c) => c !== BASE_CURRENCY),
    [pricedQuotes]
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
  // A refused comparison has NO recommendation. Not a fallback to the first
  // quote, not the previous winner — nothing, because there is no basis on
  // which one bid beats another.
  const topRankedId =
    scoring.kind === 'scored' ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;

  return {
    quotesForSelected,
    panelEvalQty,
    pricedQuotes,
    awardedQuote,
    gateOf,
    noneAwardable,
    scoring,
    foreignCurrencies,
    scoreById,
    topRankedId
  };
};
