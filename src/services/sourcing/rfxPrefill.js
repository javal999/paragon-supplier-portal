// ────────────────────────────────────────────────────────────────────────────
// RFI → RFQ PRE-FILL — REQ-E03-03 BR-02 / AC-02.
//
// "The hub copies the selected product specifications and suppliers into a new
// RFQ draft" — and the buyer can then edit everything (BR-02). So this module
// produces a DRAFT SHAPE, never a stored RFQ: it is the starting point the
// wizard opens on, and nothing here is binding.
//
// Pure. It reads only SUBMITTED responses — a draft is invisible to the buyer
// (REQ-E03-02 edge case), so pre-filling from one would leak an answer the
// supplier has not sent.
//
// NR-1 BR-11 — every pre-fill here copies the BUYER'S document requests and
// never a supplier's documents: a file answers one event's request, so it is
// not presented as an answer to a new one. The new event links back to its
// source instead (`sourceRfiId`, `sourceRfpId`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfqLineItem } from '@data/mockRfqs' */
/** @import { DocumentRequest, RfiEvent, RfiResponse, RfpEvent, RfpResponse } from './types' */
/** @import { AttachmentMeta } from '../attachments/sessionAttachments' */
import { rfxFamilyForCategory, rfxSectionsOf } from './rfxConfig';
import { parseRfpOptionRef, rfpOptionRef } from './rfpFirmOffer';
import { rfpOptionSourcedRefusal } from './rfpAward';

/**
 * The buyer's requests, copied as they stand (a fresh array, same ids).
 * @param {readonly DocumentRequest[] | undefined} requests
 * @returns {readonly DocumentRequest[]}
 */
const copyRequests = (requests) => (requests ?? []).map((r) => ({ ...r }));

/** The editable draft an RFQ opens on when it is created from an RFI. */
/**
 * @typedef {object} RfqPrefill
 * @property {string} title
 * @property {string} materialCategory
 * @property {string} sourceRfiId
 * @property {readonly string[]} invitedSupplierIds
 * @property {readonly RfqLineItem[]} lineItems
 * @property {readonly DocumentRequest[]} documentRequests -  NR-1 BR-11 — the RFI's document requests.
 */

/**
 * @param {RfiResponse} response
 * @param {string} questionId
 * @returns {string}
 */
const answerText = (response, questionId) => {
  const a = response.answers.find((x) => x.questionId === questionId);
  if (!a) return '';
  const v = a.value;
  if (Array.isArray(v)) return v.join(', ');
  return v === undefined ? '' : String(v);
};

/**
 * @param {RfiResponse} response
 * @param {string} questionId
 * @returns {number | null}
 */
const answerNumber = (response, questionId) => {
  const n = Number(answerText(response, questionId));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Build the RFQ draft an RFI feeds.
 *
 * `supplierIds` narrows the carried-over invitees — the RFI's responders minus
 * the ones the buyer removes (REQ-E03-03 edge case). Omitted = every supplier
 * that SUBMITTED a response.
 * @param {RfiEvent} rfi
 * @param {readonly RfiResponse[]} responses
 * @param {readonly string[]} [supplierIds]
 * @returns {RfqPrefill}
 */
export function prefillRfqFromRfi(rfi, responses, supplierIds) {
  const submitted = responses.filter((r) => r.rfiId === rfi.id && r.status === 'Submitted');
  const chosen = submitted.filter((r) => (supplierIds ? supplierIds.includes(r.supplierId) : true));

  // One line item per DISTINCT product a chosen supplier named, in response
  // order. Two suppliers offering the same product make ONE item to be quoted,
  // not two — which is what makes the quotes comparable at all.
  /** @type {RfqLineItem[]} */
  const lineItems = [];
  for (const response of chosen) {
    const description = answerText(response, 'd-product').trim();
    if (!description) continue;
    const key = description.toLowerCase();
    if (lineItems.some((li) => li.description.toLowerCase() === key)) continue;
    lineItems.push({
      lineNo: lineItems.length + 1,
      // The material code is PTI's to assign; an RFI answer cannot mint one, so
      // the draft carries the RFI's own number as the placeholder a buyer
      // replaces. Inventing a code here would put a fabricated master key on a
      // sourcing document.
      materialCode: `${rfi.eventNumber}-${lineItems.length + 1}`,
      description,
      quantity: answerNumber(response, 'd-moq') ?? 0,
      uom: 'PCS',
      specification: answerText(response, 'd-specification').trim() || undefined
    });
  }

  return {
    title: rfi.title,
    materialCategory: rfi.materialCategory,
    sourceRfiId: rfi.id,
    invitedSupplierIds: chosen.map((r) => r.supplierId),
    lineItems,
    documentRequests: copyRequests(rfi.documentRequests)
  };
}

// ── RFI → RFP (spec D3) ─────────────────────────────────────────────────────
//
// "Create RFP from this RFI" copies the scope and the invitees and turns the
// RFI's questions into the RFP's scope notes. Same contract as the RFQ pre-fill
// above: a DRAFT SHAPE the wizard opens on, every field editable, and only
// SUBMITTED responses read — a draft answer is invisible to PTI, so its author
// is not carried forward as a responder.

/** The editable draft an RFP opens on when it is created from an RFI. */
/**
 * @typedef {object} RfpPrefill
 * @property {string} title
 * @property {string} familyId -  The category family the RFI was raised under; `''` when none matches.
 * @property {string} scope -  The RFI's description, as the RFP's scope. `''` when the RFI had none.
 * @property {readonly string[]} scopeNoteKeys The RFI's questions as scope notes: their prompt KEYS (or, for a question
 *   the buyer wrote, its words), in the order the RFI renders them. The wizard
 *   resolves them through `t()`; a pure function cannot translate.
 * @property {readonly string[]} invitedSupplierIds
 * @property {readonly AttachmentMeta[]} attachments
 * @property {boolean} confidential
 * @property {string} [confidentialityTerms]
 * @property {string} sourceRfiId
 * @property {readonly DocumentRequest[]} documentRequests -  NR-1 BR-11 — the RFI's document requests.
 */

/**
 * @param {RfiEvent} rfi
 * @param {readonly RfiResponse[]} responses
 * @param {readonly string[]} [supplierIds]
 * @returns {RfpPrefill}
 */
export function prefillRfpFromRfi(rfi, responses, supplierIds) {
  const submitted = responses.filter((r) => r.rfiId === rfi.id && r.status === 'Submitted');
  const chosen = submitted.filter((r) => (supplierIds ? supplierIds.includes(r.supplierId) : true));
  const order = rfxSectionsOf(rfi.customSections).map((s) => /** @type {string} */ (s.id));
  const notes = [...rfi.questions]
    .sort((a, b) => order.indexOf(a.sectionId) - order.indexOf(b.sectionId))
    .map((q) => q.promptKey);
  return {
    title: rfi.title,
    familyId: rfxFamilyForCategory(rfi.materialCategory)?.id ?? '',
    scope: rfi.description ?? '',
    scopeNoteKeys: notes,
    invitedSupplierIds: [...new Set(chosen.map((r) => r.supplierId))],
    attachments: rfi.attachments ?? [],
    confidential: !!rfi.confidentiality,
    ...(rfi.confidentiality?.terms ? { confidentialityTerms: rfi.confidentiality.terms } : {}),
    sourceRfiId: rfi.id,
    documentRequests: copyRequests(rfi.documentRequests)
  };
}

// ── RFP → RFQ, the data half only (spec D3; the wizard wiring is a later batch)
//
// Written against NEUTRAL shapes on purpose: the RFQ model is being rebuilt in
// parallel (B1), and this seed must not import its types. The later batch maps
// an item seed onto the new RFQ item. Only the chosen OPTIONS travel, with the
// quantity points as the tiers to quote — never the indicative prices, because
// an RFQ asks for FIRM prices (D4) and pre-filling one from an indicative
// number would put an unquoted price on a sourcing document.

/** One RFQ item seed, from one RFP option (PTI's or a supplier's own). */
/**
 * @typedef {object} RfqItemSeedFromRfp
 * @property {string} sourceOptionId
 * @property {string} sourceOptionRef RFx D2 — the option's ref (`rfpOptionRef`): the buyer option's id, or
 *   `${proposer}:${sup-opt-N}`, so two suppliers' `sup-opt-1` stay apart.
 * @property {string} description
 * @property {string} [note]
 * @property {string} [proposedBySupplierId] -  Set when the option was proposed by a supplier rather than by PTI.
 * @property {readonly number[]} quantityPoints
 * @property {'perVariant' | 'total'} quantityBasis
 */

/**
 * @typedef {object} RfqSeedFromRfp
 * @property {string} title
 * @property {string} materialCategory
 * @property {string} currency
 * @property {string} sourceRfpId
 * @property {readonly string[]} invitedSupplierIds -  Submitted responders that priced at least one chosen option.
 * @property {readonly RfqItemSeedFromRfp[]} items
 * @property {readonly DocumentRequest[]} documentRequests -  NR-1 BR-11 — the RFP's document requests.
 * @property {readonly string[]} sourceRfpOptionRefs RFx D2 (NR-2 BR-08) — the option refs this RFQ will source; the RFQ create
 *   payload carries them, so the RFP cannot award them as well.
 */

/**
 * `chosenOptions` names each option by its ref (`rfpOptionRef`). A bare
 * supplier-proposed id (`sup-opt-N`, the form links carried before D2) is read
 * only when exactly one submitted response proposes it; two suppliers' same
 * id is ambiguous and skipped, never guessed.
 *
 * RFx D2 (NR-2 BR-08) — `awardedOptionRefs` are the options an award in force
 * on the RFP already placed. They are left out through the same rule the RFQ
 * create policy refuses them by (`rfpOptionSourcedRefusal`).
 * @param {RfpEvent} rfp
 * @param {readonly RfpResponse[]} responses
 * @param {readonly string[]} chosenOptions
 * @param {readonly string[]} [awardedOptionRefs]
 * @returns {RfqSeedFromRfp}
 */
export function prefillRfqItemsFromRfp(rfp, responses, chosenOptions, awardedOptionRefs = []) {
  const submitted = responses.filter((r) => r.rfpId === rfp.id && r.status === 'Submitted');
  const points = rfp.pricing?.quantityPoints ?? [];
  const basis = rfp.pricing?.quantityBasis ?? 'total';
  const awarded = new Map(awardedOptionRefs.map((ref) => /** @type {const} */ ([ref, ref])));
  /** @type {RfqItemSeedFromRfp[]} */
  const items = [];
  for (const chosen of [...new Set(chosenOptions)]) {
    const { optionId, proposerSupplierId } = parseRfpOptionRef(chosen);
    const own = proposerSupplierId
      ? undefined
      : rfp.pricing?.options.find((o) => o.id === optionId);
    const proposers = own
      ? []
      : submitted.filter(
          (r) =>
            (proposerSupplierId === undefined || r.supplierId === proposerSupplierId) &&
            (r.pricing?.proposedOptions ?? []).some((o) => o.id === optionId)
        );
    const proposer = proposers.length === 1 ? proposers[0] : undefined;
    const option = own ?? proposer?.pricing?.proposedOptions.find((o) => o.id === optionId);
    // An id that names no option on this RFP, or names two, is skipped, never invented.
    if (!option) continue;
    const ref = rfpOptionRef(option.id, proposer?.supplierId);
    if (rfpOptionSourcedRefusal([ref], awarded, () => 'awarded on this RFP')) continue;
    items.push({
      sourceOptionId: option.id,
      sourceOptionRef: ref,
      description: option.title,
      ...(option.description ? { note: option.description } : {}),
      ...(proposer ? { proposedBySupplierId: proposer.supplierId } : {}),
      quantityPoints: points,
      quantityBasis: basis
    });
  }
  // A responder priced a chosen option when its own prices name it: a buyer
  // option by id, a supplier-proposed one only in its proposer's answer (another
  // supplier's `sup-opt-1` is another option).
  /**
   * @param {RfpResponse} r
   * @param {RfqItemSeedFromRfp} item
   * @returns {boolean}
   */
  const pricedBy = (r, item) =>
    (item.proposedBySupplierId === undefined || item.proposedBySupplierId === r.supplierId) &&
    (r.pricing?.prices ?? []).some((p) => p.optionId === item.sourceOptionId);
  const invited = submitted
    .filter((r) => items.some((i) => pricedBy(r, i)))
    .map((r) => r.supplierId);
  return {
    title: rfp.title,
    materialCategory: rfp.materialCategory,
    currency: rfp.currency,
    sourceRfpId: rfp.id,
    invitedSupplierIds: [...new Set(invited)],
    items,
    documentRequests: copyRequests(rfp.documentRequests),
    sourceRfpOptionRefs: items.map((i) => i.sourceOptionRef)
  };
}
