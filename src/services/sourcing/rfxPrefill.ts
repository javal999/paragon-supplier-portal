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
import type { RfiEvent, RfiResponse } from './types';

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
