// ────────────────────────────────────────────────────────────────────────────
// Mutable SupplierDocument store (§82).
//
// Same contract as `requirementResponseStore` / `inventoryDeclarationStore`:
// reads resolve FROM here, and the supplier-document verbs mutate it through the
// dispatcher — never directly from a page.
//
// ⚠️ **WHY THIS FILE EXISTS AT ALL, STATED ONCE.** Until §82 `supplierDocument`
// was one of the flows with no `CommandTarget`, so its four verbs could not fire
// and `DOCUMENTS` was read straight out of the fixture module by
// `MockProcurementService`. A frozen array is the correct shape for data nothing
// writes; it is the wrong shape the moment a verb does, because a page that
// mutates a module-level literal is the un-governed write path this platform
// does not have. The store is the seam that keeps the write inside the
// dispatcher.
// ────────────────────────────────────────────────────────────────────────────

import { DOCUMENTS } from '../fixtures/supplierDocuments';
/** @import { SupplierDocument } from '../../types' */

/**
 * @param {SupplierDocument} d
 * @returns {SupplierDocument}
 */
function clone(d) {
  return {
    ...d,
    ...(d.declaration ? { declaration: { ...d.declaration } } : {})
  };
}

/** @type {SupplierDocument[]} */
let rows = DOCUMENTS.map(clone);
let seq = 0;

export const supplierDocumentStore = {
  /**
   * All documents (the mutable source reads resolve from).
   * @returns {readonly SupplierDocument[]}
   */
  all() {
    return rows;
  },
  /**
   * One document by id, or undefined.
   * @param {string} id
   * @returns {SupplierDocument | undefined}
   */
  get(id) {
    return rows.find((d) => d.id === id);
  },
  /** Add a newly-declared document (creation). New array reference, newest first
   * @param {SupplierDocument} doc
   * @returns {void}
   *  — a supplier that has just declared should see its own act at the top. */
  add(doc) {
    rows = [doc, ...rows];
  },
  /** Apply a transition's effects to one document. No-op when absent — the
   *  dispatcher has already proven existence via `readState`, so this cannot be
   * @param {string} id
   * @param {(d: SupplierDocument) => SupplierDocument} fn
   * @returns {void}
   *  reached with an unknown id; the guard is defence in depth, not a fallback. */
  update(id, fn) {
    rows = rows.map((d) => (d.id === id ? fn(d) : d));
  },
  /**
   * Store-assigned id for a declaration (distinct 9xxx range; fixtures are
   * `doc-0xx`). The platform convention — the store mints the identity, never
   * the caller, so a supplier cannot choose which document it is writing over.
   * @returns {string}
   */
  nextNumber() {
    seq += 1;
    return `doc-${9000 + seq}`;
  },
  /**
   * Restore the fixture seed (test isolation).
   * @returns {void}
   */
  reset() {
    rows = DOCUMENTS.map(clone);
    seq = 0;
  }
};
