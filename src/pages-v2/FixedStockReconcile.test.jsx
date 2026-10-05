import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from './FixedStockReconcile';
import { fixedStockReconcileEn, fixedStockReconcileId } from '@lib/i18n/fixedStockReconcile';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import { maxStockStore } from '@services/transitions/maxStock';

/** @param {number} n */
const pcs = (n) => `${formatNumber(n)} PCS`;

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E06-04 (BL-134) — the planner's Fixed stock reconcile page and the
// supplier's own view, on the sample data (hub clock 2026-08-31).
// ─────────────────────────────────────────────────────────────────────────────

const K8801 = 'packaging|2026-08-31|sup-007|PK-PETB-8801';
const K8802 = 'packaging|2026-08-31|sup-007|PK-PETB-8802';
const KAUG = 'packaging|2026-08-10|sup-007|PK-PETB-8801';

beforeEach(() => {
  maxStockStore.reset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('Fixed stock reconcile — planner', () => {
  it('renders in the shell, marked sample data, with the outcome counts', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    // FUX A4: the planner's title is the menu label, and the one banner marks the sample data.
    expect(
      await screen.findByRole('heading', { name: 'End-of-cycle stock check' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByTestId('sample-data-badge')).toBeNull();
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByTestId('fsr-count-underCalled')).toHaveTextContent('1');
    expect(screen.getByTestId('fsr-count-notCommitted')).toHaveTextContent('1');
    expect(screen.getByTestId('fsr-count-balanced')).toHaveTextContent('1');
    expect(screen.getByTestId('fsr-count-supplierShort')).toHaveTextContent('0');
  });

  it('shows committed, called off, held, no max stock, and the liability flagged not priced', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`fsr-row-${K8801}`);
    expect(within(row).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
    expect(screen.getByTestId(`fsr-committed-${K8801}`)).toHaveTextContent(pcs(99_600));
    expect(screen.getByTestId(`fsr-called-${K8801}`)).toHaveTextContent(pcs(45_100));
    expect(screen.getByTestId(`fsr-uncalled-${K8801}`)).toHaveTextContent(pcs(54_500));
    expect(screen.getByTestId(`fsr-awaiting-supplier-${K8801}`)).toHaveTextContent(
      '1 call-off awaiting the supplier — not counted'
    );
    expect(screen.getByTestId(`fsr-awaiting-pti-${K8801}`)).toHaveTextContent(
      '3 counter-offers awaiting PTI — not counted'
    );
    expect(screen.getByTestId(`fsr-held-${K8801}`)).toHaveTextContent(pcs(85_000));
    expect(screen.getByTestId(`fsr-max-${K8801}`)).toHaveTextContent('No max stock agreed');
    expect(screen.getByTestId(`fsr-outcome-${K8801}`)).toHaveTextContent('PTI under-called');
    expect(screen.getByTestId(`fsr-liability-${K8801}`)).toHaveTextContent(
      `Liability — not priced: ${pcs(54_500)}`
    );
    expect(screen.getByTestId(`fsr-state-${K8801}`)).toHaveTextContent('Provisional');
  });

  it('PTI calling off stock the supplier never committed reads Not committed, with no liability', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${KAUG}`);
    expect(screen.getByTestId(`fsr-outcome-${KAUG}`)).toHaveTextContent('Not committed');
    expect(screen.queryByTestId(`fsr-liability-${KAUG}`)).toBeNull();
    expect(screen.getByTestId(`fsr-state-${KAUG}`)).toHaveTextContent('Final');
  });

  it('not called off never shows a negative number: 0, with the called-beyond note', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8802}`);
    expect(screen.getByTestId(`fsr-uncalled-${K8802}`)).toHaveTextContent(pcs(0));
    expect(screen.getByTestId(`fsr-uncalled-${K8802}`).textContent).not.toContain('-');
    expect(screen.getByTestId(`fsr-beyond-${K8802}`)).toHaveTextContent(
      `Called off beyond commitment: ${pcs(20_500)}`
    );
  });

  it('a seat holding maxstock:set sets the max stock from the row, and the row reads it', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    fireEvent.click(await screen.findByTestId(`fsr-max-edit-${K8801}`));
    fireEvent.change(screen.getByTestId('fsr-max-input'), { target: { value: '0' } });
    expect(screen.getByTestId('fsr-max-invalid')).toBeInTheDocument();
    expect(screen.getByTestId('fsr-max-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('fsr-max-input'), { target: { value: '50000' } });
    fireEvent.click(screen.getByTestId('fsr-max-save'));
    await waitFor(() =>
      expect(screen.getByTestId(`fsr-max-${K8801}`)).toHaveTextContent(`Max: ${pcs(50_000)}`)
    );
    // The liability is capped at the max; 35,000 above it is the supplier's own.
    expect(screen.getByTestId(`fsr-liability-${K8801}`)).toHaveTextContent(
      `Liability — not priced: ${pcs(50_000)}`
    );
    expect(screen.getByTestId(`fsr-row-${K8801}`)).toHaveTextContent(
      `Above max stock (supplier’s own): ${pcs(35_000)}`
    );
    expect(maxStockStore.get('sup-007', 'PK-PETB-8801')?.quantity).toBe(50_000);
  });

  it('a planner-only seat sees whose act it is, never the control', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: { ...BUYER, businessRoles: ['planning'] },
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByTestId(`fsr-max-edit-${K8801}`)).toBeNull();
    expect(screen.getByTestId(`handoff-maxstock-${K8801}`)).toHaveAttribute(
      'data-handoff',
      'withheld'
    );
  });

  it('a summary tile filters the list to its outcome, and again clears it', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
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
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(screen.getByTestId(`fsr-outcome-${K8802}`)).toHaveTextContent('Balanced');
    // Read-only: no edit and no handoff notice on the supplier's own view.
    expect(screen.queryByTestId(`fsr-max-edit-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`handoff-maxstock-${K8801}`)).toBeNull();
    // FUX A4 touches the planner's view only: the supplier keeps its own title
    // and sample-data marker, and gets no planner purpose header or banner.
    expect(screen.getByRole('heading', { name: 'Fixed stock reconcile' })).toBeInTheDocument();
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('purpose-header')).toBeNull();
    expect(screen.queryByTestId('simulated-data-banner')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    expect(
      await screen.findByRole('heading', { name: 'Rekonsiliasi stok tetap' })
    ).toBeInTheDocument();
    expect(await screen.findByTestId(`fsr-outcome-${K8801}`)).toHaveTextContent(
      'PTI kurang call-off'
    );
  });
});

describe('strings', () => {
  it('every string exists in EN and ID (plural forms per locale)', () => {
    /** @param {Record<string, string>} o */
    const base = (o) =>
      [...new Set(Object.keys(o).map((k) => k.replace(/_(one|other)$/, '')))].sort();
    expect(base(fixedStockReconcileId)).toEqual(base(fixedStockReconcileEn));
  });
});
