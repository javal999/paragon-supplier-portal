/** @import { CertType, SupplierDocumentCategory as DocCategory } from '@services/data/types' */

// Module-scope constants of the supplier documents page, moved out of
// `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
// The two MAPPED constants (`CATEGORY_FILTERS`, `CERT_TYPES`) stay in the
// component that maps them, where the module-scope literal gate keys them.

/** @typedef {'All' | DocCategory} CategoryFilter */

/** @typedef {'all' | 'expired' | 'expiring' | 'due' | 'awaiting-upload'} ExpiryFilter */

/** @typedef {'closed' | 'new' | 'upload-existing' | 'view' | 'answer-coa' | 'renew'} PanelMode */

/** The certificate type that files a declared document under a category (the
 * @type {Partial<Record<DocCategory, CertType>>}
 *  target's own mapping, inverted for the categories a declaration can reach). */
export const CERT_TYPE_FOR_CATEGORY = {
  'Halal Compliance': 'HALAL_BPJPH',
  'BPOM Regulatory': 'BPOM',
  'Tax & Legal': 'TAX_LEGAL',
  Quality: 'ISO',
  Other: 'OTHER'
};

/** The class of every field label in the declaration form. */
export const FIELD_LABEL = 'block text-label text-text-tertiary uppercase mb-1';
/** The class of every input, select and textarea in the declaration form. */
export const FIELD_INPUT =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
/** The class of every hint line under a declaration field. */
export const FIELD_HINT = 'block text-xs text-text-tertiary mt-1';

/** What the panel is collecting. `expiresOn` is the ONLY optional one — a BPJPH
 *  cert has permanent validity under GR 42/2024, so blank is an answer. */
/**
 * @typedef {object} DeclarationForm
 * @property {CertType} certType
 * @property {string} certNumber
 * @property {string} issuer
 * @property {string} issuedOn
 * @property {string} expiresOn
 * @property {string} scopeText
 */

/** @type {DeclarationForm} */
export const EMPTY_FORM = {
  certType: 'HALAL_BPJPH',
  certNumber: '',
  issuer: '',
  issuedOn: '',
  expiresOn: '',
  scopeText: ''
};

/** UCX-P5 (BL-366) — the COA answer's own form. `batch` is prefilled from the
 *  request and may be corrected; `scopeText` is the only optional one.
 * @typedef {object} CoaForm
 * @property {string} batch
 * @property {string} coaNumber
 * @property {string} issuer
 * @property {string} issuedOn
 * @property {string} scopeText
 */

/** @type {CoaForm} */
export const EMPTY_COA_FORM = {
  batch: '',
  coaNumber: '',
  issuer: '',
  issuedOn: '',
  scopeText: ''
};
