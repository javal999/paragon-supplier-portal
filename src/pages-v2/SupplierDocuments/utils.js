/** @import { SupplierDocument } from '@services/data/types' */
/** @import { CoaForm, DeclarationForm } from './const' */
import { CERT_TYPE_FOR_CATEGORY } from './const';

// Pure helpers of the supplier documents page, moved out of
// `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).

/** Every field the verb requires is present and non-blank. `expiresOn` is
 * @param {DeclarationForm} f
 * @returns {boolean}
 *  deliberately absent from this check — see `DeclarationForm`. */
export function declarationComplete(f) {
  return (
    f.certNumber.trim() !== '' &&
    f.issuer.trim() !== '' &&
    f.issuedOn.trim() !== '' &&
    f.scopeText.trim() !== ''
  );
}

/** UCX-P5 — the COA form is complete when every field the COA verb requires is
 *  stated. `scopeText` is optional at the verb and at the form (the mockup's
 *  "What it covers" carries no required mark).
 * @param {CoaForm} f
 * @returns {boolean}
 */
export function coaComplete(f) {
  return (
    f.batch.trim() !== '' &&
    f.coaNumber.trim() !== '' &&
    f.issuer.trim() !== '' &&
    f.issuedOn.trim() !== ''
  );
}

/**
 * UCX-P5 · UCX-F21 — the renewal form, filled from the expiring record.
 *
 * ⚠️ **THE SCHEME COMES FROM THE RECORD'S CATEGORY, BECAUSE A SEEDED ROW HAS NO
 * DECLARED SCHEME.** A row declared through the verb carries its `certType`
 * and that wins. A seeded row carries only its category, so the page's
 * `CERT_TYPE_FOR_CATEGORY` map answers — the same mapping the declare path
 * already uses. The issuer and scope come from the record's own fields; the
 * number and grant date are left EMPTY on purpose: they belong to the new
 * certificate, and prefilling an old number into a renewal is the defect the
 * proposal exists to end.
 * @param {SupplierDocument} doc
 * @returns {DeclarationForm}
 */
export function renewalFormFrom(doc) {
  return {
    certType: doc.declaration?.certType ?? CERT_TYPE_FOR_CATEGORY[doc.category] ?? 'OTHER',
    certNumber: '',
    issuer: doc.declaration?.issuer ?? doc.issuedBy,
    issuedOn: '',
    expiresOn: '',
    scopeText: doc.declaration?.scopeText ?? doc.linkedTo
  };
}
