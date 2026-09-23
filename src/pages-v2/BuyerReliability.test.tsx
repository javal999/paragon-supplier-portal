import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import BuyerReliability from './BuyerReliability';
import SupplierReliabilityPanel from './reliability/SupplierReliabilityPanel';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import { mockDataService } from '../services/data/mock/mockDataService';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-02 (BL-99) — the planner's Supplier reliability page and the
// supplier's own panel. Figures are read back from the service for the same
// scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const pct = (r: number | null) => (r === null ? null : `${Math.round(r * 100)}%`);

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerReliability — the planner page', () => {
  it('renders inside the app shell, with the SIMULATED engine pill — never Live', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    expect(await screen.findByRole('heading', { name: 'Supplier reliability' })).toBeInTheDocument();
    expect(screen.getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
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
        expect(screen.getByTestId(`rel-confirmation-${r.supplierId}`)).toHaveTextContent(pct(r.confirmation.rate)!);
      }
      expect(screen.getByTestId(`rel-misses-${r.supplierId}`)).toHaveTextContent(String(r.misses.total));
    }
  });

  it('does not show a CFOT figure — it says why instead (BL-66)', async () => {
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    expect(await screen.findByTestId('rel-cfot-pending')).toBeInTheDocument();
    expect(screen.queryByText(/Delivered on the confirmed date \d/)).toBeNull();
  });

  it('sorts by confirmation rate, lowest first, and the header flips it', async () => {
    const rows = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const byRate = [...rows].filter((r) => r.confirmation.rate !== null).sort((a, b) => a.confirmation.rate! - b.confirmation.rate!);
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-row-sup-007');
    const order = () => screen.getAllByTestId(/^rel-row-/).map((el) => el.getAttribute('data-testid')!.replace('rel-row-', ''));
    expect(order()[0]).toBe(byRate[0].supplierId);
    expect(screen.getByTestId('rel-sort-confirmation').closest('th')).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByTestId('rel-sort-confirmation'));
    expect(order()[0]).toBe(byRate[byRate.length - 1].supplierId);
    expect(screen.getByTestId('rel-sort-confirmation').closest('th')).toHaveAttribute('aria-sort', 'descending');
  });

  it('renders in Bahasa Indonesia from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReliability />, { identity: BUYER, route: '/buyer/reliability' });
    expect(await screen.findByRole('heading', { name: 'Keandalan pemasok' })).toBeInTheDocument();
    expect(screen.getByText('Cara menghitungnya')).toBeInTheDocument();
  });
});

describe('SupplierReliabilityPanel — the supplier sees only its own figures (AC-03)', () => {
  const SUP002: CurrentIdentity = {
    personaType: 'supplier',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON,
  };

  it('shows the supplier’s own confirmation rate and PTI’s plan-change figure, with the SIMULATED pill', async () => {
    const all = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const mine = all.find((r) => r.supplierId === 'sup-007')!;
    renderWithProviders(<SupplierReliabilityPanel />, { identity: SUPPLIER, route: '/supplier/forecasts' });
    const panel = await screen.findByTestId('rel-sup-panel');
    expect(within(panel).getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
    expect(within(screen.getByTestId('rel-sup-confirmation')).getByText(pct(mine.confirmation.rate)!)).toBeInTheDocument();
    expect(within(screen.getByTestId('rel-sup-planchange')).getByText(pct(mine.planChange.share)!)).toBeInTheDocument();
  });

  it('another supplier’s figures never render — sup-002 sees its own confirmation, not sup-007’s', async () => {
    const all = (await mockDataService.procurement.getSupplierReliability(buyerScope)).items;
    const own = all.find((r) => r.supplierId === 'sup-002')!;
    const other = all.find((r) => r.supplierId === 'sup-007')!;
    expect(pct(own.confirmation.rate)).not.toBe(pct(other.confirmation.rate)); // the probe can tell them apart
    renderWithProviders(<SupplierReliabilityPanel />, { identity: SUP002, route: '/supplier/forecasts' });
    const tile = await screen.findByTestId('rel-sup-confirmation');
    expect(within(tile).getByText(pct(own.confirmation.rate)!)).toBeInTheDocument();
    expect(within(tile).queryByText(pct(other.confirmation.rate)!)).toBeNull();
    expect(screen.queryByText('PT Sample Packaging Indonesia')).toBeNull();
  });

  it('sits on the supplier’s forecast page, where every seeded supplier persona reaches it', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER, route: '/supplier/forecasts' });
    expect(await screen.findByTestId('rel-sup-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your reliability' })).toBeInTheDocument();
  });

  it('a supplier with no lines in the engine dataset is told so, not shown zeros', async () => {
    const outside: CurrentIdentity = { ...SUP002, supplierId: 'sup-020', supplierName: 'Outside' };
    renderWithProviders(<SupplierReliabilityPanel />, { identity: outside, route: '/supplier/forecasts' });
    expect(await screen.findByTestId('rel-sup-empty')).toBeInTheDocument();
  });
});
