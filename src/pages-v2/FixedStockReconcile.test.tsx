import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from './FixedStockReconcile';
import { fixedStockReconcileEn, fixedStockReconcileId } from '../lib/i18n/fixedStockReconcile';
import i18n from '../lib/i18n';
import { formatNumber } from '../lib/format';

const pcs = (n: number) => `${formatNumber(n)} PCS`;

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E06-04 (BL-134) — the planner's Fixed stock reconcile page and the
// supplier's own view, on the sample data (hub clock 2026-08-31).
// ─────────────────────────────────────────────────────────────────────────────

const K8801 = 'packaging|2026-08-31|sup-007|PK-PETB-8801';
const K8802 = 'packaging|2026-08-31|sup-007|PK-PETB-8802';

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('Fixed stock reconcile — planner', () => {
  it('renders in the shell, marked sample data, with the outcome counts', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, { identity: BUYER, route: '/buyer/fs-reconcile' });
    expect(await screen.findByRole('heading', { name: 'Fixed stock reconcile' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByTestId('fsr-count-underCalled')).toHaveTextContent('1');
    expect(screen.getByTestId('fsr-count-balanced')).toHaveTextContent('2');
    expect(screen.getByTestId('fsr-count-supplierShort')).toHaveTextContent('0');
  });

  it('shows committed, called off, held, no max stock, and the liability flagged not priced', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, { identity: BUYER, route: '/buyer/fs-reconcile' });
    const row = await screen.findByTestId(`fsr-row-${K8801}`);
    expect(within(row).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
    expect(screen.getByTestId(`fsr-committed-${K8801}`)).toHaveTextContent(pcs(99_600));
    expect(screen.getByTestId(`fsr-called-${K8801}`)).toHaveTextContent(pcs(88_000));
    expect(screen.getByTestId(`fsr-uncalled-${K8801}`)).toHaveTextContent(pcs(11_600));
    expect(screen.getByTestId(`fsr-held-${K8801}`)).toHaveTextContent(pcs(85_000));
    expect(screen.getByTestId(`fsr-max-${K8801}`)).toHaveTextContent('No max stock agreed');
    expect(screen.getByTestId(`fsr-outcome-${K8801}`)).toHaveTextContent('PTI under-called');
    expect(screen.getByTestId(`fsr-liability-${K8801}`)).toHaveTextContent(`Liability — not priced: ${pcs(11_600)}`);
    expect(screen.getByTestId(`fsr-state-${K8801}`)).toHaveTextContent('Provisional');
  });

  it('a summary tile filters the list to its outcome, and again clears it', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, { identity: BUYER, route: '/buyer/fs-reconcile' });
    await screen.findByTestId(`fsr-row-${K8801}`);
    fireEvent.click(screen.getByTestId('fsr-count-underCalled'));
    expect(screen.queryByTestId(`fsr-row-${K8802}`)).toBeNull();
    expect(screen.getByTestId(`fsr-row-${K8801}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fsr-count-supplierShort'));
    expect(screen.getByTestId('fsr-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fsr-count-supplierShort'));
    expect(screen.getByTestId(`fsr-row-${K8802}`)).toBeInTheDocument();
  });
});

describe('Fixed stock reconcile — supplier', () => {
  it('shows its own rows without a supplier column', async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, { identity: SUPPLIER, route: '/supplier/fs-reconcile' });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(screen.getByTestId(`fsr-outcome-${K8802}`)).toHaveTextContent('Balanced');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierFixedStockReconcile />, { identity: SUPPLIER, route: '/supplier/fs-reconcile' });
    expect(await screen.findByRole('heading', { name: 'Rekonsiliasi stok tetap' })).toBeInTheDocument();
    expect(await screen.findByTestId(`fsr-outcome-${K8801}`)).toHaveTextContent('PTI kurang call-off');
  });
});

describe('strings', () => {
  it('every string exists in EN and ID (plural forms per locale)', () => {
    const base = (o: Record<string, string>) => [...new Set(Object.keys(o).map((k) => k.replace(/_(one|other)$/, '')))].sort();
    expect(base(fixedStockReconcileId)).toEqual(base(fixedStockReconcileEn));
  });
});
