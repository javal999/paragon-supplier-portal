// ────────────────────────────────────────────────────────────────────────────
// CR-15 OVER AN RFP — REQ-E03-04, "price and lead time can be scored with CR-15
// when the RFP carries them".
//
// PURE, and computed over the VIEW the service already returned: the view
// carries each invitee's OTIF, so the reliability axis is available without a
// second read and without the page reaching past the seam for a supplier row.
//
// It returns `null` — never a zero and never a partial ranking — when the RFP
// asks for neither a price basis nor a standard lead time. An RFP about payment
// terms and packaging has no comparable number in it, and a weighted score
// computed from prose would be exactly the fabricated-score defect the quote
// engine was rebuilt to remove.
// ────────────────────────────────────────────────────────────────────────────

import { scoreQuotations, type ScoringOutcome } from '../../lib/quoteScore';
import { rfpTerm } from '../../services/sourcing/rfxConfig';
import { reliabilityScoreFor } from '../../services/transitions/rfxRules';
import type { RfpEventView } from '../../services/sourcing/views';

export function rfpScoringOf(event: RfpEventView): ScoringOutcome | null {
  const priceTerm = event.terms.find((row) => rfpTerm(row.termId)?.scorable === 'price');
  const leadTerm = event.terms.find((row) => rfpTerm(row.termId)?.scorable === 'leadTime');
  if (!priceTerm || !leadTerm) return null;

  const quotes = event.responses
    .map((r) => {
      const price = Number(r.answers.find((a) => a.termId === priceTerm.termId)?.proposedValue);
      const lead = Number(r.answers.find((a) => a.termId === leadTerm.termId)?.proposedValue);
      // A proposal whose price or lead time is not a number is left OUT of the
      // ranking rather than scored at zero: the supplier answered in prose, and
      // reading "on request" as a price of nothing would rank them first.
      if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(lead) || lead < 0) return null;
      const otif = event.invitedSuppliers.find((i) => i.supplierId === r.supplierId)?.otif ?? null;
      return {
        id: r.id,
        unitPrice: price,
        currency: event.currency,
        leadTimeDays: lead,
        // CR-15 (2026-09-21) has no compliance axis: compliance is the CR-23
        // gate at award, so the term-compliance share is shown, not weighted.
        reliabilityScore: reliabilityScoreFor(otif),
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (quotes.length === 0) return null;
  return scoreQuotations(quotes);
}
