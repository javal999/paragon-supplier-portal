/** @import { DeclarationForm } from './const' */

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
