// ────────────────────────────────────────────────────────────────────────────
// The quote grid's form model (RFx working spec, 2026-09-21, "Supplier
// response · Quote grid").
//
// The grid holds what the supplier TYPED, as strings. `readTieredDraft` is the
// ONE read of it: every price, cost, minimum and lead time goes through the same
// parsers the single-price form uses (`readBidPrice`, `normalizeQty`, `readMoq`,
// `readLeadTimeDays`), and the assembled payload is then judged by
// `tieredQuoteRefusal` — the rule the verb's policy binds. So the grid cannot
// let through a quote the verb refuses, and a refusal is named the same way in
// both places.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty } from '@lib/localeNumber';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { RfiAnswer } from '@services/sourcing/types' */
/** @import { OneTimeCostQuote, QuotationAlternative, QuotationItemQuote, RfqItem, RfqOneTimeCostId, RfqSpecField, TierPrice } from '@services/sourcing/rfqModel' */
import { deriveQuoteHeader, tiersForItem } from '@services/sourcing/rfqModel';
import {
  answerTypeRefusal,
  headerLeadTimeDays,
  tieredQuoteRefusal
} from '@services/sourcing/rfqResponse';
import { readBidPrice } from './quotationPrice';
import { readMoq } from './quotationMoq';
import { readLeadTimeDays } from './quotationLeadTime';
import { documentsOf, responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { DocumentDraft } from '../rfx/ResponseDocumentsSection' */

/** A cost the supplier added beyond the ones the buyer asked for. */
/**
 * `id`: Client-only row identity, used as the React `key` in the quote grid. The rows can be added and removed and hold inputs, while `name` and `amount` are editable and may be blank or equal, so neither can identify a row. Never shown and never submitted (`toQuote` copies only name and amount).
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly name: string;
 *     readonly amount: string;
 *   }} ExtraCostDraft
 */

let extraCostSeq = 0;

/**
 * A new extra-cost row with a fresh id. Every row must be created here (the
 * "add cost" button and loading a saved quote) so each one gets its own key.
 * @returns {ExtraCostDraft}
 */
export const newExtraCost = (name = '', amount = '') => ({
  id: `extra-cost-${++extraCostSeq}`,
  name,
  amount
});

/** What the supplier typed for one item. */
/**
 * `specValues`:  Supplier-filled spec values, by field key.
 * `prices`:  The unit price at each break, by break quantity.
 * `leadTimeDays`:  Whole days.
 * `requestedCosts`:  An amount for each one-time cost the buyer requested.
 *
 * @typedef {{
 *     readonly lineNo: number;
 *     readonly specValues: Readonly<Record<string, string>>;
 *     readonly prices: Readonly<Record<number, string>>;
 *     readonly moq: string;
 *     readonly leadTimeDays: string;
 *     readonly requestedCosts: Readonly<Partial<Record<RfqOneTimeCostId, string>>>;
 *     readonly extraCosts: readonly ExtraCostDraft[];
 *     readonly alternative: { readonly enabled: boolean; readonly description: string; readonly prices: Readonly<Record<number, string>>; };
 *   }} ItemDraft
 */

/** The whole grid. */
/**
 * `canSample`:  `null` = not answered yet.
 * `documents`:  NR-1 — the Documents section: the requested slots and "Other documents".
 *
 * @typedef {{
 *     readonly currency: BidCurrency;
 *     readonly validUntil: string;
 *     readonly paymentTermsOffered: string;
 *     readonly notes: string;
 *     readonly answers: Readonly<Record<string, RfiAnswer>>;
 *     readonly canSample: boolean | null;
 *     readonly sampleReadyDate: string;
 *     readonly documents: readonly DocumentDraft[];
 *     readonly items: readonly ItemDraft[];
 *   }} TieredDraft
 */

/**
 * @param {RfqItem} item
 * @returns {ItemDraft}
 */
const emptyItem = (item) => ({
  lineNo: item.lineNo,
  specValues: {},
  prices: {},
  moq: '',
  leadTimeDays: '',
  requestedCosts: {},
  extraCosts: [],
  alternative: { enabled: false, description: '', prices: {} }
});

/**
 * A blank grid for an RFQ. Payment terms start from the buyer's asked terms.
 * @param {RFQ} rfq
 * @returns {TieredDraft}
 */
export function emptyTieredDraft(rfq) {
  return {
    currency: rfq.currency,
    validUntil: '',
    paymentTermsOffered: rfq.paymentTerms,
    notes: '',
    answers: {},
    canSample: null,
    sampleReadyDate: '',
    documents: [],
    items: (rfq.items ?? []).map(emptyItem)
  };
}

/**
 * @param {readonly TierPrice[]} prices
 * @returns {Record<number, string>}
 */
const priceMap = (prices) =>
  Object.fromEntries(prices.map((p) => [p.tierQty, String(p.unitPrice)]));

/**
 * A grid pre-filled from the supplier's own earlier version, for a revision:
 * every value it stated, as text it can edit.
 * @param {RFQ} rfq
 * @param {Quotation} quote
 * @returns {TieredDraft}
 */
export function draftFromQuote(rfq, quote) {
  const base = emptyTieredDraft(rfq);
  return {
    ...base,
    currency: quote.currency ?? base.currency,
    validUntil: quote.validUntil,
    paymentTermsOffered: quote.paymentTermsOffered,
    notes: quote.notes ?? '',
    answers: Object.fromEntries((quote.answers ?? []).map((a) => [a.questionId, a])),
    canSample: quote.sampleOffer ? quote.sampleOffer.canSample : null,
    sampleReadyDate: quote.sampleOffer?.readyDate ?? '',
    // A quote from before NR-1 carries `attachments`: read as documents
    // answering no request, so a revision keeps them under "Other documents".
    documents: documentsOf(quote),
    items: base.items.map((d) => {
      const q = quote.itemQuotes?.find((x) => x.itemLineNo === d.lineNo);
      const alt = quote.alternatives?.find((x) => x.itemLineNo === d.lineNo);
      if (!q) return d;
      const costs = q.oneTimeCosts ?? [];
      return {
        ...d,
        specValues: Object.fromEntries((q.specValues ?? []).map((v) => [v.key, v.value])),
        prices: priceMap(q.tierPrices),
        moq: q.moq === undefined ? '' : String(q.moq),
        leadTimeDays: q.leadTimeDays === undefined ? '' : String(q.leadTimeDays),
        requestedCosts: Object.fromEntries(
          costs
            .filter((c) => c.costId)
            .map((c) => [/** @type {RfqOneTimeCostId} */ (c.costId), String(c.amount)])
        ),
        extraCosts: costs
          .filter((c) => !c.costId)
          .map((c) => newExtraCost(c.name, String(c.amount))),
        alternative: alt
          ? { enabled: true, description: alt.description, prices: priceMap(alt.tierPrices) }
          : d.alternative
      };
    })
  };
}

/**
 * @typedef {| { readonly ok: true; readonly payload: Record<string, unknown> }
 *   | { readonly ok: false; readonly reason: string }} TieredRead
 */

/**
 * Read one break's typed prices, or say which break cannot be read.
 * @param {RfqItem} item
 * @param {RFQ} rfq
 * @param {Readonly<Record<number, string>>} typed
 * @param {string} where
 * @returns {{ ok: true; prices: TierPrice[] } | { ok: false; reason: string }}
 */
function readPrices(item, rfq, typed, where) {
  /** @type {TierPrice[]} */
  const prices = [];
  for (const tier of tiersForItem(rfq, item)) {
    const raw = typed[tier.qty] ?? '';
    if (!raw.trim()) continue; // missing — the rule names it with every other gap
    const read = readBidPrice(raw);
    if (!read.ok)
      return { ok: false, reason: `TIER_PRICE_UNREADABLE: the price at ${tier.qty} on ${where}` };
    prices.push({ tierQty: tier.qty, unitPrice: read.value });
  }
  return { ok: true, prices };
}

/**
 * A typed amount, zero allowed ("no charge").
 * @param {string} raw
 * @returns {number | null}
 */
const readAmount = (raw) => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : null;
};

/**
 * THE ONE READ OF THE GRID. Parses every typed number, builds the full tiered
 * payload, and judges it with the verb's own rule. `costName` turns a requested
 * cost id into the name the supplier sees (the translated label).
 * @param {RFQ} rfq
 * @param {string} supplierId
 * @param {TieredDraft} draft
 * @param {(id: RfqOneTimeCostId) => string} costName
 * @returns {TieredRead}
 */
export function readTieredDraft(rfq, supplierId, draft, costName) {
  /** @type {QuotationItemQuote[]} */
  const itemQuotes = [];
  /** @type {QuotationAlternative[]} */
  const alternatives = [];
  for (const item of rfq.items ?? []) {
    const d = draft.items.find((x) => x.lineNo === item.lineNo) ?? emptyItem(item);
    const where = `item ${item.lineNo}`;
    const prices = readPrices(item, rfq, d.prices, where);
    if (!prices.ok) return prices;
    const moq = readMoq(d.moq);
    if (!moq.ok) return { ok: false, reason: `MOQ_UNREADABLE: the minimum on ${where}` };
    const lead = readLeadTimeDays(d.leadTimeDays, 'days');
    if (!lead.ok) return { ok: false, reason: `LEAD_TIME_UNREADABLE: the lead time on ${where}` };
    if (lead.days === 0)
      return { ok: false, reason: `LEAD_TIME_ZERO: the lead time on ${where} is at least one day` };
    /** @type {OneTimeCostQuote[]} */
    const costs = [];
    for (const id of item.oneTimeCosts ?? []) {
      const raw = d.requestedCosts[id] ?? '';
      if (!raw.trim()) continue; // missing — named by the rule
      const amount = readAmount(raw);
      if (amount === null)
        return { ok: false, reason: `COST_UNREADABLE: ${costName(id)} on ${where}` };
      costs.push({ name: costName(id), amount, costId: id });
    }
    for (const extra of d.extraCosts) {
      if (!extra.name.trim() && !extra.amount.trim()) continue;
      const amount = readAmount(extra.amount);
      if (amount === null)
        return { ok: false, reason: `COST_UNREADABLE: ${extra.name || '—'} on ${where}` };
      costs.push({ name: extra.name.trim(), amount });
    }
    const specValues = Object.entries(d.specValues)
      .filter(([, v]) => v.trim())
      .map(([key, value]) => ({ key, value: value.trim() }));
    itemQuotes.push({
      itemLineNo: item.lineNo,
      ...(specValues.length > 0 ? { specValues } : {}),
      tierPrices: prices.prices,
      ...(moq.moq !== null ? { moq: moq.moq } : {}),
      leadTimeDays: lead.days,
      ...(costs.length > 0 ? { oneTimeCosts: costs } : {})
    });
    if (rfq.allowAlternatives && d.alternative.enabled) {
      const altPrices = readPrices(item, rfq, d.alternative.prices, `the alternative on ${where}`);
      if (!altPrices.ok) return altPrices;
      alternatives.push({
        itemLineNo: item.lineNo,
        description: d.alternative.description.trim(),
        tierPrices: altPrices.prices
      });
    }
  }
  if (!draft.validUntil.trim())
    return { ok: false, reason: 'VALID_UNTIL_MISSING: a quote states how long it holds' };
  // A number answer is typed as text and read here, through the one parser.
  const answers = Object.values(draft.answers)
    .filter((a) => a.value !== undefined && a.value !== '')
    .map((a) => {
      const q = rfq.questions?.find((x) => x.id === a.questionId);
      if (q?.type !== 'numberWithUnit' || typeof a.value !== 'string') return a;
      const read = normalizeQty(a.value);
      return read.ok ? { ...a, value: read.value } : a;
    });
  const header = deriveQuoteHeader(rfq, itemQuotes);
  /** @type {Record<string, unknown>} */
  const payload = {
    rfqId: rfq.id,
    supplierId,
    currency: draft.currency,
    // The header is derived by the store from the grid; the flow still asks
    // for the two figures, so the grid sends the same derivation it will store.
    unitPrice: header?.unitPrice ?? 0,
    leadTimeDays: headerLeadTimeDays(itemQuotes) ?? 0,
    validUntil: draft.validUntil,
    paymentTermsOffered: draft.paymentTermsOffered.trim(),
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    itemQuotes,
    ...(alternatives.length > 0 ? { alternatives } : {}),
    ...(answers.length > 0 ? { answers } : {}),
    ...(draft.canSample !== null
      ? {
          sampleOffer: draft.canSample
            ? {
                canSample: true,
                ...(draft.sampleReadyDate ? { readyDate: draft.sampleReadyDate } : {})
              }
            : { canSample: false }
        }
      : {}),
    ...(draft.documents.length > 0 ? { documents: draft.documents.map((d) => ({ ...d })) } : {})
  };
  const refusal = tieredQuoteRefusal(rfq, payload);
  if (refusal) return { ok: false, reason: refusal };
  // NR-1 BR-03 to BR-05 — the rule `quotation_documents_complete` binds, over
  // the same documents and the files on the answers.
  const answerFiles = answers.reduce((n, a) => n + (a.attachments?.length ?? 0), 0);
  const documentRefusal = responseDocumentsRefusal(
    rfq.documentRequests ?? [],
    draft.documents,
    answerFiles
  );
  return documentRefusal ? { ok: false, reason: documentRefusal } : { ok: true, payload };
}

/**
 * The item number a `CODE: … item N …` refusal names, or `null`.
 * @param {string} reason
 * @returns {number | null}
 */
export const refusalItem = (reason) => {
  const m = /item (\d+)/.exec(reason);
  return m ? Number(m[1]) : null;
};

// ── S-02 · every gap in the grid, at once ──────────────────────────────────

/**
 * One field of the grid the supplier still has to fill (`missing`) or fix.
 * `anchor` is the field's DOM id in `TieredQuoteForm`; `field` says what it is,
 * so the panel can name it in the reader's language.
 * @typedef {{
 *   readonly anchor: string;
 *   readonly missing: boolean;
 *   readonly field:
 *     | { readonly kind: 'price' | 'altPrice'; readonly n: number; readonly qty: number }
 *     | { readonly kind: 'spec'; readonly n: number; readonly spec: RfqSpecField }
 *     | { readonly kind: 'moq' | 'lead' | 'altDescription'; readonly n: number }
 *     | { readonly kind: 'cost'; readonly n: number; readonly costId: RfqOneTimeCostId }
 *     | { readonly kind: 'extraCost'; readonly n: number; readonly index: number }
 *     | { readonly kind: 'question'; readonly questionId: string }
 *     | { readonly kind: 'validUntil' | 'sample' | 'sampleDate' | 'documents' };
 * }} GridProblem
 */

/** @param {RfiAnswer | undefined} a */
const isAnswered = (a) => {
  const v = a?.value;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  return typeof v === 'string' && v.trim().length > 0;
};

/** @param {string} v */
const isCalendarDate = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));

/**
 * S-02 — EVERY field of the grid that `readTieredDraft` would refuse, in form
 * order, so the panel can list them all and mark each where it sits instead
 * of saying the first one. It reads the grid with the same parsers
 * (`readBidPrice`, `readMoq`, `readLeadTimeDays`, `normalizeQty`) and the same
 * answer rule (`answerTypeRefusal`) as `readTieredDraft`; Submit still goes
 * through `readTieredDraft`, which stays the one gate.
 * `sampleDateQuestionId` (S-06): the buyer question that asks the sample ready
 * date, when the form asks it there instead of in the sample offer.
 * @param {RFQ} rfq
 * @param {TieredDraft} draft
 * @param {string | null} [sampleDateQuestionId]
 * @returns {GridProblem[]}
 */
export function tieredDraftProblems(rfq, draft, sampleDateQuestionId = null) {
  /** @type {GridProblem[]} */
  const out = [];
  /**
   * @param {string} anchor
   * @param {boolean} missing
   * @param {GridProblem['field']} field
   */
  const add = (anchor, missing, field) => out.push({ anchor, missing, field });
  /**
   * @param {RfqItem} item
   * @param {Readonly<Record<number, string>>} typed
   * @param {string} prefix
   * @param {'price' | 'altPrice'} kind
   */
  const prices = (item, typed, prefix, kind) => {
    for (const tier of tiersForItem(rfq, item)) {
      const raw = (typed[tier.qty] ?? '').trim();
      if (!raw) add(`${prefix}-${tier.qty}`, true, { kind, n: item.lineNo, qty: tier.qty });
      else if (!readBidPrice(raw).ok)
        add(`${prefix}-${tier.qty}`, false, { kind, n: item.lineNo, qty: tier.qty });
    }
  };
  for (const item of rfq.items ?? []) {
    const d = draft.items.find((x) => x.lineNo === item.lineNo) ?? emptyItem(item);
    const n = item.lineNo;
    const tid = `grid-item-${n}`;
    for (const spec of item.specFields.filter((f) => f.filledBy === 'supplier')) {
      const v = (d.specValues[spec.key] ?? '').trim();
      const anchor = `${tid}-spec-${spec.key}`;
      if (!v) {
        if (spec.required) add(anchor, true, { kind: 'spec', n, spec });
      } else if (
        (spec.kind === 'number' && !normalizeQty(v).ok) ||
        (spec.kind === 'choice' && !(spec.options ?? []).includes(v))
      ) {
        add(anchor, false, { kind: 'spec', n, spec });
      }
    }
    prices(item, d.prices, `${tid}-price`, 'price');
    if (!readMoq(d.moq).ok) add(`${tid}-moq`, false, { kind: 'moq', n });
    const lead = readLeadTimeDays(d.leadTimeDays, 'days');
    if (!lead.ok) add(`${tid}-lead`, !d.leadTimeDays.trim(), { kind: 'lead', n });
    else if (lead.days === 0) add(`${tid}-lead`, false, { kind: 'lead', n });
    for (const costId of item.oneTimeCosts ?? []) {
      const raw = (d.requestedCosts[costId] ?? '').trim();
      if (!raw) add(`${tid}-cost-${costId}`, true, { kind: 'cost', n, costId });
      else if (readAmount(raw) === null)
        add(`${tid}-cost-${costId}`, false, { kind: 'cost', n, costId });
    }
    d.extraCosts.forEach((c, index) => {
      if (!c.name.trim() && !c.amount.trim()) return;
      if (!c.name.trim() || readAmount(c.amount) === null)
        add(`${tid}-extra-${c.id}`, false, { kind: 'extraCost', n, index });
    });
    if (rfq.allowAlternatives && d.alternative.enabled) {
      if (!d.alternative.description.trim())
        add(`${tid}-alt-description`, true, { kind: 'altDescription', n });
      prices(item, d.alternative.prices, `${tid}-alt-price`, 'altPrice');
    }
  }
  if (!draft.validUntil.trim()) add('grid-valid-until', true, { kind: 'validUntil' });
  for (const q of rfq.questions ?? []) {
    const a = draft.answers[q.id];
    const anchor = `grid-q-${q.id}`;
    if (!isAnswered(a)) {
      if (q.required) add(anchor, true, { kind: 'question', questionId: q.id });
      continue;
    }
    const read =
      q.type === 'numberWithUnit' && typeof a.value === 'string' ? normalizeQty(a.value) : null;
    const judged = read?.ok ? { ...a, value: read.value } : a;
    if (answerTypeRefusal(q, judged)) add(anchor, false, { kind: 'question', questionId: q.id });
  }
  if (rfq.samplesRequested && draft.canSample === null)
    add('grid-sample', true, { kind: 'sample' });
  if (draft.canSample === true && !isCalendarDate(draft.sampleReadyDate)) {
    if (sampleDateQuestionId)
      add(`grid-q-${sampleDateQuestionId}`, true, {
        kind: 'question',
        questionId: sampleDateQuestionId
      });
    else add('grid-sample-date', !draft.sampleReadyDate, { kind: 'sampleDate' });
  }
  // The files counted the way `readTieredDraft` counts them: on given answers.
  const answerFiles = Object.values(draft.answers)
    .filter((a) => a.value !== undefined && a.value !== '')
    .reduce((count, a) => count + (a.attachments?.length ?? 0), 0);
  if (responseDocumentsRefusal(rfq.documentRequests ?? [], draft.documents, answerFiles))
    add('grid-documents', false, { kind: 'documents' });
  // One field, one entry: a sample-date question that is also required and
  // empty is named once.
  const seen = new Set();
  return out.filter((p) => (seen.has(p.anchor) ? false : (seen.add(p.anchor), true)));
}
