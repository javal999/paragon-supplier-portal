import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import BuyerReliability from './BuyerReliability';
import SupplierReliabilityPanel from './reliability/SupplierReliabilityPanel';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { QueryScope } from '@services/data/types' */
import { portfolioCfot } from '@services/engine/cfot';
import { EARLY_DELIVERY_WINDOW_DAYS } from '@services/data/kpiWindow';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-02 (BL-99) — the planner's Supplier reliability page and the
// supplier's own panel. Figures are read back from the service for the same
// scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
/** @param {number | null} r */
const pct = (r) => (r === null ? null : `${Math.round(r * 100)}%`);

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerReliability — the planner page', () => {
  it('renders inside the app shell, with the SIMULATED engine pill — never Live', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    expect(
      await screen.findByRole('heading', { name: 'Supplier reliability' })
    ).toBeInTheDocument();
    // FUX A4 (F-14): one simulated-data banner in place of the engine pill.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByText('Live')).toBeNull();
    // The page chrome rule: the shell's navigation is present.
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('one row per supplier, each figure the service computed for it', async () => {
    const rows = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    for (const r of rows) {
      const row = screen.getByTestId(`rel-row-${r.supplierId}`);
      expect(within(row).getByText(r.supplierName)).toBeInTheDocument();
      if (r.confirmation.rate !== null) {
        expect(screen.getByTestId(`rel-confirmation-${r.supplierId}`)).toHaveTextContent(
          /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(r.confirmation.rate))
        );
      }
      expect(screen.getByTestId(`rel-misses-${r.supplierId}`)).toHaveTextContent(
        String(r.misses.total)
      );
    }
  });

  // BL-82 retired "does not show a CFOT figure — it says why instead (BL-66)".
  it('shows CFOT per supplier and for the portfolio — the service’s figures, the pending note gone (BL-82)', async () => {
    const rows = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const withCfot = rows.filter((r) => r.cfot.rate !== null);
    expect(withCfot.map((r) => r.supplierId)).toContain('sup-007'); // population control: a named member
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    expect(screen.queryByTestId('rel-cfot-pending')).toBeNull();
    expect(screen.queryByText(/being aligned with the agreed definition/)).toBeNull();
    for (const r of withCfot) {
      expect(screen.getByTestId(`rel-cfot-${r.supplierId}`)).toHaveTextContent(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(r.cfot.rate))
      );
    }
    const total = portfolioCfot(rows.map((r) => r.cfot));
    expect(screen.getByTestId('rel-portfolio-cfot')).toHaveTextContent(
      /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(total.rate))
    );
    expect(screen.getByTestId('rel-def-cfot')).toHaveTextContent(
      `no more than ${EARLY_DELIVERY_WINDOW_DAYS} days before it`
    );
  });

  it('the portfolio CFOT counts every PO once (not a mean of supplier means)', () => {
    expect(
      portfolioCfot([
        { rate: 1, pos: 3 },
        { rate: 0, pos: 1 }
      ]).rate
    ).toBe(0.75);
    expect(portfolioCfot([{ rate: null, pos: 0 }]).rate).toBeNull();
  });

  it('sorts by confirmation rate, lowest first, and the header flips it', async () => {
    const rows = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const byRate = [...rows]
      .filter((r) => r.confirmation.rate !== null)
      .sort(
        (a, b) =>
          /** @type {NonNullable<typeof a.confirmation.rate>} */ (a.confirmation.rate) -
          /** @type {NonNullable<typeof b.confirmation.rate>} */ (b.confirmation.rate)
      );
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    const order = () =>
      screen
        .getAllByTestId(/^rel-row-/)
        .map((el) =>
          /** @type {NonNullable<ReturnType<typeof el.getAttribute>>} */ (
            el.getAttribute('data-testid')
          ).replace('rel-row-', '')
        );
    expect(order()[0]).toBe(byRate[0].supplierId);
    expect(screen.getByTestId('rel-sort-confirmation').closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    fireEvent.click(screen.getByTestId('rel-sort-confirmation'));
    expect(order()[0]).toBe(byRate[byRate.length - 1].supplierId);
    expect(screen.getByTestId('rel-sort-confirmation').closest('th')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  it('renders in Bahasa Indonesia from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    expect(await screen.findByRole('heading', { name: 'Keandalan pemasok' })).toBeInTheDocument();
    expect(screen.getByText('Cara menghitungnya')).toBeInTheDocument();
    expect(screen.getByTestId('rel-def-cfot')).toHaveTextContent(
      `tidak lebih dari ${EARLY_DELIVERY_WINDOW_DAYS} hari sebelumnya`
    );
    // B6 (FUX-D5) — the measure under its new name, never the scorecard's.
    expect(screen.getAllByText('Baris tepat tanggal konfirmasi').length).toBeGreaterThan(0);
    expect(screen.getByTestId('rel-cfot-basis')).toHaveTextContent(
      'Per baris PO, 26 minggu terakhir.'
    );
    expect(screen.queryByText(/Terkirim pada tanggal yang dikonfirmasi/)).toBeNull();
  });

  it('B6 (FUX-D5) — the CFOT measure reads "Confirmed-date lines delivered", with its basis, never the scorecard’s name', async () => {
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    expect(screen.getAllByText('Confirmed-date lines delivered').length).toBeGreaterThanOrEqual(2); // KPI + column
    expect(screen.getByTestId('rel-cfot-basis')).toHaveTextContent('By PO line, last 26 weeks.');
    fireEvent.click(screen.getByText('Last 13 weeks'));
    expect(await screen.findByText('By PO line, last 13 weeks.')).toBeInTheDocument();
    expect(screen.queryByText(/Delivered on the confirmed date/)).toBeNull();
    // Its purpose header points to Supplier performance, the evaluation page.
    expect(screen.getByTestId('purpose-uses')).toHaveTextContent('Supplier performance');
    expect(screen.getByTestId('purpose-uses')).toHaveAttribute('href', '/buyer/scorecard');
  });
});

describe('SupplierReliabilityPanel — the supplier sees only its own figures (AC-03)', () => {
  /** @type {CurrentIdentity} */
  const SUP002 = {
    personaType: 'supplier',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON
  };

  it('shows the supplier’s own confirmation rate and PTI’s plan-change figure, with the SIMULATED pill', async () => {
    const all = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const mine = /** @type {import('@services/data/types').SupplierReliabilityView} */ (
      all.find((r) => r.supplierId === 'sup-007')
    );
    renderWithProviders(<SupplierReliabilityPanel />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const panel = await screen.findByTestId('rel-sup-panel');
    expect(
      within(panel).getByText('Synthetic data · awaiting the MDM SAP feed')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('rel-sup-confirmation')).getByText(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(mine.confirmation.rate))
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('rel-sup-planchange')).getByText(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(mine.planChange.share))
      )
    ).toBeInTheDocument();
    // BL-82 — the supplier's own CFOT, the service's figure for it.
    expect(
      within(screen.getByTestId('rel-sup-cfot')).getByText(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(mine.cfot.rate))
      )
    ).toBeInTheDocument();
  });

  it('another supplier’s figures never render — sup-002 sees its own confirmation, not sup-007’s', async () => {
    const all = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const own = /** @type {import('@services/data/types').SupplierReliabilityView} */ (
      all.find((r) => r.supplierId === 'sup-002')
    );
    const other = /** @type {import('@services/data/types').SupplierReliabilityView} */ (
      all.find((r) => r.supplierId === 'sup-007')
    );
    expect(pct(own.confirmation.rate)).not.toBe(pct(other.confirmation.rate)); // the probe can tell them apart
    renderWithProviders(<SupplierReliabilityPanel />, {
      identity: SUP002,
      route: '/supplier/forecasts'
    });
    const tile = await screen.findByTestId('rel-sup-confirmation');
    expect(
      within(tile).getByText(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(own.confirmation.rate))
      )
    ).toBeInTheDocument();
    expect(
      within(tile).queryByText(
        /** @type {NonNullable<ReturnType<typeof pct>>} */ (pct(other.confirmation.rate))
      )
    ).toBeNull();
    expect(screen.queryByText('PT Sample Packaging Indonesia')).toBeNull();
  });

  it('sits on the supplier’s forecast page, where every seeded supplier persona reaches it', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    expect(await screen.findByTestId('rel-sup-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your reliability' })).toBeInTheDocument();
  });

  it('a supplier with no lines in the engine dataset is told so, not shown zeros', async () => {
    /** @type {CurrentIdentity} */
    const outside = { ...SUP002, supplierId: 'sup-020', supplierName: 'Outside' };
    renderWithProviders(<SupplierReliabilityPanel />, {
      identity: outside,
      route: '/supplier/forecasts'
    });
    expect(await screen.findByTestId('rel-sup-empty')).toBeInTheDocument();
  });
});
