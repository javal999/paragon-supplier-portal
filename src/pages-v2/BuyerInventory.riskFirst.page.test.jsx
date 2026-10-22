// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX evaluation (2026-10), lane 1A, on the PTI Inventory page:
//   P-01 — risk first: six columns, four summary tiles that filter, "All types".
//   P-02 — a row opens the material drawer: why the class, figures, the open
//          alerts on the pair, and the actions that work for the pair.
//   P-08 — INV-D1: the class is named "Supplier cover"; PTI cover sits beside it.
//   INV-D6 — the drawer shows the stock update mode and links to the admin page.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerInventory from './BuyerInventory';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

/** Shows where a drawer action navigated to. */
const Landed = () => {
  const loc = useLocation();
  return <div data-testid="landed">{`${loc.pathname}${loc.search}`}</div>;
};

const pages = (
  <Routes>
    <Route path="/buyer/inventory" element={<BuyerInventory />} />
    <Route path="*" element={<Landed />} />
  </Routes>
);

/** @param {string} route */
const render = (route = '/buyer/inventory') =>
  renderWithProviders(pages, { identity: BUYER, route });

describe('P-01 — risk first, fewer columns', () => {
  it('the table has six columns, risk second; PIC, this cycle, supplier ROP and days of supply are gone', async () => {
    render();
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual([
      'Material · supplier',
      'Risk · supplier cover',
      'Supplier stock',
      'PTI stock / ROP',
      'Incoming',
      'Updated'
    ]);
    expect(screen.queryByRole('columnheader', { name: 'Days of supply' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /PIC/ })).toBeNull();
    expect(screen.queryByTestId('pti-inventory-banner')).toBeNull();
  });

  it('PTI stock below its ROP reads red; one above it does not', async () => {
    render();
    // RM-STEAR-7300: PTI 900 against ROP 2,500.
    const below = await screen.findByTestId('pti-stock-pti-sup-002-RM-STEAR-7300');
    expect(below).toHaveAttribute('data-below', 'true');
    expect(below).toHaveTextContent('900 KG / 2,500 KG');
    expect(within(below).getByText('900 KG')).toHaveClass('text-danger');
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/ }));
    // PK-PETB-8802: PTI 55,000 against ROP 50,000.
    const above = await screen.findByTestId('pti-stock-pti-sup-007-PK-PETB-8802');
    expect(above).not.toHaveAttribute('data-below');
  });

  it('a tile filters the table over all types; clicking it again clears the filter', async () => {
    render();
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    const tile = screen.getByTestId('inv-tile-belowRop');
    const count = Number(screen.getByTestId('inv-tile-belowRop-count').textContent);
    expect(count).toBeGreaterThan(0);
    fireEvent.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: /All types/ })).toHaveAttribute('aria-selected', 'true');
    const rows = screen.getAllByTestId(/^pti-stock-row-/);
    expect(rows).toHaveLength(count);
    // Both types are in the filtered list, and every row is below its ROP.
    expect(screen.getByTestId('pti-stock-row-sup-002-RM-STEAR-7300')).toBeInTheDocument();
    expect(screen.getByTestId('pti-stock-row-sup-007-PK-PETB-8801')).toBeInTheDocument();
    expect(screen.queryByTestId('pti-stock-row-sup-007-PK-PETB-8802')).toBeNull();
    for (const row of rows)
      expect(within(row).getByTestId(/^pti-stock-pti-/)).toHaveAttribute('data-below', 'true');
    fireEvent.click(tile);
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId(/^pti-stock-row-/).length).toBeGreaterThan(count);
  });

  it('the four tiles are named as the proposal names them', async () => {
    render();
    await screen.findByTestId('inv-tiles');
    expect(screen.getByTestId('inv-tile-high')).toHaveTextContent(/^High risk/);
    expect(screen.getByTestId('inv-tile-belowRop')).toHaveTextContent(/^PTI stock below PTI ROP/);
    expect(screen.getByTestId('inv-tile-stale')).toHaveTextContent(/^Supplier figures out of date/);
    expect(screen.getByTestId('inv-tile-noLeadTime')).toHaveTextContent(/^No lead time on record/);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render();
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    expect(screen.getByRole('columnheader', { name: 'Risiko · cakupan pemasok' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Semua jenis/ })).toBeTruthy();
  });
});

describe('P-08 — supplier cover names whose stock decides the class (INV-D1)', () => {
  it('the risk cell keeps the CR-24 class on supplier cover and shows PTI cover beside it', async () => {
    render();
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    expect(screen.getByTestId('risk-sup-002-RM-STEAR-7300')).toHaveTextContent('10 days · High');
    expect(screen.getByTestId('pti-cover-sup-002-RM-STEAR-7300')).toHaveTextContent(
      /^PTI cover \d+ days$/
    );
  });

  it('the drawer names supplier cover and PTI cover as two figures', async () => {
    render();
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300'));
    const cover = screen.getByTestId('material-drawer-cover');
    expect(cover).toHaveTextContent('Supplier cover 10 days');
    expect(within(cover).getByTestId('material-drawer-pti-cover')).toHaveTextContent(
      /^PTI cover \d+ days$/
    );
  });

  it('reads "Cakupan stok pemasok" in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render();
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300'));
    expect(screen.getByTestId('material-drawer-cover')).toHaveTextContent(
      'Cakupan stok pemasok 10 hari'
    );
  });
});

describe('P-02 — a row opens the material drawer', () => {
  it('says why the class is what it is, with the figures and the open alerts on the pair', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8802'));
    const drawer = screen.getByTestId('material-drawer');
    expect(drawer).toHaveAttribute('data-pair', 'sup-007-PK-PETB-8802');
    expect(screen.getByTestId('material-drawer-why')).toHaveTextContent(
      /^High: supplier stock covers \d+ days of demand; the supplier lead time is 14 days\./
    );
    expect(screen.getByTestId('material-drawer-supplier-soh')).toHaveTextContent('PCS');
    expect(screen.getByTestId('material-drawer-free')).toHaveTextContent(
      'Simulated by the stock simulation'
    );
    const alerts = screen.getByTestId('material-drawer-alerts');
    await within(alerts).findByText(/^Supplier stock and incoming/);
    expect(alerts).toHaveTextContent(
      'Supplier stock and incoming do not cover the next 30 days of demand'
    );
    expect(alerts).toHaveTextContent(/Open alerts on this material · [1-9]/);
  });

  it('a pair without figures asks for stock', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-CAPF-8820'));
    expect(screen.getByTestId('material-drawer-why')).toHaveTextContent(
      /^No stock figures from the supplier yet/
    );
    expect(screen.getByTestId('material-drawer-record')).toHaveTextContent(
      'Record stock from a supplier message'
    );
  });

  it('"Open stock simulation" deep-links with ?q= and the supplier', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8802'));
    fireEvent.click(screen.getByTestId('material-drawer-simulation'));
    expect(await screen.findByTestId('landed')).toHaveTextContent(
      '/buyer/stock-simulation?q=PK-PETB-8802&supplier=sup-007'
    );
  });

  it('"Create call-off" shows only where an agreement line exists', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8801'));
    const callOff = await screen.findByTestId('material-drawer-calloff');
    expect(callOff).toHaveTextContent('Create call-off');
    expect(screen.queryByTestId('material-drawer-po')).toBeNull();
    fireEvent.click(callOff);
    expect(await screen.findByTestId('landed')).toHaveTextContent(
      '/buyer/call-offs?newFor=sup-007&material=PK-PETB-8801'
    );
  });

  it('without an agreement line it offers "Create PO request" and says why', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8802'));
    const po = await screen.findByTestId('material-drawer-po');
    expect(po).toHaveTextContent('Create PO request');
    expect(screen.queryByTestId('material-drawer-calloff')).toBeNull();
    expect(screen.getByTestId('material-drawer-no-line')).toHaveTextContent(
      /^No agreement line for .+ · PK-PETB-8802\./
    );
    fireEvent.click(po);
    expect(await screen.findByTestId('landed')).toHaveTextContent(
      '/buyer/purchase-requisition?new=1&supplier=sup-007&material=PK-PETB-8802'
    );
  });

  it('offers no "Ask supplier" action yet (wave 2)', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8802'));
    await screen.findByTestId('material-drawer-po');
    const actions = screen.getByTestId('material-drawer-actions');
    expect(within(actions).queryByText(/ask/i)).toBeNull();
    expect(
      within(actions)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual([
      'Open stock simulation',
      'Create PO request',
      'Record stock from a supplier message'
    ]);
  });

  it('"Record stock" opens the stock entry on this supplier and material', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-CAPF-8820'));
    fireEvent.click(screen.getByTestId('material-drawer-record'));
    expect(screen.queryByTestId('material-drawer')).toBeNull();
    expect(screen.getByLabelText('Supplier')).toHaveValue('sup-007');
    expect(screen.getByLabelText('Material')).toHaveValue('PK-CAPF-8820');
  });

  it('the incoming figure still opens its own per-date detail, not the drawer', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('incoming-sup-007-PK-PETB-8801'));
    expect(screen.getByTestId('incoming-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('material-drawer')).toBeNull();
  });
});

describe('INV-D6 — the drawer shows the update mode; the admin page changes it', () => {
  it('a manual supplier reads "Entered by supplier", linked to Suppliers', async () => {
    render('/buyer/inventory?type=VERP');
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8802'));
    const mode = screen.getByTestId('material-drawer-mode');
    expect(mode).toHaveTextContent('Entered by supplier');
    expect(within(mode).getByRole('link', { name: /administrator/ })).toHaveAttribute(
      'href',
      '/buyer/admin/suppliers'
    );
    expect(within(mode).queryByRole('combobox')).toBeNull();
    expect(screen.queryByTestId('material-drawer-sync')).toBeNull();
  });

  it('an API supplier reads "From supplier system" and offers Sync', async () => {
    render();
    fireEvent.click(await screen.findByTestId('pti-stock-row-sup-001-RM-LAURIC-7200'));
    expect(screen.getByTestId('material-drawer-mode')).toHaveTextContent('From supplier system');
    expect(screen.getByTestId('material-drawer-sync')).toHaveTextContent('Sync');
  });
});
