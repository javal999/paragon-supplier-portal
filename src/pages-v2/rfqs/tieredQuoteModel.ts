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

import { normalizeQty } from '../../lib/localeNumber';
import type { BidCurrency } from '../../lib/currencyPolicy';
import type { RFQ } from '../../data/mockRfqs';
import type { Quotation } from '../../data/mockQuotations';
import type { RfiAnswer } from '../../services/sourcing/types';
import {
  deriveQuoteHeader,
  tiersForItem,
  type OneTimeCostQuote,
  type QuotationAlternative,
  type QuotationItemQuote,
  type RfqItem,
  type RfqOneTimeCostId,
  type TierPrice,
} from '../../services/sourcing/rfqModel';
import { headerLeadTimeDays, tieredQuoteRefusal } from '../../services/sourcing/rfqResponse';
import { readBidPrice } from './quotationPrice';
import { readMoq } from './quotationMoq';
import { readLeadTimeDays } from './quotationLeadTime';
import { documentsOf, responseDocumentsRefusal } from '../../services/transitions/rfxDocumentRules';
import type { DocumentDraft } from '../rfx/ResponseDocumentsSection';

/** A cost the supplier added beyond the ones the buyer asked for. */
export interface ExtraCostDraft {
  readonly name: string;
  readonly amount: string;
}

/** What the supplier typed for one item. */
export interface ItemDraft {
  readonly lineNo: number;
  /** Supplier-filled spec values, by field key. */
  readonly specValues: Readonly<Record<string, string>>;
  /** The unit price at each break, by break quantity. */
  readonly prices: Readonly<Record<number, string>>;
  readonly moq: string;
  /** Whole days. */
  readonly leadTimeDays: string;
  /** An amount for each one-time cost the buyer requested. */
  readonly requestedCosts: Readonly<Partial<Record<RfqOneTimeCostId, string>>>;
  readonly extraCosts: readonly ExtraCostDraft[];
  readonly alternative: {
    readonly enabled: boolean;
    readonly description: string;
    readonly prices: Readonly<Record<number, string>>;
  };
}

/** The whole grid. */
export interface TieredDraft {
  readonly currency: BidCurrency;
  readonly validUntil: string;
  readonly paymentTermsOffered: string;
  readonly notes: string;
  readonly answers: Readonly<Record<string, RfiAnswer>>;
  /** `null` = not answered yet. */
  readonly canSample: boolean | null;
  readonly sampleReadyDate: string;
  /** NR-1 — the Documents section: the requested slots and "Other documents". */
  readonly documents: readonly DocumentDraft[];
  readonly items: readonly ItemDraft[];
}

const emptyItem = (item: RfqItem): ItemDraft => ({
  lineNo: item.lineNo,
  specValues: {},
  prices: {},
  moq: '',
  leadTimeDays: '',
  requestedCosts: {},
  extraCosts: [],
  alternative: { enabled: false, description: '', prices: {} },
});

/** A blank grid for an RFQ. Payment terms start from the buyer's asked terms. */
export function emptyTieredDraft(rfq: RFQ): TieredDraft {
  return {
    currency: rfq.currency,
    validUntil: '',
    paymentTermsOffered: rfq.paymentTerms,
    notes: '',
    answers: {},
    canSample: null,
    sampleReadyDate: '',
    documents: [],
    items: (rfq.items ?? []).map(emptyItem),
  };
}

const priceMap = (prices: readonly TierPrice[]): Record<number, string> =>
  Object.fromEntries(prices.map((p) => [p.tierQty, String(p.unitPrice)]));

/**
 * A grid pre-filled from the supplier's own earlier version, for a revision:
 * every value it stated, as text it can edit.
 */
export function draftFromQuote(rfq: RFQ, quote: Quotation): TieredDraft {
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
          costs.filter((c) => c.costId).map((c) => [c.costId!, String(c.amount)]),
        ),
        extraCosts: costs.filter((c) => !c.costId).map((c) => ({ name: c.name, amount: String(c.amount) })),
        alternative: alt
          ? { enabled: true, description: alt.description, prices: priceMap(alt.tierPrices) }
          : d.alternative,
      };
    }),
  };
}

export type TieredRead =
  | { readonly ok: true; readonly payload: Record<string, unknown> }
  | { readonly ok: false; readonly reason: string };

/** Read one break's typed prices, or say which break cannot be read. */
function readPrices(
  item: RfqItem,
  rfq: RFQ,
  typed: Readonly<Record<number, string>>,
  where: string,
): { ok: true; prices: TierPrice[] } | { ok: false; reason: string } {
  const prices: TierPrice[] = [];
  for (const tier of tiersForItem(rfq, item)) {
    const raw = typed[tier.qty] ?? '';
    if (!raw.trim()) continue; // missing — the rule names it with every other gap
    const read = readBidPrice(raw);
    if (!read.ok) return { ok: false, reason: `TIER_PRICE_UNREADABLE: the price at ${tier.qty} on ${where}` };
    prices.push({ tierQty: tier.qty, unitPrice: read.value });
  }
  return { ok: true, prices };
}

/** A typed amount, zero allowed ("no charge"). */
const readAmount = (raw: string): number | null => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : null;
};

/**
 * THE ONE READ OF THE GRID. Parses every typed number, builds the full tiered
 * payload, and judges it with the verb's own rule. `costName` turns a requested
 * cost id into the name the supplier sees (the translated label).
 */
export function readTieredDraft(
  rfq: RFQ,
  supplierId: string,
  draft: TieredDraft,
  costName: (id: RfqOneTimeCostId) => string,
): TieredRead {
  const itemQuotes: QuotationItemQuote[] = [];
  const alternatives: QuotationAlternative[] = [];
  for (const item of rfq.items ?? []) {
    const d = draft.items.find((x) => x.lineNo === item.lineNo) ?? emptyItem(item);
    const where = `item ${item.lineNo}`;
    const prices = readPrices(item, rfq, d.prices, where);
    if (!prices.ok) return prices;
    const moq = readMoq(d.moq);
    if (!moq.ok) return { ok: false, reason: `MOQ_UNREADABLE: the minimum on ${where}` };
    const lead = readLeadTimeDays(d.leadTimeDays, 'days');
    if (!lead.ok) return { ok: false, reason: `LEAD_TIME_UNREADABLE: the lead time on ${where}` };
    if (lead.days === 0) return { ok: false, reason: `LEAD_TIME_ZERO: the lead time on ${where} is at least one day` };
    const costs: OneTimeCostQuote[] = [];
    for (const id of item.oneTimeCosts ?? []) {
      const raw = d.requestedCosts[id] ?? '';
      if (!raw.trim()) continue; // missing — named by the rule
      const amount = readAmount(raw);
      if (amount === null) return { ok: false, reason: `COST_UNREADABLE: ${costName(id)} on ${where}` };
      costs.push({ name: costName(id), amount, costId: id });
    }
    for (const extra of d.extraCosts) {
      if (!extra.name.trim() && !extra.amount.trim()) continue;
      const amount = readAmount(extra.amount);
      if (amount === null) return { ok: false, reason: `COST_UNREADABLE: ${extra.name || '—'} on ${where}` };
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
      ...(costs.length > 0 ? { oneTimeCosts: costs } : {}),
    });
    if (rfq.allowAlternatives && d.alternative.enabled) {
      const altPrices = readPrices(item, rfq, d.alternative.prices, `the alternative on ${where}`);
      if (!altPrices.ok) return altPrices;
      alternatives.push({ itemLineNo: item.lineNo, description: d.alternative.description.trim(), tierPrices: altPrices.prices });
    }
  }
  if (!draft.validUntil.trim()) return { ok: false, reason: 'VALID_UNTIL_MISSING: a quote states how long it holds' };
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
  const payload: Record<string, unknown> = {
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
            ? { canSample: true, ...(draft.sampleReadyDate ? { readyDate: draft.sampleReadyDate } : {}) }
            : { canSample: false },
        }
      : {}),
    ...(draft.documents.length > 0 ? { documents: draft.documents.map((d) => ({ ...d })) } : {}),
  };
  const refusal = tieredQuoteRefusal(rfq, payload);
  if (refusal) return { ok: false, reason: refusal };
  // NR-1 BR-03 to BR-05 — the rule `quotation_documents_complete` binds, over
  // the same documents and the files on the answers.
  const answerFiles = answers.reduce((n, a) => n + (a.attachments?.length ?? 0), 0);
  const documentRefusal = responseDocumentsRefusal(rfq.documentRequests ?? [], draft.documents, answerFiles);
  return documentRefusal ? { ok: false, reason: documentRefusal } : { ok: true, payload };
}

/** The item number a `CODE: … item N …` refusal names, or `null`. */
export const refusalItem = (reason: string): number | null => {
  const m = /item (\d+)/.exec(reason);
  return m ? Number(m[1]) : null;
};
