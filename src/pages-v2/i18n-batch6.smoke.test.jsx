import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerSuppliers from './BuyerSuppliers';
import BuyerScorecard from './BuyerScorecard';
import BuyerInventory from './BuyerInventory';
import SupplierInventory from './SupplierInventory';
import SupplierPerformance from './SupplierPerformance';

// Batch 6 acceptance (tail sweep): with the UI in Indonesian, each tail page's
// extracted header renders in ID and the prior hardcoded English header is gone.
// The two useParams pages (BuyerSupplierProfile /buyer/suppliers/:id and
// SupplierStorefront /marketplace/supplier/:id) are covered by fragment parity +
// tsc + browser QA rather than here, matching the Batch 5 precedent — a bare
// render without a matched route param renders their not-found branch.
// Deferred prose, mock/sample data, and centrally-localized chips (status /
// priority / enum / mode / category / channel) are out of scope (asserted only on
// translated page chrome).
/** @param {'en' | 'id'} lng */
const setLang = (lng) =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 6 — tail-sweep bilingual render (no header EN leak)', () => {
  it('BuyerSuppliers: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerSuppliers />, { route: '/buyer/suppliers' });
    expect(await screen.findByRole('heading', { name: 'Pemasok' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Suppliers' })).not.toBeInTheDocument();
  });

  it('BuyerScorecard: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerScorecard />, { route: '/buyer/scorecard' });
    // FUX2-R4 (B6) — the page is named by its menu label: Supplier performance / Kinerja pemasok.
    expect(await screen.findByRole('heading', { name: 'Kinerja pemasok' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Supplier performance' })).not.toBeInTheDocument();
  });

  it('BuyerInventory: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerInventory />, { route: '/buyer/inventory' });
    // REQ-E08-01 renamed the page to the menu item (NV-05): Inventory / Stok.
    expect(await screen.findByRole('heading', { name: 'Stok' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Inventory' })).not.toBeInTheDocument();
  });

  it('SupplierInventory: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: '/supplier/inventory'
    });
    // REQ-E08-01 renamed the page to the menu item (NV-05): Stock / Stok.
    expect(await screen.findByRole('heading', { name: 'Stok' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Stock' })).not.toBeInTheDocument();
  });

  it('SupplierPerformance: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierPerformance />, {
      identity: SUPPLIER,
      route: '/supplier/performance'
    });
    expect(await screen.findByRole('heading', { name: 'Kinerja saya' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My performance' })).not.toBeInTheDocument();
  });
});
