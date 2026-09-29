import { mockSuppliers } from '../../../data/mockSuppliers';
import type { ISupplierService, Page, QueryScope, Supplier, SupplierStockUpdateMode } from '../types';
import { DataError } from '../types';
import { allWithMeasures, withMeasures } from './supplierMeasureReadModel';
import { allStockUpdateModes } from './supplierMaster';

// ⚠️ REQ-E10-01 — OTIF AND THE GRADE ARE PROJECTED HERE, NOT READ FROM THE
// FIXTURE. Every supplier read goes through `withMeasures`, so a list, a
// profile, a marketplace card and an RFx invitee row all quote the same
// calculated figure — and a supplier with nothing measured carries neither
// field, which is what every surface renders as "No history".

export class MockSupplierService implements ISupplierService {
  async list(scope: QueryScope): Promise<Page<Supplier>> {
    if (scope.personaType === 'supplier') return { items: [] };
    return { items: allWithMeasures(mockSuppliers) };
  }

  async getById(scope: QueryScope, id: string): Promise<Supplier | null> {
    // Scope violation: a supplier persona may only read its own record.
    // This is the live SCOPE_DENIED path (was a silent null before DR-4).
    if (scope.personaType === 'supplier' && scope.supplierId !== id)
      throw new DataError(
        'SCOPE_DENIED',
        `Supplier ${scope.supplierId ?? '(none)'} may not read supplier ${id}`,
      );
    const found = mockSuppliers.find((s) => s.id === id);
    return found ? withMeasures(found) : null;
  }

  async getCurrent(scope: QueryScope): Promise<Supplier | null> {
    if (scope.personaType !== 'supplier' || !scope.supplierId) return null;
    const mine = mockSuppliers.find((s) => s.id === scope.supplierId);
    return mine ? withMeasures(mine) : null;
  }

  // Material A1 — narrowed HERE, not in the page (MAT-R4): a supplier reads
  // only its own mode and history.
  async getStockUpdateModes(scope: QueryScope): Promise<Page<SupplierStockUpdateMode>> {
    const all = allStockUpdateModes();
    if (scope.personaType === 'supplier') return { items: all.filter((r) => r.supplierId === scope.supplierId) };
    return { items: all };
  }
}
