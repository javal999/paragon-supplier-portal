// Module-scope constants and the draft shape of the RFP creation wizard (no React).
// Split out of `rfx/RfpCreateWizard.jsx` (frontend-standard Phase 5, wave 7).

import { BASE_CURRENCY } from '@lib/currencyPolicy';
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
/** @import { DocumentRequest, RfiQuestion, RfpPricingRequest, RfpTermRow, RfxCustomSection } from '@services/sourcing/types' */

/**
 * @typedef {object} Draft
 * @property {string} title
 * @property {string} family
 * @property {string} scope
 * @property {string} currency
 * @property {string} responseDeadline
 * @property {Record<string, string>} terms -  Picked standard term → PTI's requested value. Order of the standard list is kept.
 * @property {readonly RfpTermRow[]} customTerms -  The buyer's own terms for this RFP.
 * @property {string[]} invitedSupplierIds
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} customSections
 * @property {RfpPricingRequest | undefined} pricing
 * @property {readonly AttachmentMeta[]} attachments
 * @property {boolean} confidential
 * @property {string} confidentialityTerms
 * @property {string} termsText
 * @property {readonly AttachmentMeta[]} termsFile
 * @property {string} sourceRfiId
 * @property {string} [purchasingGroup] -  Not authored here: carried so an edit keeps the event's purchasing group.
 * @property {readonly DocumentRequest[]} documentRequests NR-1 BR-02 — edited on the "Documents from suppliers" step (B3), and
 *   carried through edit, copy, template and RFI pre-fill.
 */

/**
 * The setter every step uses to change the draft (the wizard's `setDraft`).
 * @typedef {import('react').Dispatch<import('react').SetStateAction<Draft>>} SetDraft
 */

/** @type {Draft} */
export const EMPTY = {
  title: '',
  family: '',
  scope: '',
  currency: BASE_CURRENCY,
  responseDeadline: '',
  terms: {},
  customTerms: [],
  invitedSupplierIds: [],
  questions: [],
  customSections: [],
  pricing: undefined,
  attachments: [],
  confidential: false,
  confidentialityTerms: '',
  termsText: '',
  termsFile: [],
  sourceRfiId: '',
  documentRequests: []
};
