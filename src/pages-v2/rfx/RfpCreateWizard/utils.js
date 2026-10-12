// Pure helpers of the RFP creation wizard (no React): the draft ↔ stored-RFP
// mappings. Split out of `rfx/RfpCreateWizard.jsx` (frontend-standard Phase 5, wave 7).

import { RFP_STANDARD_TERMS, rfpTerm, rfxFamilyForCategory } from '@services/sourcing/rfxConfig';
/** @import { RfpTemplateContent } from '@services/sourcing/rfxTemplates' */
/** @import { RfpEvent, RfpTermRow } from '@services/sourcing/types' */
/** @import { Draft } from './const' */

/**
 * Split a stored term list into the wizard's two halves.
 * @param {readonly RfpTermRow[]} rows
 */
export const splitTerms = (rows) => ({
  terms: Object.fromEntries(
    rows.filter((r) => rfpTerm(r.termId)).map((r) => [r.termId, r.requestedValue])
  ),
  customTerms: rows.filter((r) => !rfpTerm(r.termId))
});

/**
 * BL-93 — a stored Draft RFP as the wizard edits it: every field, dates kept.
 * @param {RfpEvent} e
 * @returns {Draft}
 */
export const draftOf = (e) => ({
  title: e.title,
  family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
  scope: e.scope,
  currency: e.currency,
  responseDeadline: e.responseDeadline,
  ...splitTerms(e.terms),
  invitedSupplierIds: e.invitees.map((i) => i.supplierId),
  questions: e.questions ?? [],
  customSections: e.customSections ?? [],
  pricing: e.pricing,
  attachments: e.attachments ?? [],
  confidential: !!e.confidentiality,
  confidentialityTerms: e.confidentiality?.terms ?? '',
  termsText: e.termsDocument?.text ?? '',
  termsFile: e.termsDocument?.attachment ? [e.termsDocument.attachment] : [],
  sourceRfiId: e.sourceRfiId ?? '',
  ...(e.purchasingGroup ? { purchasingGroup: e.purchasingGroup } : {}),
  documentRequests: e.documentRequests ?? []
});

/**
 * The rows in the STANDARD LIST's own order, then the buyer's own terms.
 * @param {Draft} draft
 * @returns {RfpTermRow[]}
 */
export const termRowsOf = (draft) => [
  ...RFP_STANDARD_TERMS.filter((term) => term.id in draft.terms).map((term) => ({
    termId: term.id,
    requestedValue: draft.terms[term.id].trim()
  })),
  ...draft.customTerms
];

/**
 * The draft as a saved template's content: no title, dates, invitees or files.
 * @param {Draft} draft
 * @returns {RfpTemplateContent}
 */
export const templateContentOf = (draft) => ({
  familyId: draft.family,
  scope: draft.scope.trim(),
  currency: draft.currency,
  terms: termRowsOf(draft),
  questions: draft.questions,
  customSections: draft.customSections,
  ...(draft.pricing ? { pricing: draft.pricing } : {}),
  confidential: draft.confidential,
  ...(draft.confidential && draft.confidentialityTerms.trim()
    ? { confidentialityTerms: draft.confidentialityTerms.trim() }
    : {}),
  ...(draft.termsText.trim() ? { termsText: draft.termsText.trim() } : {}),
  ...(draft.documentRequests.length > 0 ? { documentRequests: draft.documentRequests } : {})
});
