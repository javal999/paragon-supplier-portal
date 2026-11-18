import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from './FixedStockReconcile';
import { feedstockReconcileEn, feedstockReconcileId } from '@lib/i18n/feedstockReconcile';
import i18n from '@lib/i18n';
import { formatDate, formatNumber } from '@lib/format';
import { maxStockStore } from '@services/transitions/maxStock';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { headerNamed } from '@test/termText';

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
  // The PO On Hold decisions and first days are in-memory too: a test that
  // suggests on a line must not leak into the next one (BL-347).
  poOnHoldStore.reset();
  osipParamStore.reset();
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
    expect(
      within(screen.getByTestId('fsr-table')).getByRole('columnheader', { name: 'Supplier' })
    ).toBeInTheDocument();
  });

  it('BR-01: PO ordered, called off, ASN requested and what is not yet called off', async () => {
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
    // BL-274 (PEX-9 BR-01) — "Called off, not yet shipped" is no longer shown.
    expect(screen.queryByTestId(`fsr-unshipped-${K8801}`)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Called off, not yet shipped/ })).toBeNull();
    expect(screen.queryByTestId(`fsr-beyond-${K8801}`)).toBeNull();
    expect(screen.getByTestId(`fsr-max-${K8801}`)).toHaveTextContent('No max stock agreed');
  });

  it('BR-02: no outcome, summary or liability; PEX-9 BR-02 links "Not yet called off" to its PO On Hold line', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByText(/under-called|Supplier short|Balanced/)).toBeNull();
    expect(screen.queryByTestId('fsr-summary')).toBeNull();
    // PEX-9 BR-03 — the [Proposed] leftover rule of BL-207 is gone.
    expect(screen.queryByTestId(`fsr-liability-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-proposed-${K8801}`)).toBeNull();
    expect(screen.queryByTestId('fsr-remainder-note')).toBeNull();
    const link = await screen.findByTestId(`fsr-hold-${K8801}`);
    expect(link).toHaveTextContent(`PO On Hold: ${pcs(117_700)}`);
    expect(screen.getByTestId(`fsr-hold-status-${K8801}`)).toHaveTextContent('No suggestion yet');
  });

  it('PSC-6 BR-03 to BR-05 (BL-347): DA, DA not yet called off, In grace, PO On Hold and Total OSPO', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`fsr-row-${K8801}`);
    for (const label of [
      'Demand anticipation (DA)',
      'DA not yet called off',
      'In grace',
      'PO On Hold',
      'Total OSPO'
    ])
      expect(
        within(screen.getByTestId('fsr-table')).getByRole('columnheader', {
          name: headerNamed(label)
        }),
        label
      ).toBeInTheDocument();
    // The hub day is 2026-08-31 and the quantity first appears today, so it is
    // In grace until day 15: 14 CALENDAR days later (PSC-6 BR-06).
    expect(screen.getByTestId(`fsr-ingrace-${K8801}`)).toHaveTextContent(pcs(117_700));
    expect(screen.getByTestId(`fsr-ingrace-date-${K8801}`)).toHaveTextContent(
      `until ${formatDate('2026-09-14')}`
    );
    expect(screen.getByTestId(`fsr-onhold-${K8801}`)).toHaveTextContent(pcs(0));
    expect(screen.queryByTestId(`fsr-onhold-date-${K8801}`)).toBeNull();
    // Total OSPO = min(OSPO, DA not yet called off) + PO On Hold, on the same
    // figures the PO On Hold panel below reads.
    /** @param {string} testId */
    const num = (testId) =>
      Number((screen.getByTestId(testId).textContent ?? '').replace(/[^\d]/g, ''));
    const ospo = num(`poh-ospo-${K8801}`);
    const daOff = num(`poh-da-${K8801}`);
    const hold = num(`poh-qty-${K8801}`);
    expect(screen.getByTestId(`fsr-da-uncalled-${K8801}`)).toHaveTextContent(pcs(daOff));
    expect(screen.getByTestId(`fsr-total-ospo-${K8801}`)).toHaveTextContent(
      pcs(Math.min(ospo, daOff) + hold)
    );
    expect(row).toHaveTextContent('PK-PETB-8801');
  });

  it('PSC-6 BR-07: a decision recorded during the grace keeps the quantity In grace, PO On Hold 0', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-hold-${K8801}`);
    fireEvent.click(screen.getByTestId(`poh-suggest-send-${K8801}`));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-status-${K8801}`)).toHaveAttribute(
        'data-status',
        'awaitingSupplier'
      )
    );
    // The decision takes effect at the end of the grace, so the bucket does not move.
    expect(screen.getByTestId(`fsr-ingrace-${K8801}`)).toHaveTextContent(pcs(117_700));
    expect(screen.getByTestId(`fsr-onhold-${K8801}`)).toHaveTextContent(pcs(0));
    expect(screen.queryByTestId(`fsr-onhold-date-${K8801}`)).toBeNull();
  });

  it('PEX-9 BR-02: the link shows the option and status once the planner has suggested', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-hold-${K8801}`);
    fireEvent.click(screen.getByTestId(`poh-suggest-send-${K8801}`));
    await waitFor(() =>
      expect(screen.getByTestId(`fsr-hold-status-${K8801}`)).toHaveTextContent(
        'Suggested: FS + spread. Waiting for the supplier.'
      )
    );
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
    // BL-274 (PEX-9 BR-01) — gone on the supplier's view too.
    expect(screen.queryByTestId(`fsr-unshipped-${K8801}`)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Called off, not yet shipped/ })).toBeNull();
    expect(screen.getByTestId(`fsr-po-${K8802}`)).toHaveTextContent(pcs(320_000));
    // Read-only: no edit and no handoff notice on the supplier's own view.
    expect(screen.queryByTestId(`fsr-max-edit-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`handoff-maxstock-${K8801}`)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Feedstock reconcile' })).toBeInTheDocument();
    expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('purpose-header')).toBeNull();
    // PEX-9 BR-03 — the [Proposed BL-207] flag is gone for good: no liability,
    // no "Proposed" label, no rule paragraph.
    expect(screen.queryByTestId('fsr-remainder-note')).toBeNull();
    expect(screen.queryByTestId(`fsr-liability-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-proposed-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-liability-${KUNASSIGNED}`)).toBeNull();
  });

  it('PSC-6 BR-03: the supplier sees In grace and PO On Hold on its own rows', async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.getByRole('columnheader', { name: headerNamed('In grace') })).toBeInTheDocument();
    expect(screen.getByTestId(`fsr-ingrace-${K8801}`)).toHaveTextContent(pcs(117_700));
    expect(screen.getByTestId(`fsr-onhold-${K8801}`)).toHaveTextContent(pcs(0));
    expect(screen.queryByTestId(`fsr-onhold-date-${K8801}`)).toBeNull();
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
      await screen.findByRole('columnheader', { name: headerNamed('Belum di-call-off') })
    ).toBeInTheDocument();
    // PEX-9 BR-03 — no [Proposed BL-207] flag on the supplier's rows in Indonesian either.
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByTestId(`fsr-liability-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-liability-nomax-${K8801}`)).toBeNull();
    expect(screen.queryByTestId(`fsr-proposed-${K8801}`)).toBeNull();
    expect(screen.queryByTestId('fsr-remainder-note')).toBeNull();
    expect(screen.queryByText(/Usulan aturan sisa \(DRC-15b\)/)).toBeNull();
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
