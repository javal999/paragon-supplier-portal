// ────────────────────────────────────────────────────────────────────────────
// THE RFQ WIZARD'S AUTHORING DRAFT — items, breaks, questions, options — and
// the ONE generic seed every "start from…" entrance fills it through.
//
// ⚠️ **ONE SEED SHAPE, MANY SOURCES.** An RFQ can start from an RFI, a template,
// a past RFQ, and (in a later batch) an RFP. Each of those is a function from
// its own record to `RfqDraftSeed`, and the wizard knows only the seed. That is
// what lets the RFP source plug in later without the wizard being reworked: it
// is one more `seedFrom…` beside the ones below, and nothing else changes.
// (The purchase-requisition entrance predates this and keeps its own
// `applyPrefill`, because its cascade key `sourceRequisitionId` is load-bearing
// and already pinned by its own specs.)
//
// Pure. The wizard holds UI strings; this module turns them into the model and
// judges them with the SAME rules the create verb binds (`itemRefusal`,
// `tiersRefusal`), so the step gate and the dispatch cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

import type { BidCurrency } from '../../lib/currencyPolicy';
import { normalizeQty } from '../../lib/localeNumber';
import type { RFQ } from '../../data/mockRfqs';
import type { RfiQuestion } from '../../services/sourcing/types';
import type { RfqPrefill } from '../../services/sourcing/rfxPrefill';
import {
  itemRefusal,
  tiersRefusal,
  type AttachmentMeta,
  type RfqItem,
  type RfqItemTypeId,
  type RfqOneTimeCostId,
  type RfqQuantityTier,
  type RfqSpecField,
} from '../../services/sourcing/rfqModel';
import { rfqItemType, specSheetFor } from '../../services/sourcing/rfqItemTypes';
import type { RfqTemplate, RfqTemplateContent } from '../../services/sourcing/rfqTemplates';

/** One item as the wizard edits it. Numbers stay text until they are read. */
export interface ItemDraft {
  readonly uid: string;
  readonly itemType: RfqItemTypeId;
  readonly description: string;
  readonly variantCount: string;
  readonly uom: string;
  readonly specFields: readonly RfqSpecField[];
  readonly note: string;
  readonly attachments: readonly AttachmentMeta[];
  readonly oneTimeCosts: readonly RfqOneTimeCostId[];
  /** When on, the item carries its own breaks instead of the RFQ's. */
  readonly ownTiers: boolean;
  readonly tiers: readonly RfqQuantityTier[];
}

/** The authoring half of the wizard draft. */
export interface RfqAuthoringDraft {
  projectName: string;
  currency: BidCurrency;
  items: ItemDraft[];
  tiers: RfqQuantityTier[];
  questions: RfiQuestion[];
  allowAlternatives: boolean;
  samplesOn: boolean;
  samplesQty: string;
  samplesNeededBy: string;
  confidential: boolean;
  attachments: AttachmentMeta[];
  sourceRfiId?: string;
  sourceRfpId?: string;
  copiedFromRfqId?: string;
  templateId?: string;
}

/**
 * THE GENERIC SEED. Every field optional: a source fills what it can carry and
 * leaves the rest to the wizard's defaults. `origin` is what the review step
 * names ("Created from RFI-2026-001").
 */
export interface RfqDraftSeed {
  readonly origin?: { readonly kind: 'rfi' | 'rfp' | 'template' | 'copy'; readonly label: string };
  readonly title?: string;
  readonly projectName?: string;
  readonly category?: string;
  readonly uom?: string;
  readonly totalQty?: string;
  readonly currency?: BidCurrency;
  readonly incoterms?: string;
  readonly paymentTerms?: string;
  readonly invitedSupplierIds?: readonly string[];
  readonly items?: readonly ItemDraft[];
  readonly tiers?: readonly RfqQuantityTier[];
  readonly questions?: readonly RfiQuestion[];
  readonly allowAlternatives?: boolean;
  readonly samplesQty?: string;
  readonly confidential?: boolean;
  readonly sourceRfiId?: string;
  readonly sourceRfpId?: string;
  readonly copiedFromRfqId?: string;
  readonly templateId?: string;
}

let uidSeq = 0;
const nextUid = () => {
  uidSeq += 1;
  return `item-${uidSeq}`;
};

/** A fresh item of a type: the library sheet, the type's default costs. */
export function newItemDraft(itemType: RfqItemTypeId = 'other'): ItemDraft {
  const def = rfqItemType(itemType);
  return {
    uid: nextUid(),
    itemType,
    description: '',
    variantCount: '1',
    uom: def.defaultUom,
    specFields: specSheetFor(itemType),
    note: '',
    attachments: [],
    oneTimeCosts: [...def.oneTimeCosts],
    ownTiers: false,
    tiers: [],
  };
}

/**
 * Change an item's type. The sheet is replaced by the new type's, but any value
 * the buyer already typed into a field the new type ALSO has is kept, and their
 * custom fields stay: switching type must not throw their work away.
 */
export function retypeItem(item: ItemDraft, itemType: RfqItemTypeId): ItemDraft {
  const def = rfqItemType(itemType);
  const typed = new Map(item.specFields.filter((f) => f.value).map((f) => [f.key, f.value!]));
  const custom = item.specFields.filter((f) => f.key.startsWith('custom-'));
  return {
    ...item,
    itemType,
    uom: def.defaultUom,
    specFields: [
      ...specSheetFor(itemType).map((f) => (typed.has(f.key) ? { ...f, value: typed.get(f.key) } : f)),
      ...custom,
    ],
    oneTimeCosts: [...def.oneTimeCosts],
  };
}

/** Add a custom field. Its label is the buyer's own text. */
export function addCustomField(
  item: ItemDraft,
  field: { label: string; filledBy: RfqSpecField['filledBy']; required: boolean },
): ItemDraft {
  const n = item.specFields.filter((f) => f.key.startsWith('custom-')).length + 1;
  return {
    ...item,
    specFields: [
      ...item.specFields,
      { key: `custom-${n}`, label: field.label.trim(), kind: 'text', filledBy: field.filledBy, required: field.required },
    ],
  };
}

/** Remove a field. A REQUIRED library field cannot be removed; the spec allows removing optional ones. */
export function removeField(item: ItemDraft, key: string): ItemDraft {
  const f = item.specFields.find((x) => x.key === key);
  if (!f || (f.required && !key.startsWith('custom-'))) return item;
  return { ...item, specFields: item.specFields.filter((x) => x.key !== key) };
}

/** Read an item's variant count: a positive whole number, or `null`. */
export function readVariantCount(raw: string): number | null {
  const parsed = normalizeQty(raw);
  return parsed.ok && Number.isInteger(parsed.value) && parsed.value >= 1 ? parsed.value : null;
}

/** The model item an item draft stands for (no validation). */
export function toRfqItem(d: ItemDraft, index: number): RfqItem {
  return {
    lineNo: index + 1,
    itemType: d.itemType,
    description: d.description.trim(),
    variantCount: readVariantCount(d.variantCount) ?? 0,
    uom: d.uom,
    // A blank value is an ABSENT value, not an empty string on the record.
    specFields: d.specFields.map(({ value, ...rest }) =>
      value && value.trim() ? { ...rest, value: value.trim() } : rest,
    ),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
    ...(d.attachments.length > 0 ? { attachments: d.attachments } : {}),
    ...(d.oneTimeCosts.length > 0 ? { oneTimeCosts: d.oneTimeCosts } : {}),
    ...(d.ownTiers ? { tiers: d.tiers } : {}),
  };
}

/** Why the items step may not proceed, or `null`. The verb's own rule. */
export function itemsStepRefusal(items: readonly ItemDraft[]): string | null {
  if (items.length === 0) return 'NO_ITEMS: an RFQ sources at least one item';
  for (const [i, d] of items.entries()) {
    const r = itemRefusal(toRfqItem(d, i), i);
    if (r) return r;
  }
  return null;
}

/** Why the breaks step may not proceed, or `null`. */
export function tiersStepRefusal(tiers: readonly RfqQuantityTier[]): string | null {
  return tiersRefusal(tiers, 'the RFQ');
}

/**
 * The authoring half of the `t_rfq_create` payload. Emits ONLY what is present,
 * the `estimatedValue` discipline, and always the currency — the one field the
 * store used to overwrite.
 */
export function buildRfqAuthoringPayload(d: RfqAuthoringDraft): Record<string, unknown> {
  const samplesQty = readVariantCount(d.samplesQty);
  return {
    currency: d.currency,
    ...(d.projectName.trim() ? { projectName: d.projectName.trim() } : {}),
    items: d.items.map(toRfqItem),
    tiers: d.tiers,
    ...(d.questions.length > 0 ? { questions: d.questions } : {}),
    allowAlternatives: d.allowAlternatives,
    confidential: d.confidential,
    ...(d.samplesOn ? { samplesRequested: { qty: samplesQty ?? 0, neededBy: d.samplesNeededBy } } : {}),
    ...(d.attachments.length > 0 ? { attachments: d.attachments } : {}),
    ...(d.sourceRfiId ? { sourceRfiId: d.sourceRfiId } : {}),
    ...(d.sourceRfpId ? { sourceRfpId: d.sourceRfpId } : {}),
    ...(d.copiedFromRfqId ? { copiedFromRfqId: d.copiedFromRfqId } : {}),
    ...(d.templateId ? { templateId: d.templateId } : {}),
  };
}

/** Why the options step may not proceed, or `null`. */
export function optionsStepRefusal(d: RfqAuthoringDraft): string | null {
  if (!d.samplesOn) return null;
  if (readVariantCount(d.samplesQty) === null || !/^\d{4}-\d{2}-\d{2}$/.test(d.samplesNeededBy)) {
    return 'SAMPLES_INVALID: a sample request needs a positive quantity and the date it is needed';
  }
  return null;
}

// ── Sources → seed ──────────────────────────────────────────────────────────

const itemDraftFrom = (item: RfqItem, keepAttachments: boolean): ItemDraft => ({
  uid: nextUid(),
  itemType: item.itemType,
  description: item.description,
  variantCount: String(item.variantCount),
  uom: item.uom,
  specFields: item.specFields.map((f) => ({ ...f })),
  note: item.note ?? '',
  attachments: keepAttachments ? [...(item.attachments ?? [])] : [],
  oneTimeCosts: [...(item.oneTimeCosts ?? [])],
  ownTiers: Boolean(item.tiers && item.tiers.length > 0),
  tiers: [...(item.tiers ?? [])],
});

/**
 * RFI → RFQ (REQ-E03-03 BR-02). `prefillRfqFromRfi` already chose the products
 * and the responders; this only re-expresses its lines as items. Each product
 * becomes an "Other" item carrying the RFI's specification text, because an RFI
 * answer names a product in the supplier's words and cannot tell us which spec
 * template it belongs to. The buyer picks the type in the wizard.
 */
export function seedFromRfiPrefill(p: RfqPrefill, eventNumber: string): RfqDraftSeed {
  const total = p.lineItems.reduce((s, l) => s + (l.quantity > 0 ? l.quantity : 0), 0);
  return {
    origin: { kind: 'rfi', label: eventNumber },
    title: p.title,
    category: p.materialCategory,
    invitedSupplierIds: p.invitedSupplierIds,
    sourceRfiId: p.sourceRfiId,
    ...(total > 0 ? { totalQty: String(total) } : {}),
    items: p.lineItems.map((l) => {
      const base = newItemDraft('other');
      return {
        ...base,
        description: l.description,
        uom: l.uom,
        specFields: base.specFields.map((f) =>
          f.key === 'specification' && l.specification ? { ...f, value: l.specification } : f,
        ),
      };
    }),
  };
}

/** Template → seed. A template carries no invitees and no dates, by construction. */
export function seedFromTemplate(tpl: RfqTemplate, label: string): RfqDraftSeed {
  const c = tpl.content;
  return {
    origin: { kind: 'template', label },
    templateId: tpl.id,
    ...(c.category ? { category: c.category } : {}),
    ...(c.uom ? { uom: c.uom } : {}),
    ...(c.currency ? { currency: c.currency } : {}),
    items: c.items.map((i) => itemDraftFrom(i, false)),
    tiers: c.tiers,
    ...(c.questions ? { questions: c.questions } : {}),
    ...(c.allowAlternatives !== undefined ? { allowAlternatives: c.allowAlternatives } : {}),
    ...(c.samplesQty ? { samplesQty: String(c.samplesQty) } : {}),
    ...(c.confidential !== undefined ? { confidential: c.confidential } : {}),
  };
}

/**
 * Past RFQ → seed (D2 / D3). A copy carries the content AND the invitees; its
 * dates are cleared, because a deadline copied from a closed event is already
 * in the past. An untiered legacy RFQ copies as one "Other" item.
 */
export function seedFromRfq(rfq: RFQ): RfqDraftSeed {
  const items: ItemDraft[] =
    rfq.items && rfq.items.length > 0
      ? rfq.items.map((i) => itemDraftFrom(i, true))
      : [
          {
            ...newItemDraft('other'),
            description: rfq.title,
            uom: rfq.uom,
          },
        ];
  return {
    origin: { kind: 'copy', label: rfq.rfqNumber },
    copiedFromRfqId: rfq.id,
    title: rfq.title,
    ...(rfq.projectName ? { projectName: rfq.projectName } : {}),
    category: rfq.materialCategory,
    uom: rfq.uom,
    totalQty: String(rfq.totalQty),
    currency: rfq.currency,
    incoterms: rfq.incoterms,
    paymentTerms: rfq.paymentTerms,
    invitedSupplierIds: rfq.invitedSupplierIds,
    items,
    tiers: rfq.tiers ?? [],
    ...(rfq.questions ? { questions: rfq.questions } : {}),
    ...(rfq.allowAlternatives !== undefined ? { allowAlternatives: rfq.allowAlternatives } : {}),
    ...(rfq.samplesRequested ? { samplesQty: String(rfq.samplesRequested.qty) } : {}),
    ...(rfq.confidential !== undefined ? { confidential: rfq.confidential } : {}),
    ...(rfq.sourceRfiId ? { sourceRfiId: rfq.sourceRfiId } : {}),
  };
}

// ── Draft / RFQ → template content ─────────────────────────────────────────

/** What "Save as template" keeps from the wizard: no invitees, no dates, no files. */
export function templateContentFromDraft(
  d: RfqAuthoringDraft & { category: string; uom: string },
): RfqTemplateContent {
  const samplesQty = readVariantCount(d.samplesQty);
  return {
    ...(d.category ? { category: d.category } : {}),
    uom: d.uom,
    currency: d.currency,
    items: d.items.map((i, n) => {
      const { attachments: _files, ...rest } = toRfqItem(i, n);
      void _files;
      return rest;
    }),
    tiers: d.tiers,
    ...(d.questions.length > 0 ? { questions: d.questions } : {}),
    allowAlternatives: d.allowAlternatives,
    ...(d.samplesOn && samplesQty ? { samplesQty } : {}),
    confidential: d.confidential,
  };
}

/**
 * What "Save as template" keeps from an existing RFQ. A legacy single-item RFQ
 * is kept as what it is — one "Other" item at one total break of its quantity —
 * so the button works on every RFQ; `null` only when there is not even a
 * quantity to keep.
 */
export function templateContentFromRfq(rfq: RFQ): RfqTemplateContent | null {
  if (!rfq.items || rfq.items.length === 0 || !rfq.tiers || rfq.tiers.length === 0) {
    if (!(rfq.totalQty > 0) || !Number.isInteger(rfq.totalQty)) return null;
    const { attachments: _files, ...item } = toRfqItem({ ...newItemDraft('other'), description: rfq.title, uom: rfq.uom }, 0);
    void _files;
    return {
      category: rfq.materialCategory,
      uom: rfq.uom,
      currency: rfq.currency,
      items: [item],
      tiers: [{ qty: rfq.totalQty, basis: 'total' }],
    };
  }
  return {
    category: rfq.materialCategory,
    uom: rfq.uom,
    currency: rfq.currency,
    items: rfq.items.map(({ attachments: _files, ...rest }) => {
      void _files;
      return rest;
    }),
    tiers: rfq.tiers,
    ...(rfq.questions ? { questions: rfq.questions } : {}),
    ...(rfq.allowAlternatives !== undefined ? { allowAlternatives: rfq.allowAlternatives } : {}),
    ...(rfq.samplesRequested ? { samplesQty: rfq.samplesRequested.qty } : {}),
    ...(rfq.confidential !== undefined ? { confidential: rfq.confidential } : {}),
  };
}
