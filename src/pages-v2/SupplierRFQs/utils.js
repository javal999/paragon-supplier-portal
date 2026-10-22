// SupplierRFQs — pure helpers (no React): the display shapes the page renders
// (`OpenRFQ`, `SubmittedQuote`, `AwardRow`) and the adapters that build them
// from the canonical RFQ and Quotation reads.

import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { daysUntil } from '@services/data/dayProjection';
import { formatDate, formatMoney, formatNumber } from '@lib/format';
import { tiersForItem } from '@services/sourcing/rfqModel';
import { EVAL_WEIGHTS } from './const';
import {
  awardedValueOf,
  outcomeShareText,
  supplierRfqOutcome
} from '@services/sourcing/supplierOutcome';
/** @import { TFunction } from 'i18next' */
/** @import { RFQ, Quotation } from '@services/data/types' */
/** @import { AwardView } from '@services/sourcing/views' */
/** @import { SupplierEventOutcome } from '@services/sourcing/supplierOutcome' */

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
 * @property {string} awardBy -  The date the buyer means to award by, formatted (`formatDate`, S-08).
 * @property {string} deadline -  The response deadline as stored (ISO), for the rules and the toast.
 * @property {string} deadlineText -  The same deadline formatted (`formatDate`, S-08).
 * @property {string} daysLeft -  The days left to the deadline in words ("5 days left", S-08).
 * @property {number} daysRemaining
 * @property {string | null} specialRequirements What the RFQ itself asks beyond the price: item notes, samples requested,
 *   alternatives allowed. `null` when the RFQ states none of it: the card then
 *   shows no block (RFx UX S-12 dropped the illustrative placeholder).
 * @property {{ price: number; leadTime: number; reliability: number; }} evaluationCriteria -  How the quote is scored — the platform's CR-15 weights, in percent.
 * @property {string} status
 * @property {string} receivedVia
 * @property {string} receivedDate -  Formatted (`formatDate`, S-08).
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
 * @property {TieredQuoteSummary | null} tiered -  RFx UX S-09: on a tiered quote, what the supplier priced per item. `null`
 *   on a legacy single-price quote, whose `unitPrice` and `moq` stay as they were.
 */

/**
 * One item of a tiered quote as the supplier stated it (RFx UX S-09): the
 * break-1 price and the item's own minimum order quantity. No derived average.
 * @typedef {object} TieredItemLine
 * @property {number} lineNo
 * @property {string} description
 * @property {string} break1Price The price at the RFQ's first break for this item, or '—' when not priced.
 * @property {string} break1Qty The first break's quantity, formatted.
 * @property {string} moq The item's MOQ, or the "same as RFQ qty" default when none was stated.
 */

/**
 * @typedef {object} TieredQuoteSummary
 * @property {number} priced How many of the RFQ's items carry a break-1 price.
 * @property {number} total How many items the RFQ has.
 * @property {TieredItemLine[]} lines
 */

/**
 * A tiered quote read back per item (RFx UX S-09): items priced, the break-1
 * price per item and the per-item MOQ. The header `unitPrice` is an average
 * derived across items (`deriveQuoteHeader`) and is not the supplier's price,
 * so it stays off. `null` for a legacy single-price quote or a quote whose RFQ
 * has no items.
 * @param {RFQ | undefined} rfq
 * @param {Quotation} q
 * @param {TFunction} t
 * @returns {TieredQuoteSummary | null}
 */
export const tieredQuoteSummary = (rfq, q, t) => {
  const items = rfq?.items ?? [];
  if (!rfq || items.length === 0 || !q.itemQuotes) return null;
  const currency = q.currency ?? BASE_CURRENCY;
  const lines = items.map((item) => {
    const first = tiersForItem(rfq, item)[0];
    const quote = q.itemQuotes?.find((iq) => iq.itemLineNo === item.lineNo);
    const price = first ? quote?.tierPrices.find((p) => p.tierQty === first.qty) : undefined;
    return {
      lineNo: item.lineNo,
      description: item.description,
      break1Price: price ? formatMoney(price.unitPrice, currency) : '—',
      break1Qty: first ? formatNumber(first.qty) : '—',
      moq:
        quote?.moq === undefined
          ? t('rfqs.quotes.moqNone')
          : `${formatNumber(quote.moq)} ${item.uom}`.trim()
    };
  });
  return {
    priced: lines.filter((l) => l.break1Price !== '—').length,
    total: items.length,
    lines
  };
};

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
      status: q.status,
      tiered: tieredQuoteSummary(rfq, q, t)
    };
  });
};

/**
 * One award history row: ONE PER EVENT, read from the award record (RFx UX
 * S-03). It replaced a row per quotation version, which listed an RFQ twice
 * ("Awarded" and "Not Awarded") once a revision superseded the first quote, and
 * dated both with the RFQ's planned award deadline.
 * @typedef {object} AwardRow
 * @property {string} eventId The RFQ — the row's identity and React key.
 * @property {string} rfqNumber
 * @property {string} material
 * @property {'awarded' | 'notAwarded' | 'withdrawn'} result
 * @property {string} resultText The result in words: "Awarded · 60% of item 1", "Not awarded" or
 *   "Award withdrawn · 05 Sept 2026".
 * @property {string} awardDate The award RECORD's date.
 * @property {string | null} awardedValue This supplier's lines in force at its own quoted prices;
 *   null when there is none (the tab prints the one placeholder, RFx UX 2F).
 * @property {string | null} poIssued "Raised in SAP", "Follows from SAP" (awarded, not yet raised);
 *   null when the supplier was not awarded.
 */

/**
 * An outcome in words, as the history row and the card's strip say it.
 * @param {TFunction} t
 * @param {SupplierEventOutcome} outcome
 * @returns {string}
 */
export const outcomeText = (t, outcome) =>
  outcome.kind === 'awarded'
    ? t('rfqs.awards.result.awarded', { share: outcomeShareText(t, outcome.shares) })
    : outcome.kind === 'withdrawn'
      ? t('rfqs.awards.result.withdrawn', {
          date: formatDate(outcome.withdrawnAt ?? outcome.awardedAt)
        })
      : t('rfqs.awards.result.notAwarded');

/**
 * The supplier's award history from its narrowed award read: one row per RFQ
 * it reads an award on, newest award first. Superseded quotation versions play
 * no part — the shares and the value come from the award record's own lines.
 * @param {readonly AwardView[]} awards
 * @param {Map<string, RFQ>} rfqById
 * @param {readonly Quotation[]} quotations
 * @param {string} supplierId
 * @param {TFunction} t
 * @returns {AwardRow[]}
 */
export const buildAwardRows = (awards, rfqById, quotations, supplierId, t) =>
  [...new Set(awards.filter((a) => a.eventType === 'rfq').map((a) => a.eventId))]
    .flatMap((eventId) => {
      const rfq = rfqById.get(eventId);
      const outcome = rfq ? supplierRfqOutcome(rfq, awards, supplierId) : null;
      if (!rfq || !outcome) return [];
      const value =
        outcome.kind === 'awarded' ? awardedValueOf(rfq, awards, quotations, supplierId) : null;
      return [
        {
          at: outcome.awardedAt,
          row: /** @type {AwardRow} */ ({
            eventId,
            rfqNumber: rfq.rfqNumber,
            material: rfq.title,
            result: outcome.kind,
            resultText: outcomeText(t, outcome),
            awardDate: formatDate(outcome.awardedAt),
            awardedValue: value ? formatMoney(value.amount, value.currency ?? BASE_CURRENCY) : null,
            poIssued:
              outcome.kind !== 'awarded'
                ? null
                : t(outcome.raisedInSap ? 'rfqs.awards.po.raised' : 'rfqs.awards.po.follows')
          })
        }
      ];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ row }) => row);

/**
 * Days left to a deadline in words: "5 days left", "due today", or "Overdue 2
 * days" (a date that is today is due today, not past — the zero boundary is
 * `dayProjection`'s; this only words it).
 * @param {TFunction} t
 * @param {string} deadline
 * @param {string} nowIso
 * @returns {string}
 */
export const daysLeftText = (t, deadline, nowIso) => {
  const days = daysUntil(deadline, nowIso) ?? 0;
  return days > 0
    ? t('hub.home.daysLeft', { count: days })
    : days === 0
      ? t('hub.home.dueToday')
      : t('hub.home.overdueBy', { count: -days });
};

// Adapter: canonical RFQ → the page's OpenRFQ display shape. Real fields come
// from the read (number, material, category, qty, deadline, received date);
// the evaluation weights are the platform's own CR-15 policy (`CRITERIA_WEIGHTS`);
// received-via, which the RFQ entity does NOT carry, is the one fixed value
// (partial migration); a legacy RFQ's absent special requirements show nothing
// (S-12).
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
 * What the RFQ itself asks beyond the price: item notes, samples requested,
 * alternatives allowed. A legacy RFQ states none of it, and the RFQ carries no
 * description of its own, so the card shows no block at all (RFx UX S-12): the
 * illustrative "Paragon sourcing packet" line promised a packet that never came.
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
  return parts.length > 0 ? parts.join(' · ') : null;
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
    // S-08 — every date on the card through `formatDate` ("06 Sept 2026"),
    // the format of every other RFx screen; the deadline also in days left.
    awardBy: formatDate(r.awardDeadline),
    deadline: r.responseDeadline,
    deadlineText: formatDate(r.responseDeadline),
    daysLeft: daysLeftText(t, r.responseDeadline, nowIso),
    daysRemaining,
    specialRequirements: specialRequirementsOf(r, t),
    evaluationCriteria: EVAL_WEIGHTS,
    status: r.status === 'Open' ? 'Open — Awaiting Your Quote' : r.status,
    receivedVia: 'Web Portal',
    receivedDate: formatDate(r.createdAt)
  };
};
