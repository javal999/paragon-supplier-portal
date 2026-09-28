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
import type { AttachmentMeta } from '../attachments/sessionAttachments';
import { rfxFamilyForCategory, rfxSectionsOf } from './rfxConfig';
import { parseRfpOptionRef, rfpOptionRef } from './rfpFirmOffer';
import { rfpOptionSourcedRefusal } from './rfpAward';

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
  readonly attachments: readonly AttachmentMeta[];
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
  /**
   * RFx D2 — the option's ref (`rfpOptionRef`): the buyer option's id, or
   * `${proposer}:${sup-opt-N}`, so two suppliers' `sup-opt-1` stay apart.
   */
  readonly sourceOptionRef: string;
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
  /**
   * RFx D2 (NR-2 BR-08) — the option refs this RFQ will source; the RFQ create
   * payload carries them, so the RFP cannot award them as well.
   */
  readonly sourceRfpOptionRefs: readonly string[];
}

/**
 * `chosenOptions` names each option by its ref (`rfpOptionRef`). A bare
 * supplier-proposed id (`sup-opt-N`, the form links carried before D2) is read
 * only when exactly one submitted response proposes it; two suppliers' same
 * id is ambiguous and skipped, never guessed.
 *
 * RFx D2 (NR-2 BR-08) — `awardedOptionRefs` are the options an award in force
 * on the RFP already placed. They are left out through the same rule the RFQ
 * create policy refuses them by (`rfpOptionSourcedRefusal`).
 */
export function prefillRfqItemsFromRfp(
  rfp: RfpEvent,
  responses: readonly RfpResponse[],
  chosenOptions: readonly string[],
  awardedOptionRefs: readonly string[] = [],
): RfqSeedFromRfp {
  const submitted = responses.filter((r) => r.rfpId === rfp.id && r.status === 'Submitted');
  const points = rfp.pricing?.quantityPoints ?? [];
  const basis = rfp.pricing?.quantityBasis ?? 'total';
  const awarded = new Map(awardedOptionRefs.map((ref) => [ref, ref] as const));
  const items: RfqItemSeedFromRfp[] = [];
  for (const chosen of [...new Set(chosenOptions)]) {
    const { optionId, proposerSupplierId } = parseRfpOptionRef(chosen);
    const own = proposerSupplierId ? undefined : rfp.pricing?.options.find((o) => o.id === optionId);
    const proposers = own
      ? []
      : submitted.filter(
          (r) =>
            (proposerSupplierId === undefined || r.supplierId === proposerSupplierId) &&
            (r.pricing?.proposedOptions ?? []).some((o) => o.id === optionId),
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
      quantityBasis: basis,
    });
  }
  // A responder priced a chosen option when its own prices name it: a buyer
  // option by id, a supplier-proposed one only in its proposer's answer (another
  // supplier's `sup-opt-1` is another option).
  const pricedBy = (r: RfpResponse, item: RfqItemSeedFromRfp): boolean =>
    (item.proposedBySupplierId === undefined || item.proposedBySupplierId === r.supplierId) &&
    (r.pricing?.prices ?? []).some((p) => p.optionId === item.sourceOptionId);
  const invited = submitted.filter((r) => items.some((i) => pricedBy(r, i))).map((r) => r.supplierId);
  return {
    title: rfp.title,
    materialCategory: rfp.materialCategory,
    currency: rfp.currency,
    sourceRfpId: rfp.id,
    invitedSupplierIds: [...new Set(invited)],
    items,
    sourceRfpOptionRefs: items.map((i) => i.sourceOptionRef),
  };
}
