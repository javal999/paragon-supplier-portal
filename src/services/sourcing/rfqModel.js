// ────────────────────────────────────────────────────────────────────────────
// THE RFQ, REBUILT AROUND THE SAMPLES — the data model (RFx working spec,
// 2026-09-21, "RFQ, rebuilt around the samples").
//
// Paragon's real RFQs (Oslo stickers, Iron unit box, Redwood 2.0 mold, Tundra
// bottle and pump) are not "one material, one quantity, one price". They are a
// set of ITEMS, each described by a spec sheet half of which the buyer fills and
// half of which the supplier fills, priced at several QUANTITY BREAKS, with
// one-time costs (a mold, a die-cut plate) quoted beside the unit price. This
// module is that shape, and the pure rules that decide whether a draft of it is
// sound.
//
// ⚠️ **EVERY FIELD BELOW IS OPTIONAL ON THE ENTITY, AND THAT IS THE VERSIONING
// RULE, NOT LAXNESS.** Thirty sourcing events and every spec in the tree were
// written against the single-item RFQ. An RFQ with no `items` is that event,
// unchanged: `totalQty` is its quantity and `unitPrice` its answer. The create
// verb therefore validates the new shape WHEN IT IS SENT, and a legacy dispatch
// that sends none of it is not refused for lacking it.
//
// The supplier-side screens (the quote grid) and the comparison and split award
// are built on this model by later batches; the shapes they need are defined
// here now so they are not invented twice.
// ────────────────────────────────────────────────────────────────────────────

/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BID_CURRENCIES } from '@lib/currencyPolicy';
import { normalizeQty } from '@lib/localeNumber';
/** @import { DocumentRequest, ResponseDocument, RfiAnswer, RfiQuestion, RfiQuestionType } from './types' */
import { documentRequestsRefusal } from '../transitions/rfxDocumentRules';
import { builtInRefusal } from './rfxBuiltIn';

// ── The item ────────────────────────────────────────────────────────────────

/** The item types Procurement keeps a spec template for (`rfqItemTypes.js`). */
/** @typedef {'sticker' | 'unitBox' | 'bottleClosure' | 'moldComponent' | 'other'} RfqItemTypeId */

/** @type {readonly RfqItemTypeId[]} */
export const RFQ_ITEM_TYPE_IDS = ['sticker', 'unitBox', 'bottleClosure', 'moldComponent', 'other'];

/** How a spec value is entered: free text, a number with a unit, or a choice. */
/** @typedef {'text' | 'number' | 'choice'} RfqSpecFieldKind */

/**
 * WHO answers a spec field. The buyer states what is wanted (material, size,
 * colours); the supplier states how it will be made (machine, cavities, cycle
 * time). One sheet, two authors, and the field says which.
 */
/** @typedef {'buyer' | 'supplier'} RfqSpecFilledBy */

/** One row of an item's spec sheet. */
/**
 * `key`:  Stable within the item. Library fields use the library key; a custom field  gets `custom-<n>`.
 * `labelKey`:  i18n key for a library field.
 * `label`:  The buyer's own words for a custom field. Not translated: it is user text.
 * `unitKey`:  i18n key for the unit of a `number` field.
 * `options`:  Option ids of a `choice` field; i18n key `rfqAuthoring.opt.<id>`.
 * `value`:  The buyer's value. Only meaningful when `filledBy === 'buyer'`.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly labelKey?: string;
 *   readonly label?: string;
 *   readonly kind: RfqSpecFieldKind;
 *   readonly unitKey?: string;
 *   readonly options?: readonly string[];
 *   readonly filledBy: RfqSpecFilledBy;
 *   readonly required: boolean;
 *   readonly value?: string;
 * }} RfqSpecField
 */

/**
 * A file's METADATA. There is no file store (BL-27): the bytes live in the
 * browser session only, behind an object URL held by
 * `sessionAttachmentStore`, and a record keeps nothing but this.
 */
/**
 * `size`:  Bytes.
 * `type`:  The MIME type the browser reported; `''` when it reported none.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly name: string;
 *   readonly size: number;
 *   readonly type: string;
 *   readonly addedAt: string;
 * }} AttachmentMeta
 */

/** The one-time costs a buyer can ask to be quoted. The supplier may add others. */
/** @typedef {'mold' | 'dieCutPlate' | 'printingPlate' | 'development'} RfqOneTimeCostId */

/** @type {readonly RfqOneTimeCostId[]} */
export const RFQ_ONE_TIME_COST_IDS = ['mold', 'dieCutPlate', 'printingPlate', 'development'];

/** Whether a quantity break counts each variant or the item as a whole. */
/** @typedef {'perVariant' | 'total'} RfqTierBasis */

/** One quantity break the supplier prices at. */
/**
 * @typedef {{
 *   readonly qty: number;
 *   readonly basis: RfqTierBasis;
 * }} RfqQuantityTier
 */

/** The most breaks one RFQ (or one item override) may carry. */
export const MAX_QUANTITY_TIERS = 8;

/** One item being sourced. */
/**
 * `variantCount`:  Number of variants or SKUs the item comes in (8 Oslo sticker designs).
 * `note`:  e.g. "Spec is the same as the existing Amplify variant sticker".
 * `oneTimeCosts`:  The one-time costs the buyer wants quoted for this item.
 * `tiers`:  This item's own breaks. Absent = the RFQ's breaks apply.
 *
 * @typedef {{
 *   readonly lineNo: number;
 *   readonly itemType: RfqItemTypeId;
 *   readonly description: string;
 *   readonly variantCount: number;
 *   readonly uom: string;
 *   readonly specFields: readonly RfqSpecField[];
 *   readonly note?: string;
 *   readonly attachments?: readonly AttachmentMeta[];
 *   readonly oneTimeCosts?: readonly RfqOneTimeCostId[];
 *   readonly tiers?: readonly RfqQuantityTier[];
 * }} RfqItem
 */

/** "Samples requested": how many, and by when. */
/**
 * @typedef {{
 *   readonly qty: number;
 *   readonly neededBy: string;
 * }} RfqSamplesRequest
 */

/**
 * The RFQ fields the rebuilt authoring adds. Spread into `RFQ` (in
 * `data/mockRfqs.js`) so the entity stays one interface and a reader never has
 * to ask which half it holds.
 */
/**
 * @typedef {object} RfqAuthoringFields
 * @property {string} [projectName] -  The programme the RFQ belongs to ("Oslo"), shown as a tag.
 * @property {readonly RfqItem[]} [items]
 * @property {readonly RfqQuantityTier[]} [tiers]
 * @property {readonly RfiQuestion[]} [questions] -  The same typed questions an RFI asks (`RfiQuestion`).
 * @property {boolean} [allowAlternatives] -  Off by default; an alternative offer is shown apart and not ranked.
 * @property {RfqSamplesRequest} [samplesRequested]
 * @property {boolean} [confidential] -  Hides the attachments and spec until the supplier accepts the terms.
 * @property {readonly AttachmentMeta[]} [attachments] -  Event-level reference files (session only, BL-27).
 * @property {string} [sourceRfpId] -  The RFP this RFQ was created from (D3).
 * @property {readonly string[]} [sourceRfpOptionRefs] RFx D2 (NR-2 BR-08) — the RFP options this RFQ sources, by ref
 *   (`rfpOptionRef`). An option named here cannot also be awarded on the RFP,
 *   and an option already awarded there cannot be named here.
 * @property {string} [copiedFromRfqId] -  The past RFQ this one was copied from (D2).
 * @property {string} [templateId] -  The template this RFQ started from (D2).
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-02 — the documents the buyer asks every supplier for.
 */

// ── The supplier's answer (the quotation extension) ─────────────────────────

/** A unit price at one quantity break. */
/**
 * @typedef {{
 *   readonly tierQty: number;
 *   readonly unitPrice: number;
 * }} TierPrice
 */

/** A one-time cost as the supplier quotes it. */
/**
 * `costId`:  The requested cost this answers. Absent on a cost the supplier added.
 *
 * @typedef {{
 *   readonly name: string;
 *   readonly amount: number;
 *   readonly costId?: RfqOneTimeCostId;
 * }} OneTimeCostQuote
 */

/** A supplier-filled spec value. */
/**
 * @typedef {{
 *   readonly key: string;
 *   readonly value: string;
 * }} SpecValue
 */

/** The supplier's answer for ONE item of a tiered RFQ. */
/**
 * @typedef {{
 *   readonly itemLineNo: number;
 *   readonly specValues?: readonly SpecValue[];
 *   readonly tierPrices: readonly TierPrice[];
 *   readonly moq?: number;
 *   readonly leadTimeDays?: number;
 *   readonly oneTimeCosts?: readonly OneTimeCostQuote[];
 * }} QuotationItemQuote
 */

/** An alternative offer — shown apart from the main quote, never ranked by default. */
/**
 * @typedef {{
 *   readonly itemLineNo: number;
 *   readonly description: string;
 *   readonly tierPrices: readonly TierPrice[];
 * }} QuotationAlternative
 */

/** "Can sample, ready date" — which must actually be saved. */
/**
 * @typedef {{
 *   readonly canSample: boolean;
 *   readonly readyDate?: string;
 * }} SampleOffer
 */

/**
 * The quotation fields the tiered RFQ adds. Validity stays the existing
 * `validUntil`, and the header `unitPrice` / `totalPrice` stay DERIVED from
 * these (`deriveQuoteHeader`) so the existing scoring and comparison keep
 * reading a number they understand.
 */
/**
 * @typedef {object} QuotationTieredFields
 * @property {readonly QuotationItemQuote[]} [itemQuotes]
 * @property {readonly QuotationAlternative[]} [alternatives]
 * @property {readonly RfiAnswer[]} [answers]
 * @property {SampleOffer} [sampleOffer]
 * @property {readonly AttachmentMeta[]} [attachments] The files a quote carried before NR-1. Read them through `documentsOf`,
 *   which returns them as documents answering no request.
 * @property {readonly ResponseDocument[]} [documents] -  NR-1 BR-01 — the supplier's files, each answering a request or none.
 */

// ── The supplier-response records (model only; the screens come later) ──────

/**
 * Every decline reason a supplier may give on an RFQ, RFI or RFP (owner ruling
 * 2026-10-22, RFX-D31): a shared core plus the reasons that fit only some
 * event types. Each event type takes ITS list (`RFQ_DECLINE_REASONS` here,
 * `RFX_DECLINE_REASONS` in `rfxIntent.js`).
 * @typedef {| 'notOurProduct'
 *   | 'noCapacity'
 *   | 'complianceNotMet'
 *   | 'termsNotAcceptable'
 *   | 'commercialTermsNotMet'
 *   | 'cannotDevelop'
 *   | 'leadTimeTooShort'
 *   | 'quantityTooSmall'
 *   | 'specUnclear'
 *   | 'other'} RfqDeclineReason
 */

/**
 * The reasons an RFQ may be declined for, in the order the form lists them.
 * @type {readonly RfqDeclineReason[]}
 */
export const RFQ_DECLINE_REASONS = [
  'notOurProduct',
  'noCapacity',
  'complianceNotMet',
  'leadTimeTooShort',
  'quantityTooSmall',
  'specUnclear',
  'other'
];

/** The supplier's first answer: "I will respond", or a reasoned decline. */
/**
 *  Required with the reason; the buyer sees both.
 *
 * @typedef {| {
 *       readonly rfqId: string;
 *       readonly supplierId: string;
 *       readonly intent: 'respond';
 *       readonly at: string;
 *     }
 *   | {
 *       readonly rfqId: string;
 *       readonly supplierId: string;
 *       readonly intent: 'decline';
 *       readonly reason: RfqDeclineReason;
 *       readonly text: string;
 *       readonly at: string;
 *     }} RfqIntent
 */

/** A confidential RFQ's terms, accepted once, with the time recorded. */
/**
 * @typedef {{
 *   readonly rfqId: string;
 *   readonly supplierId: string;
 *   readonly acceptedAt: string;
 * }} ConfidentialityAcceptance
 */

/**
 * A clarification question. A PUBLISHED answer reaches every invitee with the
 * asker's identity hidden; a PRIVATE one reaches the asker only.
 */
/**
 * @typedef {{
 *   readonly id: string;
 *   readonly rfqId: string;
 *   readonly askedBy: string;
 *   readonly askedAt: string;
 *   readonly question: string;
 *   readonly answer?: string;
 *   readonly answeredAt?: string;
 *   readonly visibility: 'private' | 'published';
 * }} RfqClarification
 */

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * The breaks in force for one item: its own override, else the RFQ's.
 * @param {{ readonly tiers?: readonly RfqQuantityTier[] }} rfq
 * @param {RfqItem} item
 * @returns {readonly RfqQuantityTier[]}
 */
export function tiersForItem(rfq, item) {
  return item.tiers && item.tiers.length > 0 ? item.tiers : (rfq.tiers ?? []);
}

/**
 * The pieces a break means for one item: per variant multiplies by the variants.
 * @param {RfqQuantityTier} tier
 * @param {Pick<RfqItem, 'variantCount'>} item
 * @returns {number}
 */
export function tierPieces(tier, item) {
  return tier.basis === 'perVariant' ? tier.qty * Math.max(1, item.variantCount) : tier.qty;
}

/**
 * The header figures a tiered quote DERIVES, so the existing composite score and
 * comparison keep working unchanged.
 *
 * The rule is stated rather than chosen silently: every item is evaluated at the
 * FIRST break in force for it (the smallest committed quantity), so
 * `totalPrice` = Σ unit price × pieces at that break + the quoted one-time costs,
 * and `unitPrice` = `totalPrice` ÷ the RFQ's `totalQty`. The same rule for every
 * quote on the event, which is all a ranking needs. The comparison screen will
 * let the buyer choose the evaluation break; this is only the backward-
 * compatible header. Returns `null` when an item has no price at its first break
 * — a header built from a missing price would be a number nobody quoted.
 * @param {{ readonly tiers?: readonly RfqQuantityTier[]; readonly items?: readonly RfqItem[]; readonly totalQty: number }} rfq
 * @param {readonly QuotationItemQuote[]} itemQuotes
 * @returns {{ unitPrice: number; totalPrice: number } | null}
 */
export function deriveQuoteHeader(rfq, itemQuotes) {
  const items = rfq.items ?? [];
  if (items.length === 0 || rfq.totalQty <= 0) return null;
  let total = 0;
  for (const item of items) {
    const first = tiersForItem(rfq, item)[0];
    const quote = itemQuotes.find((q) => q.itemLineNo === item.lineNo);
    const price = first ? quote?.tierPrices.find((p) => p.tierQty === first.qty) : undefined;
    if (!first || !quote || !price) return null;
    total += price.unitPrice * tierPieces(first, item);
    total += (quote.oneTimeCosts ?? []).reduce((s, c) => s + c.amount, 0);
  }
  return { totalPrice: total, unitPrice: Math.round((total / rfq.totalQty) * 100) / 100 };
}

// ── The create verb's rule (`rfq_create_valid`) ─────────────────────────────

/** @type {readonly RfiQuestionType[]} */
const QUESTION_TYPES = [
  'yesNo',
  'singleChoice',
  'multipleChoice',
  'numberWithUnit',
  'date',
  'text',
  'attachment'
];

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isDate = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(`${v}T00:00:00Z`));

/**
 * Why a set of quantity breaks is refused, or `null`. 1 to 8 breaks, each a
 * positive whole number, strictly increasing, each with a known basis.
 * @param {unknown} tiers
 * @param {string} where
 * @returns {string | null}
 */
export function tiersRefusal(tiers, where) {
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > MAX_QUANTITY_TIERS) {
    return `TIER_COUNT: ${where} needs 1 to ${MAX_QUANTITY_TIERS} quantity breaks`;
  }
  let prev = 0;
  for (const t of /** @type {{ qty?: unknown; basis?: unknown }[]} */ (tiers)) {
    if (typeof t?.qty !== 'number' || !Number.isInteger(t.qty) || t.qty <= 0) {
      return `TIER_NOT_POSITIVE: every quantity break on ${where} is a positive whole number`;
    }
    if (t.basis !== 'perVariant' && t.basis !== 'total') {
      return `TIER_BASIS_UNKNOWN: a quantity break on ${where} is neither per variant nor total`;
    }
    if (t.qty <= prev) {
      return `TIERS_NOT_INCREASING: the quantity breaks on ${where} must increase`;
    }
    prev = t.qty;
  }
  return null;
}

/**
 * Why an item is refused, or `null`. It names a known type, says what it is,
 * comes in at least one variant, and every REQUIRED field the BUYER fills has a
 * value. A supplier-filled field is the supplier's to answer, so an empty one
 * is the normal state of a sent RFQ, not a defect in it.
 * @param {unknown} item
 * @param {number} index
 * @param {{ readonly requireValues?: boolean }} [opts]
 * @returns {string | null}
 */
export function itemRefusal(
  item,
  index,
  /** A TEMPLATE keeps the sheet, not the answers: its buyer values may be blank. */
  opts = {}
) {
  const it = /** @type {Partial<RfqItem> | null} */ (item);
  const where = `item ${index + 1}`;
  if (!it || typeof it !== 'object') return `ITEM_INCOMPLETE: ${where} is not an item`;
  if (!RFQ_ITEM_TYPE_IDS.includes(/** @type {RfqItemTypeId} */ (it.itemType))) {
    return `ITEM_TYPE_UNKNOWN: ${where} names no item type Procurement keeps`;
  }
  if (typeof it.description !== 'string' || it.description.trim() === '') {
    return `ITEM_INCOMPLETE: ${where} needs a description`;
  }
  if (
    typeof it.variantCount !== 'number' ||
    !Number.isInteger(it.variantCount) ||
    it.variantCount < 1
  ) {
    return `VARIANTS_INVALID: ${where} comes in at least one variant`;
  }
  if (!Array.isArray(it.specFields)) return `ITEM_INCOMPLETE: ${where} has no spec sheet`;
  for (const f of it.specFields) {
    if (!f || typeof f.key !== 'string' || !['text', 'number', 'choice'].includes(f.kind)) {
      return `ITEM_INCOMPLETE: a spec field on ${where} is malformed`;
    }
    if (f.filledBy !== 'buyer' && f.filledBy !== 'supplier') {
      return `ITEM_INCOMPLETE: a spec field on ${where} names nobody to fill it`;
    }
  }
  const missing = it.specFields
    .filter(
      (f) =>
        f.filledBy === 'buyer' && f.required && !(typeof f.value === 'string' && f.value.trim())
    )
    .map((f) => f.label ?? f.key);
  if ((opts.requireValues ?? true) && missing.length > 0) {
    return `ITEM_SPEC_MISSING: ${where} needs ${missing.join(', ')}`;
  }
  for (const c of it.oneTimeCosts ?? []) {
    if (!RFQ_ONE_TIME_COST_IDS.includes(c))
      return `ONE_TIME_COST_UNKNOWN: ${String(c)} on ${where}`;
  }
  if (it.tiers !== undefined) {
    const t = tiersRefusal(it.tiers, where);
    if (t) return t;
  }
  return null;
}

/**
 * The units an RFQ's total quantity may be counted in.
 * @type {readonly ('KG' | 'PCS' | 'L' | 'MT')[]}
 */
export const RFQ_UOMS = ['KG', 'PCS', 'L', 'MT'];

/**
 * THE RULE `rfq_create_valid` BINDS, as a pure function so a template read, the
 * wizard's own gate and the verb can call the SAME judgement (the customRoles
 * precedent: one rule, several callers, no second copy to drift).
 *
 * Every arm is conditional on its key being PRESENT — see the header. The one
 * exception is `currency`: when present it must be a permitted bid currency,
 * because the store used to overwrite whatever the buyer chose with `'IDR'`.
 * @param {Record<string, unknown>} payload
 * @returns {string | null}
 */
export function rfqCreateRefusal(payload) {
  // RFX-D30 — an `Other` RFQ starts with no unit, and the wizard sends `''`
  // until the buyer picks one. A unit, when sent, must be one on the list:
  // the store used to read anything else as KG.
  if (payload.uom !== undefined) {
    if (payload.uom === '' || payload.uom === null) {
      return 'UOM_MISSING: choose the unit the quantity is counted in';
    }
    if (!(/** @type {readonly unknown[]} */ (RFQ_UOMS).includes(payload.uom))) {
      return `UOM_UNKNOWN: ${String(payload.uom)} is not a unit an RFQ is counted in`;
    }
  }
  if (
    payload.currency !== undefined &&
    !BID_CURRENCIES.includes(/** @type {BidCurrency} */ (payload.currency))
  ) {
    return `CURRENCY_NOT_PERMITTED: ${String(payload.currency)} is not a currency this portal accepts bids in`;
  }
  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return 'NO_ITEMS: an RFQ sources at least one item';
    }
    for (const [i, item] of /** @type {unknown[]} */ (payload.items).entries()) {
      const r = itemRefusal(item, i);
      if (r) return r;
    }
  }
  if (payload.tiers !== undefined) {
    const t = tiersRefusal(payload.tiers, 'the RFQ');
    if (t) return t;
  }
  if (payload.questions !== undefined) {
    if (!Array.isArray(payload.questions))
      return 'QUESTION_INCOMPLETE: the questions are not a list';
    for (const q of /** @type {Partial<RfiQuestion>[]} */ (payload.questions)) {
      if (!QUESTION_TYPES.includes(/** @type {RfiQuestionType} */ (q?.type))) {
        return `UNKNOWN_QUESTION_TYPE: ${String(q?.type)}`;
      }
      if (!q.id || !q.promptKey || !String(q.promptKey).trim()) {
        return 'QUESTION_INCOMPLETE: every question names itself and what it asks';
      }
      // BL-215 — a link to a built-in field fits only a question of its shape.
      const link = builtInRefusal(q);
      if (link) return link;
    }
  }
  if (payload.samplesRequested !== undefined) {
    const s = /** @type {Partial<RfqSamplesRequest> | null} */ (payload.samplesRequested);
    if (
      !s ||
      typeof s.qty !== 'number' ||
      !Number.isInteger(s.qty) ||
      s.qty <= 0 ||
      !isDate(s.neededBy)
    ) {
      return 'SAMPLES_INVALID: a sample request needs a positive quantity and the date it is needed';
    }
  }
  if (payload.documentRequests !== undefined) {
    // NR-1 BR-02 — an `itemLineNo` must name an item of THIS RFQ.
    const lineNos = Array.isArray(payload.items)
      ? /** @type {Partial<RfqItem>[]} */ (payload.items)
          .map((i) => i?.lineNo)
          .filter(/** @returns {n is number} */ (n) => typeof n === 'number')
      : [];
    const d = documentRequestsRefusal(payload.documentRequests, lineNos);
    if (d) return d;
  }
  return null;
}

/**
 * The refusal code of a `CODE: detail` reason, with the dispatcher's
 * `POLICY_REJECTED:<hook>:` envelope removed when it is there.
 * @param {string} reason
 * @returns {string}
 */
export const refusalCode = (reason) =>
  /** @type {NonNullable<(ReturnType<(ReturnType<typeof reason.replace>)['split']>)[number]>} */ (
    reason.replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0]
  ).trim();

/**
 * The fields `rfqTarget.create` stores from a payload that already passed
 * `rfqCreateRefusal`. Only what is PRESENT is carried: an absent flag stays
 * absent rather than becoming a stated `false`, the `estimatedValue` precedent.
 * @param {Record<string, unknown>} payload
 * @returns {RfqAuthoringFields & { currency: BidCurrency }}
 */
export function readRfqAuthoringFields(payload) {
  /** @param {string} k */
  const str = (k) =>
    typeof payload[k] === 'string' && /** @type {string} */ (payload[k]).trim()
      ? /** @type {string} */ (payload[k]).trim()
      : undefined;
  /** @type {RfqAuthoringFields & { currency: BidCurrency }} */
  const out = {
    // THE CURRENCY BUG, CLOSED. The store wrote `'IDR'` whatever the buyer
    // picked; absence (a legacy dispatch) still means the base currency.
    currency: BID_CURRENCIES.includes(/** @type {BidCurrency} */ (payload.currency))
      ? /** @type {BidCurrency} */ (payload.currency)
      : 'IDR'
  };
  if (str('projectName')) out.projectName = str('projectName');
  if (Array.isArray(payload.items)) out.items = /** @type {RfqItem[]} */ (payload.items);
  if (Array.isArray(payload.tiers)) out.tiers = /** @type {RfqQuantityTier[]} */ (payload.tiers);
  if (Array.isArray(payload.questions) && payload.questions.length > 0)
    out.questions = /** @type {RfiQuestion[]} */ (payload.questions);
  if (typeof payload.allowAlternatives === 'boolean')
    out.allowAlternatives = payload.allowAlternatives;
  if (payload.samplesRequested && typeof payload.samplesRequested === 'object') {
    out.samplesRequested = /** @type {RfqSamplesRequest} */ (payload.samplesRequested);
  }
  if (typeof payload.confidential === 'boolean') out.confidential = payload.confidential;
  if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    out.attachments = /** @type {AttachmentMeta[]} */ (payload.attachments);
  }
  if (str('sourceRfpId')) out.sourceRfpId = str('sourceRfpId');
  if (Array.isArray(payload.sourceRfpOptionRefs)) {
    const refs = /** @type {unknown[]} */ (payload.sourceRfpOptionRefs).filter(
      /** @returns {x is string} */ (x) => typeof x === 'string' && x.length > 0
    );
    if (refs.length > 0) out.sourceRfpOptionRefs = refs;
  }
  if (str('copiedFromRfqId')) out.copiedFromRfqId = str('copiedFromRfqId');
  if (str('templateId')) out.templateId = str('templateId');
  if (Array.isArray(payload.documentRequests) && payload.documentRequests.length > 0) {
    out.documentRequests = /** @type {DocumentRequest[]} */ (payload.documentRequests);
  }
  return out;
}

/**
 * Read one quantity break the buyer typed, through the ONE legal quantity
 * parser (no convention hint, so "2.400" refuses rather than being guessed).
 * @param {string} raw
 * @returns {{ ok: true; value: number } | { ok: false; reason: string }}
 */
export function readTierQty(raw) {
  // The samples write breaks as "3K / 5K / 50K", so a trailing K is read as
  // thousands. It multiplies a number the one parser has ALREADY read, so it
  // adds no second reading of the separators.
  const trimmed = raw.trim();
  const thousands = /[kK]$/.test(trimmed);
  const parsed = normalizeQty(thousands ? trimmed.slice(0, -1) : trimmed);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const value = thousands ? Math.round(parsed.value * 1000) : parsed.value;
  if (!Number.isInteger(value) || value <= 0) return { ok: false, reason: 'NOT_POSITIVE' };
  return { ok: true, value };
}

/**
 * Insert a break, keeping the set strictly increasing. A duplicate is refused.
 * @param {readonly RfqQuantityTier[]} tiers
 * @param {RfqQuantityTier} tier
 * @returns {{ ok: true; tiers: readonly RfqQuantityTier[] } | { ok: false; reason: 'DUPLICATE' | 'TOO_MANY' }}
 */
export function addTier(tiers, tier) {
  if (tiers.some((t) => t.qty === tier.qty)) return { ok: false, reason: 'DUPLICATE' };
  if (tiers.length >= MAX_QUANTITY_TIERS) return { ok: false, reason: 'TOO_MANY' };
  return { ok: true, tiers: [...tiers, tier].sort((a, b) => a.qty - b.qty) };
}
