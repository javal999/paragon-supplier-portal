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

import { BID_CURRENCIES, type BidCurrency } from '../../lib/currencyPolicy';
import { normalizeQty } from '../../lib/localeNumber';
import type { RfiAnswer, RfiQuestion, RfiQuestionType } from './types';

// ── The item ────────────────────────────────────────────────────────────────

/** The item types Procurement keeps a spec template for (`rfqItemTypes.ts`). */
export type RfqItemTypeId = 'sticker' | 'unitBox' | 'bottleClosure' | 'moldComponent' | 'other';

export const RFQ_ITEM_TYPE_IDS: readonly RfqItemTypeId[] = [
  'sticker',
  'unitBox',
  'bottleClosure',
  'moldComponent',
  'other',
];

/** How a spec value is entered: free text, a number with a unit, or a choice. */
export type RfqSpecFieldKind = 'text' | 'number' | 'choice';

/**
 * WHO answers a spec field. The buyer states what is wanted (material, size,
 * colours); the supplier states how it will be made (machine, cavities, cycle
 * time). One sheet, two authors, and the field says which.
 */
export type RfqSpecFilledBy = 'buyer' | 'supplier';

/** One row of an item's spec sheet. */
export interface RfqSpecField {
  /** Stable within the item. Library fields use the library key; a custom field
   *  gets `custom-<n>`. */
  readonly key: string;
  /** i18n key for a library field. */
  readonly labelKey?: string;
  /** The buyer's own words for a custom field. Not translated: it is user text. */
  readonly label?: string;
  readonly kind: RfqSpecFieldKind;
  /** i18n key for the unit of a `number` field. */
  readonly unitKey?: string;
  /** Option ids of a `choice` field; i18n key `rfqAuthoring.opt.<id>`. */
  readonly options?: readonly string[];
  readonly filledBy: RfqSpecFilledBy;
  readonly required: boolean;
  /** The buyer's value. Only meaningful when `filledBy === 'buyer'`. */
  readonly value?: string;
}

/**
 * A file's METADATA. There is no file store (BL-27): the bytes live in the
 * browser session only, behind an object URL held by
 * `sessionAttachmentStore`, and a record keeps nothing but this.
 */
export interface AttachmentMeta {
  readonly id: string;
  readonly name: string;
  /** Bytes. */
  readonly size: number;
  /** The MIME type the browser reported; `''` when it reported none. */
  readonly type: string;
  readonly addedAt: string;
}

/** The one-time costs a buyer can ask to be quoted. The supplier may add others. */
export type RfqOneTimeCostId = 'mold' | 'dieCutPlate' | 'printingPlate' | 'development';

export const RFQ_ONE_TIME_COST_IDS: readonly RfqOneTimeCostId[] = [
  'mold',
  'dieCutPlate',
  'printingPlate',
  'development',
];

/** Whether a quantity break counts each variant or the item as a whole. */
export type RfqTierBasis = 'perVariant' | 'total';

/** One quantity break the supplier prices at. */
export interface RfqQuantityTier {
  readonly qty: number;
  readonly basis: RfqTierBasis;
}

/** The most breaks one RFQ (or one item override) may carry. */
export const MAX_QUANTITY_TIERS = 8;

/** One item being sourced. */
export interface RfqItem {
  readonly lineNo: number;
  readonly itemType: RfqItemTypeId;
  readonly description: string;
  /** Number of variants or SKUs the item comes in (8 Oslo sticker designs). */
  readonly variantCount: number;
  readonly uom: string;
  readonly specFields: readonly RfqSpecField[];
  /** e.g. "Spec is the same as the existing Amplify variant sticker". */
  readonly note?: string;
  readonly attachments?: readonly AttachmentMeta[];
  /** The one-time costs the buyer wants quoted for this item. */
  readonly oneTimeCosts?: readonly RfqOneTimeCostId[];
  /** This item's own breaks. Absent = the RFQ's breaks apply. */
  readonly tiers?: readonly RfqQuantityTier[];
}

/** "Samples requested": how many, and by when. */
export interface RfqSamplesRequest {
  readonly qty: number;
  readonly neededBy: string;
}

/**
 * The RFQ fields the rebuilt authoring adds. Spread into `RFQ` (in
 * `data/mockRfqs.ts`) so the entity stays one interface and a reader never has
 * to ask which half it holds.
 */
export interface RfqAuthoringFields {
  /** The programme the RFQ belongs to ("Oslo"), shown as a tag. */
  projectName?: string;
  items?: readonly RfqItem[];
  tiers?: readonly RfqQuantityTier[];
  /** The same typed questions an RFI asks (`RfiQuestion`). */
  questions?: readonly RfiQuestion[];
  /** Off by default; an alternative offer is shown apart and not ranked. */
  allowAlternatives?: boolean;
  samplesRequested?: RfqSamplesRequest;
  /** Hides the attachments and spec until the supplier accepts the terms. */
  confidential?: boolean;
  /** Event-level reference files (session only, BL-27). */
  attachments?: readonly AttachmentMeta[];
  /** The RFP this RFQ was created from (D3). */
  sourceRfpId?: string;
  /**
   * RFx D2 (NR-2 BR-08) — the RFP options this RFQ sources, by ref
   * (`rfpOptionRef`). An option named here cannot also be awarded on the RFP,
   * and an option already awarded there cannot be named here.
   */
  sourceRfpOptionRefs?: readonly string[];
  /** The past RFQ this one was copied from (D2). */
  copiedFromRfqId?: string;
  /** The template this RFQ started from (D2). */
  templateId?: string;
}

// ── The supplier's answer (the quotation extension) ─────────────────────────

/** A unit price at one quantity break. */
export interface TierPrice {
  readonly tierQty: number;
  readonly unitPrice: number;
}

/** A one-time cost as the supplier quotes it. */
export interface OneTimeCostQuote {
  readonly name: string;
  readonly amount: number;
  /** The requested cost this answers. Absent on a cost the supplier added. */
  readonly costId?: RfqOneTimeCostId;
}

/** A supplier-filled spec value. */
export interface SpecValue {
  readonly key: string;
  readonly value: string;
}

/** The supplier's answer for ONE item of a tiered RFQ. */
export interface QuotationItemQuote {
  readonly itemLineNo: number;
  readonly specValues?: readonly SpecValue[];
  readonly tierPrices: readonly TierPrice[];
  readonly moq?: number;
  readonly leadTimeDays?: number;
  readonly oneTimeCosts?: readonly OneTimeCostQuote[];
}

/** An alternative offer — shown apart from the main quote, never ranked by default. */
export interface QuotationAlternative {
  readonly itemLineNo: number;
  readonly description: string;
  readonly tierPrices: readonly TierPrice[];
}

/** "Can sample, ready date" — which must actually be saved. */
export interface SampleOffer {
  readonly canSample: boolean;
  readonly readyDate?: string;
}

/**
 * The quotation fields the tiered RFQ adds. Validity stays the existing
 * `validUntil`, and the header `unitPrice` / `totalPrice` stay DERIVED from
 * these (`deriveQuoteHeader`) so the existing scoring and comparison keep
 * reading a number they understand.
 */
export interface QuotationTieredFields {
  itemQuotes?: readonly QuotationItemQuote[];
  alternatives?: readonly QuotationAlternative[];
  answers?: readonly RfiAnswer[];
  sampleOffer?: SampleOffer;
  attachments?: readonly AttachmentMeta[];
}

// ── The supplier-response records (model only; the screens come later) ──────

export type RfqDeclineReason =
  | 'noCapacity'
  | 'notOurProduct'
  | 'leadTimeTooShort'
  | 'quantityTooSmall'
  | 'specUnclear'
  | 'other';

export const RFQ_DECLINE_REASONS: readonly RfqDeclineReason[] = [
  'noCapacity',
  'notOurProduct',
  'leadTimeTooShort',
  'quantityTooSmall',
  'specUnclear',
  'other',
];

/** The supplier's first answer: "I will respond", or a reasoned decline. */
export type RfqIntent =
  | {
      readonly rfqId: string;
      readonly supplierId: string;
      readonly intent: 'respond';
      readonly at: string;
    }
  | {
      readonly rfqId: string;
      readonly supplierId: string;
      readonly intent: 'decline';
      readonly reason: RfqDeclineReason;
      /** Required with the reason; the buyer sees both. */
      readonly text: string;
      readonly at: string;
    };

/** A confidential RFQ's terms, accepted once, with the time recorded. */
export interface ConfidentialityAcceptance {
  readonly rfqId: string;
  readonly supplierId: string;
  readonly acceptedAt: string;
}

/**
 * A clarification question. A PUBLISHED answer reaches every invitee with the
 * asker's identity hidden; a PRIVATE one reaches the asker only.
 */
export interface RfqClarification {
  readonly id: string;
  readonly rfqId: string;
  readonly askedBy: string;
  readonly askedAt: string;
  readonly question: string;
  readonly answer?: string;
  readonly answeredAt?: string;
  readonly visibility: 'private' | 'published';
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** The breaks in force for one item: its own override, else the RFQ's. */
export function tiersForItem(
  rfq: { readonly tiers?: readonly RfqQuantityTier[] },
  item: RfqItem,
): readonly RfqQuantityTier[] {
  return item.tiers && item.tiers.length > 0 ? item.tiers : (rfq.tiers ?? []);
}

/** The pieces a break means for one item: per variant multiplies by the variants. */
export function tierPieces(tier: RfqQuantityTier, item: Pick<RfqItem, 'variantCount'>): number {
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
 */
export function deriveQuoteHeader(
  rfq: { readonly tiers?: readonly RfqQuantityTier[]; readonly items?: readonly RfqItem[]; readonly totalQty: number },
  itemQuotes: readonly QuotationItemQuote[],
): { unitPrice: number; totalPrice: number } | null {
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

const QUESTION_TYPES: readonly RfiQuestionType[] = [
  'yesNo',
  'singleChoice',
  'multipleChoice',
  'numberWithUnit',
  'date',
  'text',
  'attachment',
];

const isDate = (v: unknown): boolean =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));

/**
 * Why a set of quantity breaks is refused, or `null`. 1 to 8 breaks, each a
 * positive whole number, strictly increasing, each with a known basis.
 */
export function tiersRefusal(tiers: unknown, where: string): string | null {
  if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > MAX_QUANTITY_TIERS) {
    return `TIER_COUNT: ${where} needs 1 to ${MAX_QUANTITY_TIERS} quantity breaks`;
  }
  let prev = 0;
  for (const t of tiers as { qty?: unknown; basis?: unknown }[]) {
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
 */
export function itemRefusal(
  item: unknown,
  index: number,
  /** A TEMPLATE keeps the sheet, not the answers: its buyer values may be blank. */
  opts: { readonly requireValues?: boolean } = {},
): string | null {
  const it = item as Partial<RfqItem> | null;
  const where = `item ${index + 1}`;
  if (!it || typeof it !== 'object') return `ITEM_INCOMPLETE: ${where} is not an item`;
  if (!RFQ_ITEM_TYPE_IDS.includes(it.itemType as RfqItemTypeId)) {
    return `ITEM_TYPE_UNKNOWN: ${where} names no item type Procurement keeps`;
  }
  if (typeof it.description !== 'string' || it.description.trim() === '') {
    return `ITEM_INCOMPLETE: ${where} needs a description`;
  }
  if (typeof it.variantCount !== 'number' || !Number.isInteger(it.variantCount) || it.variantCount < 1) {
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
    .filter((f) => f.filledBy === 'buyer' && f.required && !(typeof f.value === 'string' && f.value.trim()))
    .map((f) => f.label ?? f.key);
  if ((opts.requireValues ?? true) && missing.length > 0) {
    return `ITEM_SPEC_MISSING: ${where} needs ${missing.join(', ')}`;
  }
  for (const c of it.oneTimeCosts ?? []) {
    if (!RFQ_ONE_TIME_COST_IDS.includes(c)) return `ONE_TIME_COST_UNKNOWN: ${String(c)} on ${where}`;
  }
  if (it.tiers !== undefined) {
    const t = tiersRefusal(it.tiers, where);
    if (t) return t;
  }
  return null;
}

/**
 * THE RULE `rfq_create_valid` BINDS, as a pure function so a template read, the
 * wizard's own gate and the verb can call the SAME judgement (the customRoles
 * precedent: one rule, several callers, no second copy to drift).
 *
 * Every arm is conditional on its key being PRESENT — see the header. The one
 * exception is `currency`: when present it must be a permitted bid currency,
 * because the store used to overwrite whatever the buyer chose with `'IDR'`.
 */
export function rfqCreateRefusal(payload: Record<string, unknown>): string | null {
  if (payload.currency !== undefined && !BID_CURRENCIES.includes(payload.currency as BidCurrency)) {
    return `CURRENCY_NOT_PERMITTED: ${String(payload.currency)} is not a currency this portal accepts bids in`;
  }
  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return 'NO_ITEMS: an RFQ sources at least one item';
    }
    for (const [i, item] of (payload.items as unknown[]).entries()) {
      const r = itemRefusal(item, i);
      if (r) return r;
    }
  }
  if (payload.tiers !== undefined) {
    const t = tiersRefusal(payload.tiers, 'the RFQ');
    if (t) return t;
  }
  if (payload.questions !== undefined) {
    if (!Array.isArray(payload.questions)) return 'QUESTION_INCOMPLETE: the questions are not a list';
    for (const q of payload.questions as Partial<RfiQuestion>[]) {
      if (!QUESTION_TYPES.includes(q?.type as RfiQuestionType)) {
        return `UNKNOWN_QUESTION_TYPE: ${String(q?.type)}`;
      }
      if (!q.id || !q.promptKey || !String(q.promptKey).trim()) {
        return 'QUESTION_INCOMPLETE: every question names itself and what it asks';
      }
    }
  }
  if (payload.samplesRequested !== undefined) {
    const s = payload.samplesRequested as Partial<RfqSamplesRequest> | null;
    if (!s || typeof s.qty !== 'number' || !Number.isInteger(s.qty) || s.qty <= 0 || !isDate(s.neededBy)) {
      return 'SAMPLES_INVALID: a sample request needs a positive quantity and the date it is needed';
    }
  }
  return null;
}

/**
 * The refusal code of a `CODE: detail` reason, with the dispatcher's
 * `POLICY_REJECTED:<hook>:` envelope removed when it is there.
 */
export const refusalCode = (reason: string): string =>
  reason.replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0]!.trim();

/**
 * The fields `rfqTarget.create` stores from a payload that already passed
 * `rfqCreateRefusal`. Only what is PRESENT is carried: an absent flag stays
 * absent rather than becoming a stated `false`, the `estimatedValue` precedent.
 */
export function readRfqAuthoringFields(payload: Record<string, unknown>): RfqAuthoringFields & { currency: BidCurrency } {
  const str = (k: string) => (typeof payload[k] === 'string' && (payload[k] as string).trim() ? (payload[k] as string).trim() : undefined);
  const out: RfqAuthoringFields & { currency: BidCurrency } = {
    // THE CURRENCY BUG, CLOSED. The store wrote `'IDR'` whatever the buyer
    // picked; absence (a legacy dispatch) still means the base currency.
    currency: BID_CURRENCIES.includes(payload.currency as BidCurrency) ? (payload.currency as BidCurrency) : 'IDR',
  };
  if (str('projectName')) out.projectName = str('projectName');
  if (Array.isArray(payload.items)) out.items = payload.items as RfqItem[];
  if (Array.isArray(payload.tiers)) out.tiers = payload.tiers as RfqQuantityTier[];
  if (Array.isArray(payload.questions) && payload.questions.length > 0) out.questions = payload.questions as RfiQuestion[];
  if (typeof payload.allowAlternatives === 'boolean') out.allowAlternatives = payload.allowAlternatives;
  if (payload.samplesRequested && typeof payload.samplesRequested === 'object') {
    out.samplesRequested = payload.samplesRequested as RfqSamplesRequest;
  }
  if (typeof payload.confidential === 'boolean') out.confidential = payload.confidential;
  if (Array.isArray(payload.attachments) && payload.attachments.length > 0) {
    out.attachments = payload.attachments as AttachmentMeta[];
  }
  if (str('sourceRfpId')) out.sourceRfpId = str('sourceRfpId');
  if (Array.isArray(payload.sourceRfpOptionRefs)) {
    const refs = (payload.sourceRfpOptionRefs as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (refs.length > 0) out.sourceRfpOptionRefs = refs;
  }
  if (str('copiedFromRfqId')) out.copiedFromRfqId = str('copiedFromRfqId');
  if (str('templateId')) out.templateId = str('templateId');
  return out;
}

/**
 * Read one quantity break the buyer typed, through the ONE legal quantity
 * parser (no convention hint, so "2.400" refuses rather than being guessed).
 */
export function readTierQty(raw: string): { ok: true; value: number } | { ok: false; reason: string } {
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

/** Insert a break, keeping the set strictly increasing. A duplicate is refused. */
export function addTier(
  tiers: readonly RfqQuantityTier[],
  tier: RfqQuantityTier,
): { ok: true; tiers: readonly RfqQuantityTier[] } | { ok: false; reason: 'DUPLICATE' | 'TOO_MANY' } {
  if (tiers.some((t) => t.qty === tier.qty)) return { ok: false, reason: 'DUPLICATE' };
  if (tiers.length >= MAX_QUANTITY_TIERS) return { ok: false, reason: 'TOO_MANY' };
  return { ok: true, tiers: [...tiers, tier].sort((a, b) => a.qty - b.qty) };
}
