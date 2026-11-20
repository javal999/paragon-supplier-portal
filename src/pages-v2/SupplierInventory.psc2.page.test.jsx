// ─────────────────────────────────────────────────────────────────────────────
// PSC-2 (BL-337) — the supplier stock table: In Transit and In Production as
// separate figures with their child rows, the flattened download, the PIC gone
// from this table only, direct feedstock entry, the three filters and the
// shared template columns. Every figure asserted is read from the same source
// the page reads, or seeded by the test's own proxy.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { IDataService } from '@services/data/types' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import { feedstockConfirmationStore } from '@services/data/mock/stores/feedstockConfirmationStore';
import { sdcClock } from '@services/sdc';
import { stockTemplateCsv } from '@services/transitions/inventoryRules';
import { groupTasksByLane } from './home/TaskList';
import { entryFigures, stockEntriesCsv } from './inventory/SupplierStockDrawer';
import SupplierInventory from './SupplierInventory';
import { mockInventory } from '@data/mockInventory';
import { formatDate, formatNumber } from '@lib/format';

const CODE = 'PK-PETB-8802';
// BL-358 — the seeded sup-007 record with two production runs (no override).
const REAL = 'PK-PETB-8801';
const ROUTE = '/supplier/inventory';
const SUPPLIER_ID = SUPPLIER.supplierId ?? 'sup-007';

/**
 * A service whose inventory read carries a material with two In Production runs
 * and two In Transit shipments — the child rows BR-01 to BR-03 describe.
 * @returns {IDataService}
 */
function twoOfEachService() {
  return {
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
                p.materialCode === CODE
                  ? {
                      ...p,
                      incoming: [
                        {
                          source: /** @type {const} */ ('production'),
                          date: '2026-09-10',
                          quantity: 400,
                          reference: null
                        },
                        {
                          source: /** @type {const} */ ('production'),
                          date: '2026-09-20',
                          quantity: 600,
                          reference: null
                        },
                        {
                          source: /** @type {const} */ ('asn'),
                          date: '2026-09-05',
                          quantity: 250,
                          reference: 'ASN-1'
                        },
                        {
                          source: /** @type {const} */ ('dispatch'),
                          date: '2026-09-15',
                          quantity: 350,
                          reference: 'CO-1'
                        }
                      ]
                    }
                  : p
              )
            };
          };
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    })
  };
}

beforeEach(() => {
  sdcClock.reset();
  inventoryDeclarationStore.reset();
  feedstockConfirmationStore.reset();
});
afterEach(() => {
  inventoryDeclarationStore.reset();
  feedstockConfirmationStore.reset();
});

describe('PSC-2 AC-01 · the PIC leaves the supplier Stock table only', () => {
  it('renders no PIC column or cell, and keeps the MRP-controller filter', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId(`sup-stock-row-${CODE}`);
    expect(screen.queryByTestId(`sup-stock-pic-${CODE}`)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /^PIC/ })).toBeNull();
    // BR-08 — the MRP controller is still a filter on this table.
    expect(screen.getByTestId('pic-filter')).toBeInTheDocument();
  });
});

describe('PSC-2 AC-02 / AC-03 · totals in the columns, child rows in the drawer', () => {
  it('shows the In Production total with the latest ETA and 2 runs in the drawer', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: ROUTE,
      service: twoOfEachService()
    });
    const cell = await screen.findByTestId(`sup-stock-production-${CODE}`);
    expect(cell.textContent).toContain(formatNumber(1000));
    // BR-03 — the LATEST ETA.
    expect(cell.textContent).toContain('20 Sept 2026');
    fireEvent.click(cell);
    const drawer = await screen.findByTestId('sup-stock-drawer');
    expect(within(drawer).getByTestId('sup-stock-run-0')).toBeInTheDocument();
    expect(within(drawer).getByTestId('sup-stock-run-1')).toBeInTheDocument();
    expect(within(drawer).queryByTestId('sup-stock-run-2')).toBeNull();
  });

  it('shows the In Transit total with the nearest ETA and 2 shipments in the drawer', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: ROUTE,
      service: twoOfEachService()
    });
    const cell = await screen.findByTestId(`sup-stock-transit-${CODE}`);
    expect(cell.textContent).toContain(formatNumber(600));
    // BR-02 — the NEAREST ETA.
    expect(cell.textContent).toContain('5 Sept 2026');
    fireEvent.click(cell);
    const drawer = await screen.findByTestId('sup-stock-drawer');
    expect(within(drawer).getByTestId('sup-stock-shipment-0')).toBeInTheDocument();
    expect(within(drawer).getByTestId('sup-stock-shipment-1')).toBeInTheDocument();
    expect(within(drawer).queryByTestId('sup-stock-shipment-2')).toBeNull();
  });

  it('BL-358 — the REAL mock read carries two runs: the drawer shows both rows', async () => {
    // The follow-up this batch closes: no test-only override. PK-PETB-8801 is
    // seeded with two declared runs (20,000 + 40,000, latest unchanged).
    const seed = mockInventory.find((r) => r.materialCode === REAL);
    const runs = seed?.inProductionRuns ?? [];
    expect(runs).toHaveLength(2);
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: ROUTE });
    const cell = await screen.findByTestId(`sup-stock-production-${REAL}`);
    // The column total and the LATEST ETA follow the runs.
    expect(cell.textContent).toContain(formatNumber(60000));
    expect(cell.textContent).toContain(formatDate(/** @type {string} */ (runs[1].completionDate)));
    fireEvent.click(cell);
    const drawer = await screen.findByTestId('sup-stock-drawer');
    const first = within(drawer).getByTestId('sup-stock-run-0');
    expect(first.textContent).toContain(formatDate(/** @type {string} */ (runs[0].completionDate)));
    expect(first.textContent).toContain(formatNumber(/** @type {number} */ (runs[0].quantity)));
    const second = within(drawer).getByTestId('sup-stock-run-1');
    expect(second.textContent).toContain(
      formatDate(/** @type {string} */ (runs[1].completionDate))
    );
    expect(second.textContent).toContain(formatNumber(/** @type {number} */ (runs[1].quantity)));
    expect(within(drawer).queryByTestId('sup-stock-run-2')).toBeNull();
  });

  it('BL-358 — the entry form names the runs one figure would replace', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: ROUTE });
    fireEvent.click(await screen.findByTestId('stock-entry-open'));
    const panel = within(
      /** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]'))
    );
    fireEvent.change(panel.getByLabelText('Material'), { target: { value: REAL } });
    const note = await panel.findByTestId('stock-entry-production-runs');
    expect(note.textContent).toContain('2 production runs');
    expect(within(note).getByTestId('stock-entry-production-run-0')).toBeInTheDocument();
    expect(within(note).getByTestId('stock-entry-production-run-1')).toBeInTheDocument();
  });

  it('BR-11 — the download flattens every In Transit and In Production entry', () => {
    const position =
      /** @type {Pick<import('@services/data/types').InventoryPosition, 'materialCode' | 'uom' | 'incoming'>} */ ({
        materialCode: CODE,
        uom: 'PCS',
        incoming: [
          { source: 'production', date: '2026-09-10', quantity: 400, reference: null },
          { source: 'production', date: '2026-09-20', quantity: 600, reference: null },
          { source: 'asn', date: '2026-09-05', quantity: 250, reference: 'ASN-1' },
          { source: 'dispatch', date: '2026-09-15', quantity: 350, reference: 'CO-1' }
        ]
      });
    const csv = stockEntriesCsv([position], 'en');
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Entry');
    expect(lines).toHaveLength(5);
    expect(lines.filter((l) => l.includes('In Production'))).toHaveLength(2);
    expect(lines.filter((l) => l.includes('In Transit'))).toHaveLength(2);
    for (const ref of ['ASN-1', 'CO-1']) expect(csv).toContain(ref);
    // The two directions the columns show, on the same entries.
    expect(
      entryFigures(
        position.incoming.filter((i) => i.source === 'production'),
        'latest'
      ).total
    ).toBe(1000);
    expect(
      entryFigures(
        position.incoming.filter((i) => i.source !== 'production'),
        'nearest'
      ).nextDate
    ).toBe('2026-09-05');
  });
});

describe('PSC-2 AC-04 · feedstock is typed in the table and never added to SOH', () => {
  it('confirms the typed figure as feedstock, leaving the stock record alone', async () => {
    const declarations = inventoryDeclarationStore.all().length;
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: ROUTE });
    const input = await screen.findByTestId(`sup-stock-feedstock-input-${CODE}`);
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByTestId(`sup-stock-feedstock-confirm-${CODE}`));
    await waitFor(() => expect(feedstockConfirmationStore.all()).toHaveLength(1));
    expect(feedstockConfirmationStore.all()[0]).toMatchObject({
      supplierId: SUPPLIER_ID,
      materialCode: CODE,
      feedstockQty: 12
    });
    // DRC-8 / MoM 2B — the feedstock entry is never added to SOH.
    expect(inventoryDeclarationStore.all()).toHaveLength(declarations);
    expect(inventoryDeclarationStore.latestFor(SUPPLIER_ID, CODE)?.totalQty).toBe(22000);
  });
});

describe('PSC-2 AC-05 · a raw material supplier has no feedstock entry', () => {
  it('shows no Feedstock to Confirm column, and the template drops K and L', async () => {
    /** @type {import('@context/CurrentIdentityContext').CurrentIdentity} */
    const RAW = { ...SUPPLIER, supplierId: 'sup-002', supplierName: 'sup-002' };
    renderWithProviders(<SupplierInventory />, { identity: RAW, route: ROUTE });
    await screen.findByTestId('sup-stock-row-RM-STEAR-7300');
    expect(screen.queryByText('Feedstock to Confirm')).toBeNull();
    const withFeedstock = stockTemplateCsv([{ materialCode: 'RM-X', uom: 'KG' }], 'en');
    const without = stockTemplateCsv([{ materialCode: 'RM-X', uom: 'KG' }], 'en', {
      feedstock: false
    });
    expect(withFeedstock).toContain('Feedstock quantity');
    expect(without).not.toContain('Feedstock');
    const columns = without.trim().split('\n')[0].split(',');
    expect(columns).toHaveLength(10);
  });
});

describe('PSC-2 AC-06 · the filters narrow the table and live in the address', () => {
  it('the packaging filter from the address narrows the rows', async () => {
    const rows = inventoryDeclarationStore.all();
    expect(rows.length).toBeGreaterThan(0);
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: `${ROUTE}?pkg=NO-SUCH-GROUP`
    });
    await screen.findByTestId('sup-filter-packaging');
    await waitFor(() => expect(screen.queryByTestId(`sup-stock-row-${CODE}`)).toBeNull());
    expect(screen.getByTestId('sup-filter-packaging')).toHaveValue('NO-SUCH-GROUP');
  });

  it('the Supplier filter from the address narrows the rows', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: `${ROUTE}?sup=Somebody%20Else`
    });
    await screen.findByTestId('sup-filter-supplier');
    await waitFor(() => expect(screen.queryByTestId(`sup-stock-row-${CODE}`)).toBeNull());
  });
});

describe('PSC-2 AC-07 · To do order: due date, then risk class, then type', () => {
  it('orders same-day rows by risk class and then by type', () => {
    const groups = groupTasksByLane(
      [
        {
          id: 'b',
          label: 'B',
          count: 1,
          severity: 'warning',
          to: '/',
          lane: 'stock',
          deadline: '2026-09-01'
        },
        {
          id: 'a',
          label: 'A',
          count: 9,
          severity: 'critical',
          to: '/',
          lane: 'stock',
          deadline: '2026-09-01'
        },
        {
          id: 'c',
          label: 'C',
          count: 1,
          severity: 'warning',
          to: '/',
          lane: 'orders',
          deadline: '2026-09-01'
        },
        {
          id: 'd',
          label: 'D',
          count: 1,
          severity: 'critical',
          to: '/',
          lane: 'orders',
          deadline: '2026-08-20'
        }
      ],
      [
        { id: 'orders', label: 'Orders' },
        { id: 'stock', label: 'Stock' }
      ]
    );
    // Due date first: the older deadline leads its own lane.
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['d', 'c']);
    // Same day: critical before warning, then type (lane) as the tiebreaker.
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('PSC-2 AC-08 · In Production and In Transit labels, no Incoming label', () => {
  it('shows both headers on the supplier table and no combined Incoming header', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId(`sup-stock-row-${CODE}`);
    expect(screen.getByRole('columnheader', { name: /^In Transit/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^In Production/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^Incoming/ })).toBeNull();
  });
});
