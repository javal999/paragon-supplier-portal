import { mockSuppliers } from '@data/mockSuppliers';
/** @import { ISupplierService, Page, QueryScope, Supplier, VendorQualification, SupplierStockUpdateMode } from '../types' */
/** @import { UpdateCompliance } from '../../transitions/updateCompliance' */
import { DataError } from '../types';
import { withMeasures } from './supplierMeasureReadModel';
import { allStockUpdateModes } from './supplierMaster';
import { updateComplianceFor } from './updateComplianceReadModel';
import { allQualifications, qualificationFor } from './qualificationReadModel';

// ⚠️ REQ-E10-01 — OTIF AND THE GRADE ARE PROJECTED HERE, NOT READ FROM THE
// FIXTURE. Every supplier read goes through `withMeasures`, so a list, a
// profile, a marketplace card and an RFx invitee row all quote the same
// calculated figure — and a supplier with nothing measured carries neither
// field, which is what every surface renders as "No history".
//
// Material G1 (MR-10 BR-01 to BR-03) — the qualification level is projected
// beside them, from the vendor's documents, on every supplier read.
/**
 * @param {Supplier} s
 * @returns {Supplier}
 */
const project = (s) => ({ ...withMeasures(s), qualification: qualificationFor(s.id).level });

/** @implements {ISupplierService} */
export class MockSupplierService {
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<Supplier>>}
   */
  async list(scope) {
    if (scope.personaType === 'supplier') return { items: [] };
    return { items: mockSuppliers.map(project) };
  }

  /**
   * @param {QueryScope} scope
   * @param {string} id
   * @returns {Promise<Supplier | null>}
   */
  async getById(scope, id) {
    // Scope violation: a supplier persona may only read its own record.
    // This is the live SCOPE_DENIED path (was a silent null before DR-4).
    if (scope.personaType === 'supplier' && scope.supplierId !== id)
      throw new DataError(
        'SCOPE_DENIED',
        `Supplier ${scope.supplierId ?? '(none)'} may not read supplier ${id}`
      );
    const found = mockSuppliers.find((s) => s.id === id);
    return found ? project(found) : null;
  }

  /**
   * @param {QueryScope} scope
   * @returns {Promise<Supplier | null>}
   */
  async getCurrent(scope) {
    if (scope.personaType !== 'supplier' || !scope.supplierId) return null;
    const mine = mockSuppliers.find((s) => s.id === scope.supplierId);
    return mine ? project(mine) : null;
  }

  // Material A1 — narrowed HERE, not in the page (MAT-R4): a supplier reads
  // only its own mode and history.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierStockUpdateMode>>}
   */
  async getStockUpdateModes(scope) {
    const all = allStockUpdateModes();
    if (scope.personaType === 'supplier')
      return { items: all.filter((r) => r.supplierId === scope.supplierId) };
    return { items: all };
  }

  // Material B3 — narrowed in the read model (MAT-R4): a supplier reads only
  // its own compliance and week strip.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<UpdateCompliance>>}
   */
  async getUpdateCompliance(scope) {
    return { items: updateComplianceFor(scope) };
  }

  // Material G1 — narrowed HERE, not in the page (MAT-R4): a supplier reads
  // only its own level, missing documents and history.
  /**
   * @param {QueryScope} scope
   * @returns {Promise<Page<VendorQualification>>}
   */
  async getVendorQualifications(scope) {
    const all = allQualifications();
    if (scope.personaType === 'supplier')
      return { items: all.filter((r) => r.supplierId === scope.supplierId) };
    return { items: all };
  }
}
