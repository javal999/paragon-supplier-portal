// SupplierRFQs — pure helpers (no React): the display shapes the page renders
// (`OpenRFQ`, `SubmittedQuote`, `AwardRow`) and the adapters that build them
// from the canonical RFQ and Quotation reads.

import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { daysUntil } from '@services/data/dayProjection';
import { formatDate, formatMoney, formatNumber } from '@lib/format';
import { EVAL_WEIGHTS } from './const';
/** @import { TFunction } from 'i18next' */
/** @import { RFQ, Quotation } from '@services/data/types' */

/**
 * @typedef {object} OpenRFQ
 * @property {string} id
 * @property {string} rfqNumber
 * @property {string} material
 * @property {string} category
 * @property {string} qty -  The RFQ quantity formatted for display ("200,000 PCS"). Presentation only.
 * @property {number} totalQty -  The same quantity as a number — what the total-price preview multiplies.
 * @property {RFQ} rfq -  The RFQ itself, for the tiered response (items, breaks, questions).
 * @property {string} delivery -  The delivery terms the RFQ states (its incoterms).
 * @property {string} awardBy -  The date the buyer means to award by.
 * @property {string} deadline
 * @property {number} daysRemaining
 * @property {{ text: string; sample: boolean }} specialRequirements What the RFQ itself asks beyond the price: item notes, samples requested,
 *   alternatives allowed. `sample: true` when the RFQ states none of it and the
 *   card shows illustrative text, marked as such.
 * @property {{ price: number; leadTime: number; reliability: number; }} evaluationCriteria -  How the quote is scored — the platform's CR-15 weights, in percent.
 * @property {string} status
 * @property {string} receivedVia
 * @property {string} receivedDate
 */

/**
 * @typedef {object} SubmittedQuote
 * @property {string} rfqNumber
 * @property {string} quoteNumber
 * @property {string} material
 * @property {string} submittedDate
 * @property {string} unitPrice
 * @property {string} totalPrice
 * @property {string} leadTime
 * @property {string} moq -  The stated minimum order quantity, or the "same as RFQ qty" default (2e-b-2).
 * @property {string} validUntil
 * @property {string} status
 * @property {Quotation} quote -  The quotation itself, for a revision.
 * @property {boolean} current -  False once a later version supersedes this one.
 */

// The supplier's OWN submitted quotations (Task 3b), joined to their RFQ for
// display. HONEST-BY-CONSTRUCTION (3b-C): own quote facts + status ONLY — NO
// score, NO competitive rank. A score/rank would need the sibling set (rival
// suppliers' quotes), which per-supplier scoping hides; surfacing it would be
// fabrication or a data leak. The BUYER sees scores (engine, at read, #78); the
// supplier sees its own facts. Replaces the retired SUBMITTED_QUOTE fixture.
/**
 * @param {Quotation[]} quotations
 * @param {Map<string, RFQ>} rfqById
 * @param {TFunction} t
 * @returns {SubmittedQuote[]}
 */
export const buildSubmittedQuotes = (quotations, rfqById, t) => {
  const superseded = new Set(
    /** @type {string[]} */ (quotations.map((q) => q.supersedesQuotationId).filter(Boolean))
  );
  return quotations.map((q) => {
    const rfq = rfqById.get(q.rfqId);
    return {
      quote: q,
      current: !superseded.has(q.id),
      rfqNumber: rfq?.rfqNumber ?? q.rfqId,
      quoteNumber: q.id,
      material: rfq?.title ?? '—',
      submittedDate: formatDate(q.submittedAt),
      // COS-05, CLOSED (2e-c-2). These were unconditional `formatIDR`, so a
      // supplier who quoted USD 2.85 read their own bid back as "Rp 3" — the
      // platform overruling the currency the supplier had just chosen. Latent
      // until now only because `identitySources` seeds sup-007 alone; it goes
      // live the moment a foreign supplier has a persona, and this batch is what
      // makes foreign bids storable in the first place.
      //
      // A supplier must read their bid back in the SAME format the buyer scores
      // it in — one ruling, both surfaces — so this is the shared `formatMoney`,
      // not a second currency-aware formatter living on the supplier side.
      unitPrice: formatMoney(q.unitPrice, q.currency ?? BASE_CURRENCY),
      totalPrice: formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY),
      // 2e-b-3 (COS-07) — the day count goes through i18n's plural selection
      // like every other counted noun on this page (`rfqs.meta.event.*`), and
      // through `formatNumber` like every other quantity. It was raw string
      // interpolation: "1 days" in EN, and an ungrouped number for a lead time
      // long enough to need grouping. The buyer side already reads this axis
      // through a count form; the supplier's own record of the same quote did not.
      leadTime: t(
        q.leadTimeDays === 1 ? 'rfqs.quotes.leadTimeDays.one' : 'rfqs.quotes.leadTimeDays.other',
        { count: q.leadTimeDays, days: formatNumber(q.leadTimeDays) }
      ),
      // 2e-b-2 — the minimum the supplier stated, read back to them. An ABSENT
      // minimum renders the default it means ("same as RFQ qty"), never a 0 and
      // never a dash: the supplier said something, and it was "no minimum".
      moq:
        q.moq === undefined
          ? t('rfqs.quotes.moqNone')
          : `${formatNumber(q.moq)} ${rfq?.uom ?? ''}`.trim(),
      validUntil: formatDate(q.validUntil),
      status: q.status
    };
  });
};

/**
 * @typedef {object} AwardRow
 * @property {string} quotationId The quotation this outcome belongs to — the row's identity and React key.
 *   rfqNumber is not a safe key: nothing guarantees one decided quotation per
 *   RFQ for a supplier, and it falls back to rfqId when the RFQ is missing.
 * @property {string} rfqNumber
 * @property {string} material
 * @property {'Awarded' | 'Not Awarded'} result
 * @property {string} awardDate
 * @property {string} contractValue
 * @property {string} poIssued
 */

// Award outcome is a REAL read (batch iv): the supplier's own quotations that
// reached a terminal award decision (Awarded / Rejected via the RFQ-award
// cascade), joined to their RFQ for display. `poIssued` is honestly always '—' —
// award mints NO PO (PO issuance is a separate buyer verb, a future batch).
/**
 * @param {Quotation[]} quotations
 * @param {Map<string, RFQ>} rfqById
 * @returns {AwardRow[]}
 */
export const buildAwardRows = (quotations, rfqById) =>
  quotations
    .filter((q) => q.status === 'Awarded' || q.status === 'Rejected')
    .map((q) => {
      const rfq = rfqById.get(q.rfqId);
      const won = q.status === 'Awarded';
      return {
        quotationId: q.id,
        rfqNumber: rfq?.rfqNumber ?? q.rfqId,
        material: rfq?.title ?? '—',
        result: won ? 'Awarded' : 'Not Awarded',
        awardDate: rfq ? formatDate(rfq.awardDeadline) : '—',
        // COS-05, same leg: an awarded foreign quote's contract value is stated
        // in the currency it was awarded in. Rupiah here would misprice the
        // award itself, which is the row a supplier is most likely to act on.
        contractValue: won ? formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY) : '—',
        poIssued: '—'
      };
    });

// Adapter: canonical RFQ → the page's OpenRFQ display shape. Real fields come
// from the read (number, material, category, qty, deadline, received date);
// the evaluation weights are the platform's own CR-15 policy (`CRITERIA_WEIGHTS`);
// the detail the RFQ entity does NOT carry — special requirements on a legacy
// RFQ, received-via — is illustrative sample, flagged with a "Sample detail"
// pill (partial migration).
// ⚠️ `RFQ_TODAY_MS = new Date('2026-04-25')` IS DELETED. It was the SECOND pin
// in this app and it disagreed with `BuyerSourcing`'s by 23 days, so the same
// RFQ deadline produced two different day-counts depending on which persona was
// looking. `now` is injected from the component and the arithmetic lives in
// `services/data/dayProjection`.
//
// ⚠️ **THE `Math.max(0, …)` CLAMP IS PRESERVED VERBATIM AND IS NOT DEFENDED.**
// It is behaviour this batch did not rule on, and changing it here would hide a
// second defect inside a clock fix. With the pin gone the clamp is now visible
// for what it is: a deadline 111 days past renders "0 days remaining", which
// reads as *due today*. Filed, not fixed.
/**
 * What the RFQ itself asks beyond the price. Real where the rebuilt RFQ carries
 * it (item notes, samples requested, alternatives allowed); a legacy RFQ states
 * none of it, so the card keeps the illustrative line and marks it sample.
 * @param {RFQ} r
 * @param {TFunction} t
 * @returns {OpenRFQ['specialRequirements']}
 */
export const specialRequirementsOf = (r, t) => {
  const parts = [
    ...(r.items ?? []).filter((i) => i.note).map((i) => `${i.description}: ${i.note}`),
    ...(r.samplesRequested
      ? [
          t('rfqResponse.card.samplesRequested', {
            qty: formatNumber(r.samplesRequested.qty),
            date: formatDate(r.samplesRequested.neededBy)
          })
        ]
      : []),
    ...(r.allowAlternatives ? [t('rfqResponse.card.alternativesAllowed')] : [])
  ];
  return parts.length > 0
    ? { text: parts.join(' · '), sample: false }
    : { text: t('rfqResponse.card.sampleRequirements'), sample: true };
};

/**
 * Map a canonical RFQ to the card's `OpenRFQ` display shape, counting the days
 * left against the injected reference clock.
 * @param {RFQ} r
 * @param {string} nowIso
 * @param {TFunction} t
 * @returns {OpenRFQ}
 */
export const toOpenRfq = (r, nowIso, t) => {
  const daysRemaining = Math.max(0, daysUntil(r.responseDeadline, nowIso) ?? 0);
  return {
    id: r.id,
    rfqNumber: r.rfqNumber,
    material: r.title,
    category: r.materialCategory,
    // 2e-b-3 (COS-02) — `formatNumber` (pinned id-ID), not bare
    // `toLocaleString()`, whose grouping followed the RUNTIME locale. The same
    // card rendered this quantity one way and the minimum order quantity
    // another (`formatNumber`, 40 lines below), so two quantities side by side
    // could disagree about what a thousands separator looks like.
    qty: `${formatNumber(r.totalQty)} ${r.uom}`,
    // The quantity as the NUMBER it is, carried alongside its display form so
    // the total-price preview never has to parse `qty` back out of its own
    // formatting (CP-0 2e-a).
    totalQty: r.totalQty,
    rfq: r,
    // RFx spec 2026-09-21 — the delivery terms are the RFQ's own incoterms; the
    // hard-coded warehouse that stood here was sample text on every card.
    delivery: r.incoterms,
    awardBy: r.awardDeadline,
    deadline: r.responseDeadline,
    daysRemaining,
    specialRequirements: specialRequirementsOf(r, t),
    evaluationCriteria: EVAL_WEIGHTS,
    status: r.status === 'Open' ? 'Open — Awaiting Your Quote' : r.status,
    receivedVia: 'Web Portal',
    receivedDate: r.createdAt
  };
};
