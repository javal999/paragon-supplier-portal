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
// ────────────────────────────────────────────────────────────────────────────

import type { RfqLineItem } from '../../data/mockRfqs';
import type { RfiEvent, RfiResponse, RfpEvent, RfpResponse } from './types';
import type { SessionAttachmentMeta } from '../../lib/sessionFiles';
import { rfxFamilyForCategory, rfxSectionsOf } from './rfxConfig';

/** The editable draft an RFQ opens on when it is created from an RFI. */
export interface RfqPrefill {
  readonly title: string;
  readonly materialCategory: string;
  readonly sourceRfiId: string;
  readonly invitedSupplierIds: readonly string[];
  readonly lineItems: readonly RfqLineItem[];
}

const answerText = (response: RfiResponse, questionId: string): string => {
  const a = response.answers.find((x) => x.questionId === questionId);
  if (!a) return '';
  const v = a.value;
  if (Array.isArray(v)) return v.join(', ');
  return v === undefined ? '' : String(v);
};

const answerNumber = (response: RfiResponse, questionId: string): number | null => {
  const n = Number(answerText(response, questionId));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Build the RFQ draft an RFI feeds.
 *
 * `supplierIds` narrows the carried-over invitees — the RFI's responders minus
 * the ones the buyer removes (REQ-E03-03 edge case). Omitted = every supplier
 * that SUBMITTED a response.
 */
export function prefillRfqFromRfi(
  rfi: RfiEvent,
  responses: readonly RfiResponse[],
  supplierIds?: readonly string[],
): RfqPrefill {
  const submitted = responses.filter((r) => r.rfiId === rfi.id && r.status === 'Submitted');
  const chosen = submitted.filter((r) => (supplierIds ? supplierIds.includes(r.supplierId) : true));

  // One line item per DISTINCT product a chosen supplier named, in response
  // order. Two suppliers offering the same product make ONE item to be quoted,
  // not two — which is what makes the quotes comparable at all.
  const lineItems: RfqLineItem[] = [];
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
      specification: answerText(response, 'd-specification').trim() || undefined,
    });
  }

  return {
    title: rfi.title,
    materialCategory: rfi.materialCategory,
    sourceRfiId: rfi.id,
    invitedSupplierIds: chosen.map((r) => r.supplierId),
    lineItems,
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
export interface RfpPrefill {
  readonly title: string;
  /** The category family the RFI was raised under; `''` when none matches. */
  readonly familyId: string;
  /** The RFI's description, as the RFP's scope. `''` when the RFI had none. */
  readonly scope: string;
  /**
   * The RFI's questions as scope notes: their prompt KEYS (or, for a question
   * the buyer wrote, its words), in the order the RFI renders them. The wizard
   * resolves them through `t()`; a pure function cannot translate.
   */
  readonly scopeNoteKeys: readonly string[];
  readonly invitedSupplierIds: readonly string[];
  readonly attachments: readonly SessionAttachmentMeta[];
  readonly confidential: boolean;
  readonly confidentialityTerms?: string;
  readonly sourceRfiId: string;
}

export function prefillRfpFromRfi(
  rfi: RfiEvent,
  responses: readonly RfiResponse[],
  supplierIds?: readonly string[],
): RfpPrefill {
  const submitted = responses.filter((r) => r.rfiId === rfi.id && r.status === 'Submitted');
  const chosen = submitted.filter((r) => (supplierIds ? supplierIds.includes(r.supplierId) : true));
  const order = rfxSectionsOf(rfi.customSections).map((s) => s.id as string);
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
export interface RfqItemSeedFromRfp {
  readonly sourceOptionId: string;
  readonly description: string;
  readonly note?: string;
  /** Set when the option was proposed by a supplier rather than by PTI. */
  readonly proposedBySupplierId?: string;
  readonly quantityPoints: readonly number[];
  readonly quantityBasis: 'perVariant' | 'total';
}

export interface RfqSeedFromRfp {
  readonly title: string;
  readonly materialCategory: string;
  readonly currency: string;
  readonly sourceRfpId: string;
  /** Submitted responders that priced at least one chosen option. */
  readonly invitedSupplierIds: readonly string[];
  readonly items: readonly RfqItemSeedFromRfp[];
}

export function prefillRfqItemsFromRfp(
  rfp: RfpEvent,
  responses: readonly RfpResponse[],
  chosenOptionIds: readonly string[],
): RfqSeedFromRfp {
  const submitted = responses.filter((r) => r.rfpId === rfp.id && r.status === 'Submitted');
  const points = rfp.pricing?.quantityPoints ?? [];
  const basis = rfp.pricing?.quantityBasis ?? 'total';
  const items: RfqItemSeedFromRfp[] = [];
  for (const optionId of [...new Set(chosenOptionIds)]) {
    const own = rfp.pricing?.options.find((o) => o.id === optionId);
    const proposer = own
      ? undefined
      : submitted.find((r) => r.pricing?.proposedOptions.some((o) => o.id === optionId));
    const option = own ?? proposer?.pricing?.proposedOptions.find((o) => o.id === optionId);
    // An id that names no option on this RFP is skipped, never invented.
    if (!option) continue;
    items.push({
      sourceOptionId: option.id,
      description: option.title,
      ...(option.description ? { note: option.description } : {}),
      ...(proposer ? { proposedBySupplierId: proposer.supplierId } : {}),
      quantityPoints: points,
      quantityBasis: basis,
    });
  }
  const chosen = new Set(items.map((i) => i.sourceOptionId));
  const invited = submitted
    .filter((r) => (r.pricing?.prices ?? []).some((p) => chosen.has(p.optionId)))
    .map((r) => r.supplierId);
  return {
    title: rfp.title,
    materialCategory: rfp.materialCategory,
    currency: rfp.currency,
    sourceRfpId: rfp.id,
    invitedSupplierIds: [...new Set(invited)],
    items,
  };
}
