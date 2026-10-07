// ────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S SIDE OF A TIERED RFQ — the rules (RFx working spec,
// 2026-09-21, "Supplier response").
//
// `rfqModel.js` defines the shapes: the items, the breaks, the tiered
// `Quotation` fields, and `RfqIntent` / `ConfidentialityAcceptance` /
// `RfqClarification` as types. This module is the judgement those shapes need
// once a supplier starts answering, written as PURE functions so the verb's
// policy, the quote grid's own gate and the read model call the SAME rule:
//
//   · `intentRefusal`            — "I will respond" / a reasoned decline
//   · `confidentialityRefusal`   — accepting a confidential RFQ's terms
//   · `clarificationAskRefusal` / `clarificationAnswerRefusal`
//   · `tieredQuoteRefusal`       — the full tiered quotation, per item and per
//                                  break, plus answers and the sample offer
//   · `maskConfidential`         — what a supplier may read before accepting
//   · `clarificationViewFor`     — who may read which question, and as whom
//
// Every refusal is `CODE: detail`, so a surface can translate the code and the
// audit trail keeps the English detail.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty } from '@lib/localeNumber';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfiAnswer, RfiQuestion } from './types' */
import { effectiveDeadline, isPastDeadline } from '../transitions/rfxRules';
/** @import { AttachmentMeta, ConfidentialityAcceptance, OneTimeCostQuote, QuotationAlternative, QuotationItemQuote, RfqClarification, RfqDeclineReason, RfqIntent, RfqItem, SampleOffer } from './rfqModel' */
import { RFQ_DECLINE_REASONS, tiersForItem } from './rfqModel';

// ── The stored records ──────────────────────────────────────────────────────

/** An intent as the store keeps it: the model's `RfqIntent` plus a key. */
/** @typedef {RfqIntent & { readonly id: string }} RfqIntentRecord */

/** An acceptance as the store keeps it. */
/** @typedef {ConfidentialityAcceptance & { readonly id: string }} RfqConfidentialityRecord */

/**
 * The state of an intent. DERIVED from the record's own `intent` field, never
 * stored beside it, so the state and the fact cannot disagree.
 * @param {Pick<RfqIntent, 'intent'>} r
 * @returns {'Responding' | 'Declined'}
 */
export const intentState = (r) => (r.intent === 'respond' ? 'Responding' : 'Declined');

/**
 * A clarification is answered when it carries an answer. Derived, not stored.
 * @param {Pick<RfqClarification, 'answer'>} c
 * @returns {'Asked' | 'Answered'}
 */
export const clarificationState = (c) =>
  typeof c.answer === 'string' && c.answer.trim() ? 'Answered' : 'Asked';

// ── The read views ──────────────────────────────────────────────────────────

/**
 * One invitee's engagement with one RFQ: the intent it stated and when it
 * accepted the confidentiality terms. A supplier reads only its own rows; the
 * buyer reads every invitee's, including the decline reason and text.
 */
/**
 * `intentId`:  The intent record's key — what a withdraw names.
 *
 * @typedef {{
 *   readonly rfqId: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly intent?: RfqIntent;
 *   readonly intentId?: string;
 *   readonly confidentialityAcceptedAt?: string;
 * }} RfqEngagementView
 */

/**
 * One clarification as a reader may see it. `askedBy` is PRESENT only for the
 * buyer and for the asker: a published answer reaches every invitee with the
 * asker's identity removed, which is the rule, not a display choice.
 */
/**
 * `askedBy`:  The asking supplier. Absent when the reader may not know who asked.
 * `mine`:  True when the reader is the supplier that asked.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly rfqId: string;
 *   readonly question: string;
 *   readonly askedAt: string;
 *   readonly answer?: string;
 *   readonly answeredAt?: string;
 *   readonly visibility: 'private' | 'published';
 *   readonly state: 'Asked' | 'Answered';
 *   readonly askedBy?: string;
 *   readonly askedByName?: string;
 *   readonly mine: boolean;
 * }} RfqClarificationView
 */

/**
 * Who may read a clarification, and what of it. `readerSupplierId === null`
 * is the buyer, who reads everything.
 *
 * A supplier reads: its OWN questions in any state (answered privately,
 * answered publicly, or still waiting), and every PUBLISHED answer on an RFQ it
 * is invited to — with the asker removed. Another supplier's unanswered or
 * privately answered question is not in its view at all.
 * @param {RfqClarification} c
 * @param {string | null} readerSupplierId
 * @param {(rfqId: string) => boolean} invitedTo
 * @param {(supplierId: string) => string} nameOf
 * @returns {RfqClarificationView | null}
 */
export function clarificationViewFor(c, readerSupplierId, invitedTo, nameOf) {
  const state = clarificationState(c);
  const base = {
    id: c.id,
    rfqId: c.rfqId,
    question: c.question,
    askedAt: c.askedAt,
    ...(c.answer !== undefined ? { answer: c.answer } : {}),
    ...(c.answeredAt !== undefined ? { answeredAt: c.answeredAt } : {}),
    visibility: c.visibility,
    state
  };
  if (readerSupplierId === null) {
    return { ...base, askedBy: c.askedBy, askedByName: nameOf(c.askedBy), mine: false };
  }
  if (c.askedBy === readerSupplierId) {
    return { ...base, askedBy: c.askedBy, askedByName: nameOf(c.askedBy), mine: true };
  }
  if (state === 'Answered' && c.visibility === 'published' && invitedTo(c.rfqId)) {
    return { ...base, mine: false };
  }
  return null;
}

// ── The confidentiality gate, at read ───────────────────────────────────────

/**
 * What a supplier may read of a confidential RFQ before it accepts the terms:
 * the event, the items' descriptions and breaks, the questions — and NOT the
 * spec values, the item notes or any attachment. A non-confidential RFQ, or one
 * the supplier has accepted, is returned untouched.
 *
 * This runs in the READ, not on the screen: a screen that hid the values would
 * still have them in the payload it was handed.
 * @param {RFQ} rfq
 * @returns {RFQ}
 */
export function maskConfidential(rfq) {
  if (!rfq.confidential) return rfq;
  // NR-1 — the document requests are content too, withheld until acceptance.
  const { attachments: _hiddenAttachments, documentRequests: _hiddenRequests, ...rest } = rfq;
  return {
    ...rest,
    ...(rfq.items
      ? {
          items: rfq.items.map((item) => {
            const { note: _note, attachments: _att, ...keep } = item;
            return {
              ...keep,
              specFields: item.specFields.map((f) => {
                const { value: _value, ...field } = f;
                return field;
              })
            };
          })
        }
      : {})
  };
}

// ── Shared checks ───────────────────────────────────────────────────────────

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isDate = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(`${v}T00:00:00Z`));

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isPositive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isNonNegative = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Why this supplier cannot act on this RFQ at all right now, or `null`.
 * @param {RFQ | undefined} rfq
 * @param {string} supplierId
 * @param {string} nowIso
 * @returns {string | null}
 */
function openInvitationRefusal(rfq, supplierId, nowIso) {
  if (!rfq) return 'RFQ_NOT_FOUND: sourcing event not found';
  if (!rfq.invitedSupplierIds.includes(supplierId)) {
    return `NOT_INVITED: ${supplierId} is not invited to ${rfq.rfqNumber}`;
  }
  if (rfq.status !== 'Open') return `EVENT_NOT_OPEN: ${rfq.rfqNumber} is ${rfq.status}`;
  const deadline = effectiveDeadline(rfq.responseDeadline, rfq.inviteeDeadlines ?? [], supplierId);
  if (isPastDeadline(deadline, nowIso)) return `PAST_DEADLINE: responses closed on ${deadline}`;
  return null;
}

// ── Intent ──────────────────────────────────────────────────────────────────

/**
 * `act`:  Which act: respond, decline, or withdraw (a decline after "I will respond").
 * `existing`:  The intent this supplier already stated on this RFQ, if any.
 * `hasQuote`:  True when this supplier has a live quotation on this RFQ.
 *
 * @typedef {{
 *   readonly rfq: RFQ | undefined;
 *   readonly supplierId: string;
 *   readonly act: 'respond' | 'decline' | 'withdraw';
 *   readonly reason?: unknown;
 *   readonly text?: unknown;
 *   readonly existing?: RfqIntent;
 *   readonly hasQuote: boolean;
 *   readonly nowIso: string;
 * }} IntentInput
 */

/**
 * Why an intent is refused, or `null`.
 *
 * One intent per invitee per RFQ: a second "respond" or "decline" is refused by
 * name, and changing a "respond" to a decline is its own act (`withdraw`). A
 * decline needs a reason from the list AND words, because the buyer reads both.
 * A supplier with a live quote on the event cannot decline it: that would leave
 * a bid standing from a supplier that says it is not bidding.
 * @param {IntentInput} input
 * @returns {string | null}
 */
export function intentRefusal(input) {
  const blocked = openInvitationRefusal(input.rfq, input.supplierId, input.nowIso);
  if (blocked) return blocked;
  if (input.act === 'withdraw') {
    if (!input.existing || input.existing.intent !== 'respond') {
      return 'NOT_RESPONDING: only a stated "I will respond" can be withdrawn';
    }
  } else if (input.existing) {
    return `INTENT_ALREADY_STATED: ${input.supplierId} already answered ${/** @type {RFQ} */ (input.rfq).rfqNumber}`;
  }
  if (input.act === 'respond') return null;
  if (!RFQ_DECLINE_REASONS.includes(/** @type {RfqDeclineReason} */ (input.reason))) {
    return `DECLINE_REASON_UNKNOWN: ${String(input.reason)} is not a decline reason on the list`;
  }
  if (!hasText(input.text)) return 'DECLINE_TEXT_MISSING: a decline says why in words as well';
  if (input.hasQuote)
    return 'QUOTE_ALREADY_SUBMITTED: a supplier with a live quote on this event cannot decline it';
  return null;
}

// ── Confidentiality ─────────────────────────────────────────────────────────

/**
 * Why accepting the terms is refused, or `null`. Accepted once, never twice.
 * @param {{ readonly rfq: RFQ | undefined; readonly supplierId: string; readonly alreadyAccepted: boolean; readonly nowIso: string; }} input
 * @returns {string | null}
 */
export function confidentialityRefusal(input) {
  const blocked = openInvitationRefusal(input.rfq, input.supplierId, input.nowIso);
  if (blocked) return blocked;
  if (!(/** @type {RFQ} */ (input.rfq).confidential))
    return `NOT_CONFIDENTIAL: ${/** @type {RFQ} */ (input.rfq).rfqNumber} has no confidentiality terms`;
  if (input.alreadyAccepted)
    return `ALREADY_ACCEPTED: ${input.supplierId} accepted these terms already`;
  return null;
}

// ── Clarifications ──────────────────────────────────────────────────────────

/** The longest question a supplier may ask, in characters. */
export const MAX_CLARIFICATION_LENGTH = 1000;

/**
 * Why a question is refused, or `null`.
 * @param {{ readonly rfq: RFQ | undefined; readonly supplierId: string; readonly question: unknown; readonly nowIso: string; }} input
 * @returns {string | null}
 */
export function clarificationAskRefusal(input) {
  const blocked = openInvitationRefusal(input.rfq, input.supplierId, input.nowIso);
  if (blocked) return blocked;
  if (!hasText(input.question)) return 'QUESTION_EMPTY: a clarification asks something';
  if (input.question.trim().length > MAX_CLARIFICATION_LENGTH) {
    return `QUESTION_TOO_LONG: a clarification is at most ${MAX_CLARIFICATION_LENGTH} characters`;
  }
  return null;
}

/**
 * Why an answer is refused, or `null`.
 * @param {{ readonly clarification: RfqClarification | undefined; readonly answer: unknown; readonly visibility: unknown; }} input
 * @returns {string | null}
 */
export function clarificationAnswerRefusal(input) {
  if (!input.clarification) return 'CLARIFICATION_NOT_FOUND: no such question';
  if (clarificationState(input.clarification) === 'Answered') {
    return 'ALREADY_ANSWERED: this question has its answer';
  }
  if (!hasText(input.answer)) return 'ANSWER_EMPTY: an answer says something';
  if (input.visibility !== 'private' && input.visibility !== 'published') {
    return `VISIBILITY_UNKNOWN: ${String(input.visibility)} is neither private nor published`;
  }
  return null;
}

// ── The answers to the buyer's questions ────────────────────────────────────

/**
 * Is this answer present at all? The RFI rule, restated for the RFQ.
 * @param {RfiAnswer | undefined} a
 * @returns {boolean}
 */
const answered = (a) => {
  if (!a) return false;
  const { value } = a;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
};

/**
 * Why one answer is refused for its question's type, or `null`. The answer is
 * already known to be present. An unknown question type is judged on presence
 * only: a type added to the RFI library later is not refused for being new.
 * @param {RfiQuestion} q
 * @param {RfiAnswer} a
 * @returns {string | null}
 */
export function answerTypeRefusal(q, a) {
  const v = a.value;
  /** @param {string} why */
  const bad = (why) => `ANSWER_INVALID: "${q.promptKey}" ${why}`;
  switch (q.type) {
    case 'yesNo':
      return v === 'yes' || v === 'no' ? null : bad('is answered yes or no');
    case 'singleChoice':
      return typeof v === 'string' && (q.options ?? []).includes(v)
        ? null
        : bad('is answered with one of its options');
    case 'multipleChoice':
      return Array.isArray(v) && v.every((x) => (q.options ?? []).includes(String(x)))
        ? null
        : bad('is answered with its options only');
    case 'numberWithUnit':
      return typeof v === 'number' && Number.isFinite(v) ? null : bad('is answered with a number');
    case 'date':
      return isDate(v) ? null : bad('is answered with a date');
    default:
      return null;
  }
}

/**
 * Why a set of answers is refused against the RFQ's questions, or `null`.
 * @param {readonly RfiQuestion[]} questions
 * @param {unknown} answers
 * @returns {string | null}
 */
export function answersRefusal(questions, answers) {
  if (answers !== undefined && !Array.isArray(answers))
    return 'ANSWERS_MALFORMED: the answers are not a list';
  const list = /** @type {RfiAnswer[]} */ (answers ?? []);
  const missing = questions.filter(
    (q) => q.required && !answered(list.find((a) => a.questionId === q.id))
  );
  if (missing.length > 0) return `ANSWER_MISSING: ${missing.map((q) => q.promptKey).join(', ')}`;
  for (const a of list) {
    const q = questions.find((x) => x.id === a?.questionId);
    if (!q) return `ANSWER_UNKNOWN: ${String(a?.questionId)} is not a question on this RFQ`;
    if (!answered(a)) continue;
    const r = answerTypeRefusal(q, a);
    if (r) return r;
  }
  return null;
}

// ── The tiered quotation ────────────────────────────────────────────────────

/**
 * Why a supplier-filled spec value is refused, or `null`.
 * @param {RfqItem} item
 * @param {unknown} values
 * @param {string} where
 * @returns {string | null}
 */
function specValuesRefusal(item, values, where) {
  if (values !== undefined && !Array.isArray(values)) return `SPEC_VALUES_MALFORMED: on ${where}`;
  const list = /** @type {{ key?: unknown; value?: unknown }[]} */ (values ?? []);
  for (const field of item.specFields.filter((f) => f.filledBy === 'supplier')) {
    const given = list.find((v) => v?.key === field.key);
    const value = typeof given?.value === 'string' ? given.value.trim() : '';
    const name = field.label ?? field.key;
    if (!value) {
      if (field.required) return `SPEC_VALUE_MISSING: ${where} needs ${name}`;
      continue;
    }
    if (field.kind === 'number' && !normalizeQty(value).ok) {
      return `SPEC_VALUE_INVALID: ${name} on ${where} is a number`;
    }
    if (field.kind === 'choice' && !(field.options ?? []).includes(value)) {
      return `SPEC_VALUE_INVALID: ${name} on ${where} is one of its options`;
    }
  }
  for (const v of list) {
    const field = item.specFields.find((f) => f.key === v?.key);
    if (!field || field.filledBy !== 'supplier') {
      return `SPEC_VALUE_UNKNOWN: ${String(v?.key)} is not a supplier field on ${where}`;
    }
  }
  return null;
}

/**
 * Why a price-per-break list is refused against the breaks in force, or `null`.
 * @param {RfqItem} item
 * @param {RFQ} rfq
 * @param {unknown} prices
 * @param {string} where
 * @returns {string | null}
 */
function tierPricesRefusal(item, rfq, prices, where) {
  if (!Array.isArray(prices)) return `TIER_PRICE_MISSING: ${where} has no prices`;
  const tiers = tiersForItem(rfq, item);
  for (const p of /** @type {{ tierQty?: unknown; unitPrice?: unknown }[]} */ (prices)) {
    if (!tiers.some((t) => t.qty === p?.tierQty)) {
      return `TIER_UNKNOWN: ${String(p?.tierQty)} is not a quantity break on ${where}`;
    }
    if (!isPositive(p.unitPrice)) {
      return `TIER_PRICE_INVALID: the price at ${String(p.tierQty)} on ${where} is a number above zero`;
    }
  }
  const missing = tiers.filter(
    (t) => !(/** @type {{ tierQty?: unknown }[]} */ (prices).some((p) => p?.tierQty === t.qty))
  );
  if (missing.length > 0) {
    return `TIER_PRICE_MISSING: ${where} needs a price at ${missing.map((t) => t.qty).join(', ')}`;
  }
  return null;
}

/**
 * Why the one-time costs are refused, or `null`. Every cost the buyer asked for
 * is answered (zero is an answer: "no charge"); every cost has a name and an
 * amount; a cost the supplier added is named by the supplier.
 * @param {RfqItem} item
 * @param {unknown} costs
 * @param {string} where
 * @returns {string | null}
 */
function oneTimeCostsRefusal(item, costs, where) {
  if (costs !== undefined && !Array.isArray(costs)) return `ONE_TIME_COST_INVALID: on ${where}`;
  const list = /** @type {Partial<OneTimeCostQuote>[]} */ (costs ?? []);
  for (const c of list) {
    if (!hasText(c?.name))
      return `ONE_TIME_COST_INVALID: every one-time cost on ${where} has a name`;
    if (!isNonNegative(c.amount)) {
      return `ONE_TIME_COST_INVALID: ${c.name} on ${where} is an amount of zero or more`;
    }
  }
  const missing = (item.oneTimeCosts ?? []).filter((id) => !list.some((c) => c?.costId === id));
  if (missing.length > 0)
    return `ONE_TIME_COST_MISSING: ${where} needs an amount for ${missing.join(', ')}`;
  return null;
}

/**
 * Why a sample offer is refused, or `null`.
 * @param {Pick<RFQ, 'samplesRequested'>} rfq
 * @param {unknown} offer
 * @returns {string | null}
 */
export function sampleOfferRefusal(rfq, offer) {
  if (offer === undefined) {
    return rfq.samplesRequested
      ? 'SAMPLE_OFFER_MISSING: this RFQ asks whether you can sample'
      : null;
  }
  const o = /** @type {Partial<SampleOffer> | null} */ (offer);
  if (!o || typeof o.canSample !== 'boolean')
    return 'SAMPLE_OFFER_INVALID: say whether you can sample';
  if (o.canSample && !isDate(o.readyDate))
    return 'SAMPLE_OFFER_INVALID: a sample offer states its ready date';
  if (!o.canSample && o.readyDate !== undefined)
    return 'SAMPLE_OFFER_INVALID: no ready date without a sample';
  return null;
}

/**
 * Why the attachment list is malformed, or `null`. Metadata only (BL-27).
 * @param {unknown} atts
 * @returns {string | null}
 */
function attachmentsRefusal(atts) {
  if (atts === undefined) return null;
  if (!Array.isArray(atts)) return 'ATTACHMENT_MALFORMED: attachments are a list';
  for (const a of /** @type {Partial<AttachmentMeta>[]} */ (atts)) {
    if (!hasText(a?.id) || !hasText(a.name) || !isNonNegative(a.size)) {
      return 'ATTACHMENT_MALFORMED: every attachment has an id, a name and a size';
    }
  }
  return null;
}

/**
 * THE TIERED QUOTATION RULE — what `quotation_tiered_well_formed` binds, and
 * what the quote grid checks before it lets the supplier press Submit.
 *
 * On an RFQ with items, the quote answers EVERY item: every required supplier
 * spec field, a price at every break in force, and an amount for every one-time
 * cost the buyer asked for. An alternative is allowed only where the buyer
 * allowed them, and prices every break too. The required questions are
 * answered in their type, and a sample offer is given when samples were
 * requested.
 *
 * On an RFQ WITHOUT items (rfq-001 … rfq-020) the per-item fields are refused
 * by name — there is nothing to price per item — while the RFQ-level fields
 * (answers, sample offer, attachments) are still checked for shape.
 * @param {RFQ} rfq
 * @param {Record<string, unknown>} payload
 * @returns {string | null}
 */
export function tieredQuoteRefusal(rfq, payload) {
  const items = rfq.items ?? [];
  if (items.length === 0) {
    if (payload.itemQuotes !== undefined || payload.alternatives !== undefined) {
      return `NOT_TIERED: ${rfq.rfqNumber} has no items to price per item`;
    }
  } else {
    if (!Array.isArray(payload.itemQuotes)) {
      return `TIERED_QUOTE_REQUIRED: ${rfq.rfqNumber} is priced per item and per quantity break`;
    }
    const quotes = /** @type {Partial<QuotationItemQuote>[]} */ (payload.itemQuotes);
    for (const q of quotes) {
      if (!items.some((i) => i.lineNo === q?.itemLineNo)) {
        return `ITEM_UNKNOWN: item ${String(q?.itemLineNo)} is not on ${rfq.rfqNumber}`;
      }
    }
    for (const item of items) {
      const where = `item ${item.lineNo}`;
      const matches = quotes.filter((q) => q?.itemLineNo === item.lineNo);
      if (matches.length === 0)
        return `ITEM_QUOTE_MISSING: ${where} (${item.description}) has no quote`;
      if (matches.length > 1) return `ITEM_QUOTE_DUPLICATE: ${where} is quoted twice`;
      const q = /** @type {Partial<QuotationItemQuote>} */ (matches[0]);
      const r =
        specValuesRefusal(item, q.specValues, where) ??
        tierPricesRefusal(item, rfq, q.tierPrices, where) ??
        oneTimeCostsRefusal(item, q.oneTimeCosts, where);
      if (r) return r;
      if (q.moq !== undefined && !isPositive(q.moq))
        return `MOQ_INVALID: the minimum on ${where} is above zero`;
      if (
        q.leadTimeDays !== undefined &&
        !(Number.isInteger(q.leadTimeDays) && q.leadTimeDays >= 0)
      ) {
        return `LEAD_TIME_INVALID: the lead time on ${where} is a whole number of days`;
      }
    }
    if (payload.alternatives !== undefined) {
      if (!rfq.allowAlternatives) {
        return `ALTERNATIVES_NOT_ALLOWED: ${rfq.rfqNumber} does not invite alternative offers`;
      }
      if (!Array.isArray(payload.alternatives))
        return 'ALTERNATIVE_INCOMPLETE: alternatives are a list';
      for (const alt of /** @type {Partial<QuotationAlternative>[]} */ (payload.alternatives)) {
        const item = items.find((i) => i.lineNo === alt?.itemLineNo);
        if (!item) return `ITEM_UNKNOWN: an alternative names item ${String(alt?.itemLineNo)}`;
        if (!hasText(alt.description))
          return `ALTERNATIVE_INCOMPLETE: the alternative on item ${item.lineNo} says what it is`;
        const r = tierPricesRefusal(
          item,
          rfq,
          alt.tierPrices,
          `the alternative on item ${item.lineNo}`
        );
        if (r) return r;
      }
    }
  }
  return (
    answersRefusal(rfq.questions ?? [], payload.answers) ??
    sampleOfferRefusal(rfq, payload.sampleOffer) ??
    attachmentsRefusal(payload.attachments)
  );
}

/**
 * The header lead time of a tiered quote: the LONGEST item lead time, because
 * the order is not complete until its slowest item arrives. `null` when no item
 * states one.
 * @param {readonly Pick<QuotationItemQuote, 'leadTimeDays'>[]} itemQuotes
 * @returns {number | null}
 */
export function headerLeadTimeDays(itemQuotes) {
  const days = itemQuotes
    .map((q) => q.leadTimeDays)
    .filter(/** @returns {d is number} */ (d) => typeof d === 'number');
  return days.length === 0 ? null : Math.max(...days);
}
