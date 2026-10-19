// ────────────────────────────────────────────────────────────────────────────
// A SUPPLIER'S OUTCOME, ONE PER EVENT (RFx UX S-03, S-04). Pure: it reads only
// the supplier's own narrowed award reads (`awardViews` / `rfpAwardViews` with a
// supplierId, RFX-R4), so nothing here can show a supplier another supplier's
// share. The per-item rule is `awardOutcome.js`; this file folds it into the
// one outcome a list row, a To do row and a notification name:
//
//   · awarded     — an award in force carries a line of this supplier's;
//   · withdrawn   — no line in force, and a cancelled award carried one;
//   · notAwarded  — the event was settled for someone else.
//
// The award date is the RECORD's date (`awardedAt`), never the RFQ's planned
// award deadline, and superseded quote versions play no part: the rows come
// from the award record, not from the quotations.
// ────────────────────────────────────────────────────────────────────────────

/** @import { AwardView, RfpAwardView, NegotiationRoundView, RfiEventView, RfpEventView } from './views' */
/** @import { AwardableRfq, AwardItem } from './awardShape' */
/** @import { RfqItem } from './rfqModel' */
/** @import { Quotation, RFQ } from '@services/data/types' */
/** @import { TFunction } from 'i18next' */
import { supplierItemOutcomes } from './awardOutcome';
import { itemCostAt } from './rfqComparison';

/**
 * One awarded share: an RFQ item by its number (`null` for the whole event) or
 * an RFP option by its title.
 * @typedef {{
 *   readonly itemNo: number | null;
 *   readonly optionTitle?: string;
 *   readonly sharePct: number;
 *   readonly quantity: number;
 * }} OutcomeShare
 */

/**
 * @typedef {{
 *   readonly kind: 'awarded' | 'notAwarded' | 'withdrawn';
 *   readonly awardId: string;
 *   readonly awardedAt: string;
 *   readonly withdrawnAt?: string;
 *   readonly raisedInSap: boolean;
 *   readonly shares: readonly OutcomeShare[];
 * }} SupplierEventOutcome
 */

/**
 * @template {{ readonly awardedAt: string }} A
 * @param {readonly A[]} list
 * @returns {A | undefined}
 */
const latest = (list) =>
  list
    .slice()
    .sort((a, b) => a.awardedAt.localeCompare(b.awardedAt))
    .pop();

/**
 * The number a reader calls an RFQ item by: a tiered item's line, a legacy
 * line item's line, or null for a legacy RFQ awarded as a whole.
 * @param {AwardableRfq} rfq
 * @param {AwardItem} item
 * @returns {number | null}
 */
const itemNoOf = (rfq, item) =>
  item.tiered
    ? (item.lineNo ?? null)
    : (rfq.lineItems?.find((l) => l.materialCode === item.itemCode)?.lineNo ?? null);

/**
 * This supplier's outcome on one RFQ, from the awards it reads on that event;
 * null when it reads none, or every item is still open.
 * @param {AwardableRfq & { readonly id: string; readonly status: string }} rfq
 * @param {readonly AwardView[]} awards
 * @param {string} supplierId
 * @returns {SupplierEventOutcome | null}
 */
export function supplierRfqOutcome(rfq, awards, supplierId) {
  const own = awards.filter((a) => a.eventType === 'rfq' && a.eventId === rfq.id);
  const last = latest(own);
  if (!last) return null;
  const items = supplierItemOutcomes(rfq, own, supplierId);
  const shares = items.flatMap(({ item, outcome }) =>
    outcome.kind === 'awarded'
      ? [{ itemNo: itemNoOf(rfq, item), sharePct: outcome.sharePct, quantity: outcome.quantity }]
      : []
  );
  const mineInForce = own.filter(
    (a) => a.status !== 'Cancelled' && a.lines.some((l) => l.supplierId === supplierId)
  );
  if (shares.length > 0) {
    const record = latest(mineInForce) ?? last;
    return {
      kind: 'awarded',
      awardId: record.id,
      awardedAt: record.awardedAt,
      raisedInSap: mineInForce.some((a) => a.status === 'Raised in SAP'),
      shares
    };
  }
  const withdrawnAt = items
    .flatMap(({ outcome }) => (outcome.kind === 'withdrawn' ? [outcome.withdrawnAt] : []))
    .sort()
    .pop();
  if (withdrawnAt) {
    const record = latest(own.filter((a) => a.status === 'Cancelled')) ?? last;
    return {
      kind: 'withdrawn',
      awardId: record.id,
      awardedAt: record.awardedAt,
      withdrawnAt,
      raisedInSap: false,
      shares: []
    };
  }
  return items.some(({ outcome }) => outcome.kind === 'notAwarded')
    ? {
        kind: 'notAwarded',
        awardId: last.id,
        awardedAt: last.awardedAt,
        raisedInSap: false,
        shares: []
      }
    : null;
}

/**
 * This supplier's outcome on one RFP, from its narrowed RFP award reads on that
 * event (each carries the supplier's own `outcome`); null when it reads none.
 * @param {readonly RfpAwardView[]} awards
 * @returns {SupplierEventOutcome | null}
 */
export function supplierRfpOutcome(awards) {
  const last = latest(awards);
  if (!last) return null;
  const inForce = awards.filter((a) => a.status !== 'Cancelled' && a.lines.length > 0);
  if (inForce.length > 0) {
    const record = /** @type {RfpAwardView} */ (latest(inForce));
    return {
      kind: 'awarded',
      awardId: record.id,
      awardedAt: record.awardedAt,
      raisedInSap: inForce.some((a) => a.status === 'Raised in SAP'),
      shares: inForce.flatMap((a) =>
        a.lines.map((l) => ({
          itemNo: null,
          optionTitle: l.optionTitle,
          sharePct: l.sharePct,
          quantity: l.quantity
        }))
      )
    };
  }
  const withdrawn = latest(awards.filter((a) => a.status === 'Cancelled' && a.lines.length > 0));
  if (withdrawn) {
    return {
      kind: 'withdrawn',
      awardId: withdrawn.id,
      awardedAt: withdrawn.awardedAt,
      withdrawnAt: withdrawn.withdrawnAt ?? withdrawn.awardedAt,
      raisedInSap: false,
      shares: []
    };
  }
  return {
    kind: 'notAwarded',
    awardId: last.id,
    awardedAt: last.awardedAt,
    raisedInSap: false,
    shares: []
  };
}

/**
 * The value of this supplier's lines in force on one RFQ award set: each line's
 * quantity at the unit price its own quotation stated at the line's break
 * (tiered) or for the event (legacy). Null when a price cannot be read — a
 * value built from a missing price would be a number nobody quoted.
 * @param {RFQ} rfq
 * @param {readonly AwardView[]} awards
 * @param {readonly Quotation[]} quotations
 * @param {string} supplierId
 * @returns {{ amount: number; currency: Quotation['currency'] } | null}
 */
export function awardedValueOf(rfq, awards, quotations, supplierId) {
  const lines = awards
    .filter((a) => a.eventType === 'rfq' && a.eventId === rfq.id && a.status !== 'Cancelled')
    .flatMap((a) => a.lines.filter((l) => l.supplierId === supplierId));
  if (lines.length === 0) return null;
  let amount = 0;
  /** @type {Quotation['currency']} */
  let currency;
  for (const line of lines) {
    const quote = quotations.find((q) => q.id === line.quotationId);
    if (!quote) return null;
    currency = quote.currency;
    if (line.itemLineNo !== undefined) {
      const item = /** @type {RfqItem | undefined} */ (
        (rfq.items ?? []).find((i) => i.lineNo === line.itemLineNo)
      );
      const cost =
        item && line.awardTierQty !== undefined
          ? itemCostAt(rfq, item, quote, line.awardTierQty)
          : null;
      if (!cost) return null;
      amount += cost.unitPrice * line.quantity;
    } else {
      amount += quote.unitPrice * line.quantity;
    }
  }
  return { amount, currency };
}

/**
 * The shares in words: "60% of item 1, 30% of item 2", "70% of the event", or
 * "50% of Full-service ODM" for an RFP option.
 * @param {TFunction} t
 * @param {readonly OutcomeShare[]} shares
 * @returns {string}
 */
export const outcomeShareText = (t, shares) =>
  shares
    .map((s) =>
      s.optionTitle !== undefined
        ? t('rfqs.awards.share.option', { share: s.sharePct, option: s.optionTitle })
        : s.itemNo === null
          ? t('rfqs.awards.share.whole', { share: s.sharePct })
          : t('rfqs.awards.share.item', { share: s.sharePct, n: s.itemNo })
    )
    .join(', ');

/**
 * One in-hub notice to a supplier: an award recorded for it, or an award of its
 * withdrawn (S-04). `at` is the date the notice is about.
 * @typedef {{
 *   readonly id: string;
 *   readonly kind: 'awarded' | 'withdrawn';
 *   readonly eventType: 'rfq' | 'rfp';
 *   readonly eventId: string;
 *   readonly eventNumber: string;
 *   readonly at: string;
 *   readonly raisedInSap: boolean;
 *   readonly shares: readonly OutcomeShare[];
 * }} SupplierAwardNotice
 */

/**
 * Every award and withdrawal notice for this supplier, newest first. Derived
 * at read from the narrowed award reads; nothing is stored.
 * @param {{
 *   rfqs: readonly (AwardableRfq & { readonly id: string; readonly status: string; readonly rfqNumber: string })[];
 *   rfqAwards: readonly AwardView[];
 *   rfpAwards: readonly RfpAwardView[];
 *   supplierId: string;
 * }} input
 * @returns {SupplierAwardNotice[]}
 */
export function supplierAwardNotices({ rfqs, rfqAwards, rfpAwards, supplierId }) {
  /** @type {SupplierAwardNotice[]} */
  const notices = [];
  for (const rfq of rfqs) {
    const outcome = supplierRfqOutcome(rfq, rfqAwards, supplierId);
    if (outcome && outcome.kind !== 'notAwarded') {
      notices.push(noticeOf(outcome, 'rfq', rfq.id, rfq.rfqNumber));
    }
  }
  const rfpIds = [...new Set(rfpAwards.map((a) => a.eventId))];
  for (const eventId of rfpIds) {
    const own = rfpAwards.filter((a) => a.eventId === eventId);
    const outcome = supplierRfpOutcome(own);
    if (outcome && outcome.kind !== 'notAwarded') {
      notices.push(noticeOf(outcome, 'rfp', eventId, own[0]?.rfpNumber ?? eventId));
    }
  }
  return notices.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * @param {SupplierEventOutcome} outcome
 * @param {'rfq' | 'rfp'} eventType
 * @param {string} eventId
 * @param {string} eventNumber
 * @returns {SupplierAwardNotice}
 */
function noticeOf(outcome, eventType, eventId, eventNumber) {
  const kind = outcome.kind === 'withdrawn' ? 'withdrawn' : 'awarded';
  return {
    id: `${eventType}:${eventId}:${kind}`,
    kind,
    eventType,
    eventId,
    eventNumber,
    at: kind === 'withdrawn' ? (outcome.withdrawnAt ?? outcome.awardedAt) : outcome.awardedAt,
    raisedInSap: outcome.raisedInSap,
    shares: outcome.shares
  };
}

/**
 * The sourcing work waiting on this supplier (X-02), one list per kind: RFQs
 * still to quote, RFIs and RFPs still to answer, revision rounds still to
 * answer. The To do and the menu counts both read this, so they cannot disagree.
 * @param {{
 *   rfqs: readonly RFQ[];
 *   rfis: readonly RfiEventView[];
 *   rfps: readonly RfpEventView[];
 *   rounds: readonly NegotiationRoundView[];
 *   supplierId: string | null;
 * }} input
 */
export function supplierSourcingQueue({ rfqs, rfis, rfps, rounds, supplierId }) {
  return {
    openRfqs: rfqs.filter(
      (r) => r.status === 'Open' && !!supplierId && !r.respondedSupplierIds.includes(supplierId)
    ),
    // A draft is still "to answer": only a SUBMITTED response takes it off.
    openRfis: rfis.filter((e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted')),
    openRfps: rfps.filter((e) => !e.closed && e.responses.every((r) => r.status !== 'Submitted')),
    openRounds: rounds.filter((r) => !r.closed && r.awaiting > 0)
  };
}
