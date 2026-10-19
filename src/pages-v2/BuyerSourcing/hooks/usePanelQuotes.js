/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
import { useMemo } from 'react';
import { useRfqComplianceGate } from '@services/query/hooks';
import { BASE_CURRENCY } from '@lib/currencyPolicy';

/**
 * The selected RFQ's quotes, as the side panel's summary reads them: the quotes
 * on the RFQ, the actually-awarded quote (its value in its own currency), and
 * whether any quoting supplier passes the compliance gate (BL-64).
 *
 * RFx UX B-02 (owner ruling 2026-10-19) — was `useQuoteComparison`. The
 * comparison, its scoring and its FX basis moved to the event page
 * (`BuyerSourcingEvent/hooks/useEventScoring`), so the panel computes no
 * ranking of its own any more and cannot disagree with the event page.
 * @param {{ selectedRfq: RFQ | null; quotations: readonly Quotation[] }} args
 */
export const usePanelQuotes = ({ selectedRfq, quotations }) => {
  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return quotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq, quotations]);

  // The actually-awarded quotation (Awarded RFQs only), resolved from the real
  // award metadata — NOT the best-scored pick, which may differ. Its currency is
  // resolved here so the summary never restates a USD award as rupiah (2e-c-4).
  const awardedQuote = useMemo(() => {
    if (!selectedRfq || selectedRfq.status !== 'Awarded') return null;
    const q = quotesForSelected.find((x) => x.id === selectedRfq.awardedQuotationId);
    return q ? { ...q, currency: q.currency ?? BASE_CURRENCY } : null;
  }, [selectedRfq, quotesForSelected]);

  // CR-23 / REQ-E03-05 BR-01a — only a supplier that PASSES the gate can be
  // awarded. No gate read yet = not qualified: a pass is never assumed.
  const rfqGates = useRfqComplianceGate(selectedRfq?.id);
  /** BL-64 — the gate has answered and no quoting supplier passes it: nothing can be awarded. */
  const noneAwardable =
    rfqGates.data !== undefined &&
    quotesForSelected.length > 0 &&
    !quotesForSelected.some((q) =>
      rfqGates.data?.items.some((g) => g.supplierId === q.supplierId && g.passes)
    );

  return { quotesForSelected, awardedQuote, noneAwardable };
};
