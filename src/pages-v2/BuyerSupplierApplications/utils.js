// Pure helpers for the buyer review lane (`BuyerSupplierApplications`). No
// React. Moved out of the page by the Phase 5 page split; logic unchanged.

import { DataError } from '@services/data/types';
/** @import { ApplicationDeclarationKind } from '@services/transitions/flows/supplierApplication.flow' */
import { APPLICATION_DECLARATION_KINDS } from '@services/transitions/flows/supplierApplication.flow';

/**
 * The empty declaration draft: every permitted subject, no reference yet.
 *
 * ⚠️ DERIVED FROM THE CLOSED SET, never listed — a fifth declaration kind must
 * appear in this form by adding it to the flow, and a form that listed four
 * literals would silently keep asking for four.
 * @returns {Record<ApplicationDeclarationKind, string>}
 */
export const emptyDeclarations = () =>
  /** @type {Record< ApplicationDeclarationKind, string >} */ (
    Object.fromEntries(APPLICATION_DECLARATION_KINDS.map((k) => [k, '']))
  );

/**
 * A refusal the dispatcher THREW, in the reader's language.
 *
 * `SCOPE_DENIED` and its siblings arrive as a thrown `DataError` whose message
 * is prose, so `useRefusalText` cannot read them — `useDataErrorText` owns
 * that vocabulary and returns `null` for a code it does not own, which is why
 * the fallback chain below is preserved rather than collapsed. The
 * `BuyerRequisitions` helper, copied deliberately: two surfaces answering the
 * same question the same way is better than one of them inventing a message.
 *
 * Takes the page's `useDataErrorText()` result as its first argument so it
 * stays a plain function (the split moved it out of the component body).
 * @param {(code: string | undefined) => string | null} dataErrorText
 * @param {unknown} e
 * @param {string} fallback
 * @returns {string}
 */
export const describeThrown = (dataErrorText, e, fallback) =>
  dataErrorText(e instanceof DataError ? e.code : undefined) ??
  (e instanceof DataError ? e.message : fallback);
