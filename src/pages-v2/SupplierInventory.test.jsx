import { afterEach, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
/** @import { IDataService } from '@services/data/types' */
import { BUYER, renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import SupplierInventory from './SupplierInventory';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { stockAccessStore } from '@services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '@services/sdc';

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

// sup-002 supplies materials but was never granted PTI stock.
/** @type {CurrentIdentity} */
const SUPPLIER_NO_STOCK_ACCESS = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'sup-002' };

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

// ─────────────────────────────────────────────────────────────────────────────
// INV-D11 (S-10) — when PTI removes all of a supplier's access to PTI stock, the
// Stock page says so in one line, with the date and no reason. A re-grant
// clears it. sup-007 (SUPPLIER) holds the seeded grant; sup-999 never had one.
// ─────────────────────────────────────────────────────────────────────────────
describe('SupplierInventory — PTI stopped sharing its stock (INV-D11)', () => {
  /**
   * @param {string} transitionId
   * @param {Record<string, unknown>} [payload]
   */
  const act = (transitionId, payload = {}) =>
    mockDataService.commands.dispatch(BUYER, {
      transitionId,
      entity: 'stockAccess',
      entityId: 'sup-007',
      payload
    });
  const removedLine = 'PTI stopped sharing its stock with you on 31 Aug 2026.';

  beforeEach(() => {
    stockAccessStore.reset();
    sdcClock.set('2026-08-31T03:00:00.000Z');
  });
  afterEach(() => {
    stockAccessStore.reset();
    sdcClock.reset();
  });

  it('shown after PTI removes access, with the date', async () => {
    expect((await act('t_stockaccess_remove')).status).toBe('done');
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect(await screen.findByTestId('sup-pti-access-removed')).toHaveTextContent(removedLine);
    expect(screen.queryByTestId('sup-pti-access-note')).toBeNull();
  });

  it('hidden while access exists', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect(await screen.findByTestId('sup-pti-access-note')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-pti-access-removed')).toBeNull();
  });

  it('hidden for a supplier that never had access', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER_NO_STOCK_ACCESS });
    await screen.findByTestId('sup-stock-row-RM-STEAR-7300');
    expect(screen.queryByTestId('sup-pti-access-removed')).toBeNull();
  });

  it('hidden again after PTI grants access again', async () => {
    expect((await act('t_stockaccess_remove')).status).toBe('done');
    expect((await act('t_stockaccess_grant', { materials: [] })).status).toBe('done');
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect(await screen.findByTestId('sup-pti-access-note')).toBeInTheDocument();
    expect(screen.queryByTestId('sup-pti-access-removed')).toBeNull();
  });
});
