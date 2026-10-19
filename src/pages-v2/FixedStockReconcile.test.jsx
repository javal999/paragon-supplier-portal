import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from './FixedStockReconcile';
import { feedstockReconcileEn, feedstockReconcileId } from '@lib/i18n/feedstockReconcile';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import { maxStockStore } from '@services/transitions/maxStock';

/** @param {number} n */
const pcs = (n) => `${formatNumber(n)} PCS`;

// ─────────────────────────────────────────────────────────────────────────────
// DRC-15a (BL-201) — the planner's Feedstock reconcile page and the supplier's
// own view, on the sample data (hub clock 2026-08-31).
// ─────────────────────────────────────────────────────────────────────────────

const K8801 = 'sup-007|PK-PETB-8801';
const K8802 = 'sup-007|PK-PETB-8802';
// A pair the hub does not assign: the max stock verb cannot address it.
const KUNASSIGNED = 'sup-020|PK-PETB-8801';

beforeEach(() => {
  maxStockStore.reset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('Feedstock reconcile — planner', () => {
  it('renders in the shell under its new name, marked sample data', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    expect(await screen.findByRole('heading', { name: 'Feedstock reconcile' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByRole('columnheader', { name: 'Supplier' })).toBeInTheDocument();
  });

  it('BR-01: PO ordered, called off, ASN requested and the two remainders', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`fsr-row-${K8801}`);
    expect(within(row).getByText('PT Sample Packaging Indonesia')).toBeInTheDocument();
    expect(screen.getByTestId(`fsr-po-${K8801}`)).toHaveTextContent(pcs(470_000));
    expect(row).toHaveTextContent('on 5 POs');
    expect(screen.getByTestId(`fsr-called-${K8801}`)).toHaveTextContent(pcs(208_000));
    expect(row).toHaveTextContent('on 10 call-offs');
    expect(screen.getByTestId(`fsr-asn-${K8801}`)).toHaveTextContent(pcs(0));
    expect(screen.getByTestId(`fsr-uncalled-${K8801}`)).toHaveTextContent(pcs(262_000));
    expect(screen.getByTestId(`fsr-unshipped-${K8801}`)).toHaveTextContent(pcs(208_000));
    expect(screen.queryByTestId(`fsr-beyond-${K8801}`)).toBeNull();
    expect(screen.getByTestId(`fsr-max-${K8801}`)).toHaveTextContent('No max stock agreed');
  });

  it('BR-02: the remainders are shown only — no outcome or liability, and the leftover rule is DRC-15b', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByTestId('fsr-remainder-note')).toHaveTextContent(
      'What happens to a remainder is still to be decided (DRC-15b).'
    );
    expect(screen.queryByText(/Liability/)).toBeNull();
    expect(screen.queryByText(/under-called|Supplier short|Balanced/)).toBeNull();
    expect(screen.queryByTestId('fsr-summary')).toBeNull();
  });

  it('BR-03: a seat holding maxstock:set sets the max stock from the row, and the row reads it', async () => {
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
    // It caps nothing: the remainders are unchanged.
    expect(screen.getByTestId(`fsr-uncalled-${K8801}`)).toHaveTextContent(pcs(262_000));
    expect(maxStockStore.get('sup-007', 'PK-PETB-8801')?.quantity).toBe(50_000);
  });

  it('BR-03: a planner-only seat sees whose act it is, never the control', async () => {
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

  it('BR-03: a pair the hub does not assign offers no max stock control and says why', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${KUNASSIGNED}`);
    expect(screen.queryByTestId(`fsr-max-edit-${KUNASSIGNED}`)).toBeNull();
    expect(screen.getByTestId(`fsr-max-unassigned-${KUNASSIGNED}`)).toHaveTextContent(
      'Not an assigned material, so no max stock can be set'
    );
  });
});

describe('Feedstock reconcile — supplier', () => {
  it('BR-04: shows its own rows only, without a supplier column, read-only', async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByTestId(`fsr-row-${K8802}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`fsr-row-${KUNASSIGNED}`)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(screen.getByTestId(`fsr-po-${K8802}`)).toHaveTextContent(pcs(320_000));
    // Read-only: no edit and no handoff notice on the supplier's own view.
    expect(screen.queryByTestId(`fsr-max-edit-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`handoff-maxstock-${K8801}`)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Feedstock reconcile' })).toBeInTheDocument();
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('purpose-header')).toBeNull();
    expect(screen.getByTestId('fsr-remainder-note')).toBeInTheDocument();
  });

  it('BR-05: reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    expect(
      await screen.findByRole('heading', { name: 'Rekonsiliasi feedstock' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('columnheader', { name: 'Belum di-call-off' })
    ).toBeInTheDocument();
  });
});

describe('strings', () => {
  it('every string exists in EN and ID (plural forms per locale)', () => {
    /** @param {Record<string, string>} o */
    const base = (o) =>
      [...new Set(Object.keys(o).map((k) => k.replace(/_(one|other)$/, '')))].sort();
    expect(base(feedstockReconcileId)).toEqual(base(feedstockReconcileEn));
  });
});
