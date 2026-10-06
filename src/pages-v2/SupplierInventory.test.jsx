import { fireEvent, screen } from '@testing-library/react';
/** @import { IDataService } from '@services/data/types' */
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import SupplierInventory from './SupplierInventory';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no inventory rows (sup-007 etc. have fixtures).
/** @type {CurrentIdentity} */
const SUPPLIER_NO_STOCK = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

describe('SupplierInventory — four honest states', () => {
  it('data: renders the scoped inventory for the seeded supplier', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    // REQ-E08-01 — the supplier Stock page on the one inventory model.
    expect(await screen.findByRole('heading', { name: 'Stock' })).toBeInTheDocument();
    expect(await screen.findByTestId('sup-stock-row-PK-PETB-8802')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      service: alwaysPending
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-stock-row-PK-PETB-8802')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      service: alwaysFails
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no inventory', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER_NO_STOCK });
    expect(await screen.findByText('No materials are assigned to you yet.')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BL-61 (REQ-E08-01 BR-07) — one list on the supplier view. sup-007 supplies
// packaging only, so it sees every row and no type tabs. A supplier that
// supplies both types keeps the split: no fixture supplier does, so the second
// case re-reads sup-007's own rows with one relabelled as raw material.
// ─────────────────────────────────────────────────────────────────────────────
describe('SupplierInventory — material-type tabs only when both types are supplied (BL-61)', () => {
  it('a single-type supplier sees one list and no tabs', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('sup-stock-row-PK-PETB-8801');
    expect(screen.queryByRole('tab', { name: /Raw material/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Packaging/i })).toBeNull();
    for (const code of ['PK-PETB-8801', 'PK-PETB-8802', 'PK-PETB-8810', 'PK-CAPF-8820']) {
      expect(screen.getByTestId(`sup-stock-row-${code}`)).toBeInTheDocument();
    }
  });

  it('a supplier that supplies both types keeps the tabs, and they filter', async () => {
    /** @type {IDataService} */
    const mixed = {
      ...mockDataService,
      procurement: new Proxy(mockDataService.procurement, {
        get(target, prop, receiver) {
          if (prop === 'getInventory')
            return /** @param {Parameters<IDataService['procurement']['getInventory']>} args */ async (
              ...args
            ) => {
              const page = await target.getInventory(...args);
              return {
                ...page,
                items: page.items.map((p) =>
                  p.materialCode === 'PK-CAPF-8820'
                    ? { ...p, materialType: /** @type {const} */ ('ROH') }
                    : p
                )
              };
            };
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      })
    };
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, service: mixed });
    const rawTab = await screen.findByRole('tab', { name: /Raw material/i });
    expect(screen.getByRole('tab', { name: /Packaging/i })).toBeInTheDocument();
    // Packaging is the default view; the relabelled row is not in it.
    expect(screen.getByTestId('sup-stock-row-PK-PETB-8801')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-stock-row-PK-CAPF-8820')).toBeNull();
    fireEvent.click(rawTab);
    expect(await screen.findByTestId('sup-stock-row-PK-CAPF-8820')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-stock-row-PK-PETB-8801')).toBeNull();
  });
});
