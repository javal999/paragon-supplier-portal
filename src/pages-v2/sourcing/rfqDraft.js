// ────────────────────────────────────────────────────────────────────────────
// THE RFQ WIZARD'S AUTHORING DRAFT — items, breaks, questions, options — and
// the ONE generic seed every "start from…" entrance fills it through.
//
// ⚠️ **ONE SEED SHAPE, MANY SOURCES.** An RFQ can start from an RFI, a template,
// a past RFQ, and an RFP. Each of those is a function from its own record to
// `RfqDraftSeed`, and the wizard knows only the seed. That is what let the RFP
// source plug in without the wizard being reworked: `seedFromRfp` is one more
// `seedFrom…` beside the others, and nothing else changed.
// (The purchase-requisition entrance predates this and keeps its own
// `applyPrefill`, because its cascade key `sourceRequisitionId` is load-bearing
// and already pinned by its own specs.)
//
// Pure. The wizard holds UI strings; this module turns them into the model and
// judges them with the SAME rules the create verb binds (`itemRefusal`,
// `tiersRefusal`), so the step gate and the dispatch cannot disagree.
// ────────────────────────────────────────────────────────────────────────────

/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BID_CURRENCIES } from '@lib/currencyPolicy';
import { normalizeQty } from '@lib/localeNumber';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { DocumentRequest, RfiQuestion } from '@services/sourcing/types' */
/** @import { RfqPrefill, RfqSeedFromRfp } from '@services/sourcing/rfxPrefill' */

/**
 * @param {string} c
 * @returns {c is BidCurrency}
 */
const isBidCurrency = (c) => /** @type {readonly string[]} */ (BID_CURRENCIES).includes(c);
/** @import { AttachmentMeta, RfqItem, RfqItemTypeId, RfqOneTimeCostId, RfqQuantityTier, RfqSpecField } from '@services/sourcing/rfqModel' */
import { itemRefusal, tiersRefusal } from '@services/sourcing/rfqModel';
import { rfqItemType, specSheetFor } from '@services/sourcing/rfqItemTypes';
/** @import { RfqTemplate, RfqTemplateContent } from '@services/sourcing/rfqTemplates' */

/** One item as the wizard edits it. Numbers stay text until they are read. */
/**
 * `ownTiers`:  When on, the item carries its own breaks instead of the RFQ's.
 *
 * @typedef {{
 *     readonly uid: string;
 *     readonly itemType: RfqItemTypeId;
 *     readonly description: string;
 *     readonly variantCount: string;
 *     readonly uom: string;
 *     readonly specFields: readonly RfqSpecField[];
 *     readonly note: string;
 *     readonly attachments: readonly AttachmentMeta[];
 *     readonly oneTimeCosts: readonly RfqOneTimeCostId[];
 *     readonly ownTiers: boolean;
 *     readonly tiers: readonly RfqQuantityTier[];
 *   }} ItemDraft
 */

/** The authoring half of the wizard draft. */
/**
 * @typedef {object} RfqAuthoringDraft
 * @property {string} projectName
 * @property {BidCurrency} currency
 * @property {ItemDraft[]} items
 * @property {RfqQuantityTier[]} tiers
 * @property {RfiQuestion[]} questions
 * @property {boolean} allowAlternatives
 * @property {boolean} samplesOn
 * @property {string} samplesQty
 * @property {string} samplesNeededBy
 * @property {boolean} confidential
 * @property {AttachmentMeta[]} attachments
 * @property {string} [sourceRfiId]
 * @property {string} [sourceRfpId]
 * @property {readonly string[]} [sourceRfpOptionRefs] -  RFx D3 (NR-2 BR-08) — the RFP options this RFQ sources, by ref.
 * @property {string} [copiedFromRfqId]
 * @property {string} [templateId]
 * @property {DocumentRequest[]} [documentRequests] NR-1 BR-02 — the buyer's document requests, edited on the RFQ wizard's
 *   "Documents from suppliers" step (B3). Optional: absent reads as none.
 */

/**
 * THE GENERIC SEED. Every field optional: a source fills what it can carry and
 * leaves the rest to the wizard's defaults. `origin` is what the review step
 * names ("Created from RFI-2026-001").
 */
/**
 * `sourceRfpOptionRefs`:  RFx D3 (NR-2 BR-08) — the RFP options the pre-fill carried, by ref.
 * `documentRequests`: NR-1 BR-11 — the buyer's document requests, which every source carries (RFI, RFP, template, copy, edit). A supplier's documents never travel.
 * `responseDeadline`: ── BL-93 — carried only by `seedForEdit`: an edit is the SAME event, so    its dates, files, budget and chosen materials come back too. A copy and    a template deliberately never carry these (D2: a copy's dates are    cleared), which is why they are separate fields and not folded into the    ones above.
 *
 * @typedef {{
 *     readonly origin?: { readonly kind: 'rfi' | 'rfp' | 'template' | 'copy'; readonly label: string };
 *     readonly title?: string;
 *     readonly projectName?: string;
 *     readonly category?: string;
 *     readonly uom?: string;
 *     readonly totalQty?: string;
 *     readonly currency?: BidCurrency;
 *     readonly incoterms?: string;
 *     readonly paymentTerms?: string;
 *     readonly invitedSupplierIds?: readonly string[];
 *     readonly items?: readonly ItemDraft[];
 *     readonly tiers?: readonly RfqQuantityTier[];
 *     readonly questions?: readonly RfiQuestion[];
 *     readonly allowAlternatives?: boolean;
 *     readonly samplesQty?: string;
 *     readonly confidential?: boolean;
 *     readonly sourceRfiId?: string;
 *     readonly sourceRfpId?: string;
 *     readonly sourceRfpOptionRefs?: readonly string[];
 *     readonly copiedFromRfqId?: string;
 *     readonly templateId?: string;
 *     readonly documentRequests?: readonly DocumentRequest[];
 *     readonly responseDeadline?: string;
 *     readonly awardDeadline?: string;
 *     readonly samplesNeededBy?: string;
 *     readonly attachments?: readonly AttachmentMeta[];
 *     readonly budget?: string;
 *     readonly materials?: readonly string[];
 *   }} RfqDraftSeed
 */

let uidSeq = 0;
const nextUid = () => {
  uidSeq += 1;
  return `item-${uidSeq}`;
};

/**
 * A fresh item of a type: the library sheet, the type's default costs.
 * @param {RfqItemTypeId} [itemType]
 * @returns {ItemDraft}
 */
export function newItemDraft(itemType = 'other') {
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
    tiers: []
  };
}

/**
 * Change an item's type. The sheet is replaced by the new type's, but any value
 * the buyer already typed into a field the new type ALSO has is kept, and their
 * custom fields stay: switching type must not throw their work away.
 * @param {ItemDraft} item
 * @param {RfqItemTypeId} itemType
 * @returns {ItemDraft}
 */
export function retypeItem(item, itemType) {
  const def = rfqItemType(itemType);
  const typed = new Map(
    item.specFields
      .filter((f) => f.value)
      .map((f) => [f.key, /** @type {NonNullable<typeof f.value>} */ (f.value)])
  );
  const custom = item.specFields.filter((f) => f.key.startsWith('custom-'));
  return {
    ...item,
    itemType,
    uom: def.defaultUom,
    specFields: [
      ...specSheetFor(itemType).map((f) =>
        typed.has(f.key) ? { ...f, value: typed.get(f.key) } : f
      ),
      ...custom
    ],
    oneTimeCosts: [...def.oneTimeCosts]
  };
}

/**
 * Add a custom field. Its label is the buyer's own text.
 * @param {ItemDraft} item
 * @param {{ label: string; filledBy: RfqSpecField['filledBy']; required: boolean }} field
 * @returns {ItemDraft}
 */
export function addCustomField(item, field) {
  const n = item.specFields.filter((f) => f.key.startsWith('custom-')).length + 1;
  return {
    ...item,
    specFields: [
      ...item.specFields,
      {
        key: `custom-${n}`,
        label: field.label.trim(),
        kind: 'text',
        filledBy: field.filledBy,
        required: field.required
      }
    ]
  };
}

/**
 * Remove a field. A REQUIRED library field cannot be removed; the spec allows removing optional ones.
 * @param {ItemDraft} item
 * @param {string} key
 * @returns {ItemDraft}
 */
export function removeField(item, key) {
  const f = item.specFields.find((x) => x.key === key);
  if (!f || (f.required && !key.startsWith('custom-'))) return item;
  return { ...item, specFields: item.specFields.filter((x) => x.key !== key) };
}

/**
 * Read an item's variant count: a positive whole number, or `null`.
 * @param {string} raw
 * @returns {number | null}
 */
export function readVariantCount(raw) {
  const parsed = normalizeQty(raw);
  return parsed.ok && Number.isInteger(parsed.value) && parsed.value >= 1 ? parsed.value : null;
}

/**
 * The model item an item draft stands for (no validation).
 * @param {ItemDraft} d
 * @param {number} index
 * @returns {RfqItem}
 */
export function toRfqItem(d, index) {
  return {
    lineNo: index + 1,
    itemType: d.itemType,
    description: d.description.trim(),
    variantCount: readVariantCount(d.variantCount) ?? 0,
    uom: d.uom,
    // A blank value is an ABSENT value, not an empty string on the record.
    specFields: d.specFields.map(({ value, ...rest }) =>
      value && value.trim() ? { ...rest, value: value.trim() } : rest
    ),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
    ...(d.attachments.length > 0 ? { attachments: d.attachments } : {}),
    ...(d.oneTimeCosts.length > 0 ? { oneTimeCosts: d.oneTimeCosts } : {}),
    ...(d.ownTiers ? { tiers: d.tiers } : {})
  };
}

/**
 * Why the items step may not proceed, or `null`. The verb's own rule.
 * @param {readonly ItemDraft[]} items
 * @returns {string | null}
 */
export function itemsStepRefusal(items) {
  if (items.length === 0) return 'NO_ITEMS: an RFQ sources at least one item';
  for (const [i, d] of items.entries()) {
    const r = itemRefusal(toRfqItem(d, i), i);
    if (r) return r;
  }
  return null;
}

/**
 * Why the breaks step may not proceed, or `null`.
 * @param {readonly RfqQuantityTier[]} tiers
 * @returns {string | null}
 */
export function tiersStepRefusal(tiers) {
  return tiersRefusal(tiers, 'the RFQ');
}

/**
 * The authoring half of the `t_rfq_create` payload. Emits ONLY what is present,
 * the `estimatedValue` discipline, and always the currency — the one field the
 * store used to overwrite.
 * @param {RfqAuthoringDraft} d
 * @returns {Record<string, unknown>}
 */
export function buildRfqAuthoringPayload(d) {
  const samplesQty = readVariantCount(d.samplesQty);
  return {
    currency: d.currency,
    ...(d.projectName.trim() ? { projectName: d.projectName.trim() } : {}),
    items: d.items.map(toRfqItem),
    tiers: d.tiers,
    ...(d.questions.length > 0 ? { questions: d.questions } : {}),
    allowAlternatives: d.allowAlternatives,
    confidential: d.confidential,
    ...(d.samplesOn
      ? { samplesRequested: { qty: samplesQty ?? 0, neededBy: d.samplesNeededBy } }
      : {}),
    ...(d.attachments.length > 0 ? { attachments: d.attachments } : {}),
    ...(d.sourceRfiId ? { sourceRfiId: d.sourceRfiId } : {}),
    ...(d.sourceRfpId ? { sourceRfpId: d.sourceRfpId } : {}),
    // RFx D3 — the create policy refuses an option an RFP award already placed
    // (NR-2 BR-08), and the RFP refuses to award one this RFQ sources.
    ...(d.sourceRfpId && d.sourceRfpOptionRefs && d.sourceRfpOptionRefs.length > 0
      ? { sourceRfpOptionRefs: [...d.sourceRfpOptionRefs] }
      : {}),
    ...(d.copiedFromRfqId ? { copiedFromRfqId: d.copiedFromRfqId } : {}),
    ...(d.templateId ? { templateId: d.templateId } : {}),
    ...(d.documentRequests && d.documentRequests.length > 0
      ? { documentRequests: d.documentRequests }
      : {})
  };
}

/**
 * Why the options step may not proceed, or `null`.
 * @param {RfqAuthoringDraft} d
 * @returns {string | null}
 */
export function optionsStepRefusal(d) {
  if (!d.samplesOn) return null;
  if (readVariantCount(d.samplesQty) === null || !/^\d{4}-\d{2}-\d{2}$/.test(d.samplesNeededBy)) {
    return 'SAMPLES_INVALID: a sample request needs a positive quantity and the date it is needed';
  }
  return null;
}

// ── Sources → seed ──────────────────────────────────────────────────────────

/**
 * @param {RfqItem} item
 * @param {boolean} keepAttachments
 * @returns {ItemDraft}
 */
const itemDraftFrom = (item, keepAttachments) => ({
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
  tiers: [...(item.tiers ?? [])]
});

/**
 * RFI → RFQ (REQ-E03-03 BR-02). `prefillRfqFromRfi` already chose the products
 * and the responders; this only re-expresses its lines as items. Each product
 * becomes an "Other" item carrying the RFI's specification text, because an RFI
 * answer names a product in the supplier's words and cannot tell us which spec
 * template it belongs to. The buyer picks the type in the wizard.
 * @param {RfqPrefill} p
 * @param {string} eventNumber
 * @returns {RfqDraftSeed}
 */
export function seedFromRfiPrefill(p, eventNumber) {
  const total = p.lineItems.reduce((s, l) => s + (l.quantity > 0 ? l.quantity : 0), 0);
  return {
    origin: { kind: 'rfi', label: eventNumber },
    title: p.title,
    category: p.materialCategory,
    invitedSupplierIds: p.invitedSupplierIds,
    sourceRfiId: p.sourceRfiId,
    ...(p.documentRequests.length > 0 ? { documentRequests: p.documentRequests } : {}),
    ...(total > 0 ? { totalQty: String(total) } : {}),
    items: p.lineItems.map((l) => {
      const base = newItemDraft('other');
      return {
        ...base,
        description: l.description,
        uom: l.uom,
        specFields: base.specFields.map((f) =>
          f.key === 'specification' && l.specification ? { ...f, value: l.specification } : f
        )
      };
    })
  };
}

/**
 * The item type an RFP option names OBVIOUSLY, from its title alone — or
 * `other`. Deliberately a short keyword list, not a classifier: a wrong guess
 * would put a spec sheet on the item that asks for the wrong things, so anything
 * the title does not name plainly stays "Other" and the buyer picks the type.
 * @param {string} title
 * @returns {RfqItemTypeId}
 */
export function obviousItemType(title) {
  const s = title.toLowerCase();
  if (/\b(sticker|label)s?\b/.test(s)) return 'sticker';
  if (/\b(unit box|carton|box)(es)?\b/.test(s)) return 'unitBox';
  if (/\b(mou?ld)s?\b/.test(s)) return 'moldComponent';
  if (/\b(bottle|pump|cap|closure|jar)s?\b/.test(s)) return 'bottleClosure';
  return 'other';
}

/**
 * RFP → RFQ (spec D3). `prefillRfqItemsFromRfp` already chose the options, the
 * quantity points and the responders, and left every indicative price behind
 * (an RFQ asks for FIRM prices, D4). This only re-expresses that neutral seed
 * as the wizard's draft:
 *
 * - each chosen option becomes an item of the obvious type (or Other), whose
 *   description is the option's title plus its detail;
 * - the quantity points become the RFQ's breaks, on the RFP's basis;
 * - the responders become the invitees; title, category and currency carry.
 *
 * The total quantity is the first break across the items — the same reading the
 * Oslo sample uses — so the basics step opens valid rather than blank. Every
 * field stays editable, and a type's required spec fields are left for the
 * buyer: the RFP asked the suppliers to recommend them, so no value exists to
 * carry.
 * @param {RfqSeedFromRfp} p
 * @param {string} eventNumber
 * @returns {RfqDraftSeed}
 */
export function seedFromRfp(p, eventNumber) {
  const points = p.items[0]?.quantityPoints ?? [];
  const basis = p.items[0]?.quantityBasis ?? 'total';
  const items = p.items.map((i) => {
    const base = newItemDraft(obviousItemType(i.description));
    return { ...base, description: i.note ? `${i.description} — ${i.note}` : i.description };
  });
  return {
    origin: { kind: 'rfp', label: eventNumber },
    title: p.title,
    category: p.materialCategory,
    ...(isBidCurrency(p.currency) ? { currency: p.currency } : {}),
    invitedSupplierIds: p.invitedSupplierIds,
    sourceRfpId: p.sourceRfpId,
    ...(p.documentRequests.length > 0 ? { documentRequests: p.documentRequests } : {}),
    sourceRfpOptionRefs: p.sourceRfpOptionRefs,
    ...(points.length > 0 && p.items.length > 0
      ? {
          totalQty: String(
            /** @type {NonNullable<(typeof points)[number]>} */ (points[0]) * p.items.length
          )
        }
      : {}),
    tiers: points.map((qty) => ({ qty, basis })),
    // The RFQ's unit follows its items (all a type's default, PCS today), so
    // the header quantity is not read in the wizard's KG default.
    ...(items[0] ? { uom: items[0].uom } : {}),
    items
  };
}

/**
 * Template → seed. A template carries no invitees and no dates, by construction.
 * @param {RfqTemplate} tpl
 * @param {string} label
 * @returns {RfqDraftSeed}
 */
export function seedFromTemplate(tpl, label) {
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
    ...(c.documentRequests ? { documentRequests: c.documentRequests } : {})
  };
}

/**
 * Past RFQ → seed (D2 / D3). A copy carries the content AND the invitees; its
 * dates are cleared, because a deadline copied from a closed event is already
 * in the past. An untiered legacy RFQ copies as one "Other" item.
 * @param {RFQ} rfq
 * @returns {RfqDraftSeed}
 */
export function seedFromRfq(rfq) {
  /** @type {ItemDraft[]} */
  const items =
    rfq.items && rfq.items.length > 0
      ? rfq.items.map((i) => itemDraftFrom(i, true))
      : [
          {
            ...newItemDraft('other'),
            description: rfq.title,
            uom: rfq.uom
          }
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
    ...(rfq.documentRequests ? { documentRequests: rfq.documentRequests } : {})
  };
}

/**
 * BL-93 — a stored DRAFT RFQ → the seed that re-opens the wizard on it for an
 * edit. Everything the create verb stored comes back: items (with their files),
 * breaks, questions, options, invitees, AND the dates, the sample date, the
 * RFQ-level files, the budget and the materials — the fields a copy clears.
 * Provenance is carried so the payload restates it; the revise verb keeps the
 * stored values regardless (where an RFQ came from is not editable).
 * @param {RFQ} rfq
 * @returns {RfqDraftSeed}
 */
export function seedForEdit(rfq) {
  const copy = seedFromRfq(rfq);
  return {
    ...copy,
    origin: undefined,
    copiedFromRfqId: rfq.copiedFromRfqId,
    sourceRfiId: rfq.sourceRfiId,
    sourceRfpId: rfq.sourceRfpId,
    templateId: rfq.templateId,
    projectName: rfq.projectName ?? '',
    questions: rfq.questions ?? [],
    allowAlternatives: rfq.allowAlternatives ?? false,
    confidential: rfq.confidential ?? false,
    responseDeadline: rfq.responseDeadline,
    awardDeadline: rfq.awardDeadline,
    ...(rfq.samplesRequested ? { samplesNeededBy: rfq.samplesRequested.neededBy } : {}),
    attachments: rfq.attachments ?? [],
    budget: rfq.estimatedValue !== undefined ? String(rfq.estimatedValue) : '',
    materials: rfq.materialIds
  };
}

// ── Draft / RFQ → template content ─────────────────────────────────────────

/**
 * What "Save as template" keeps from the wizard: no invitees, no dates, no files.
 * @param {RfqAuthoringDraft & { category: string; uom: string }} d
 * @returns {RfqTemplateContent}
 */
export function templateContentFromDraft(d) {
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
    ...(d.documentRequests && d.documentRequests.length > 0
      ? { documentRequests: d.documentRequests }
      : {})
  };
}

/**
 * What "Save as template" keeps from an existing RFQ. A legacy single-item RFQ
 * is kept as what it is — one "Other" item at one total break of its quantity —
 * so the button works on every RFQ; `null` only when there is not even a
 * quantity to keep.
 * @param {RFQ} rfq
 * @returns {RfqTemplateContent | null}
 */
export function templateContentFromRfq(rfq) {
  if (!rfq.items || rfq.items.length === 0 || !rfq.tiers || rfq.tiers.length === 0) {
    if (!(rfq.totalQty > 0) || !Number.isInteger(rfq.totalQty)) return null;
    const { attachments: _files, ...item } = toRfqItem(
      { ...newItemDraft('other'), description: rfq.title, uom: rfq.uom },
      0
    );
    void _files;
    return {
      category: rfq.materialCategory,
      uom: rfq.uom,
      currency: rfq.currency,
      items: [item],
      tiers: [{ qty: rfq.totalQty, basis: 'total' }],
      ...(rfq.documentRequests ? { documentRequests: rfq.documentRequests } : {})
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
    ...(rfq.documentRequests ? { documentRequests: rfq.documentRequests } : {})
  };
}
