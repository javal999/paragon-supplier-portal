import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerDataHealth from './BuyerDataHealth';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
/** @import { QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-01 — the planner's Data health page. Figures are read back from the
// service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
/** @type {QueryScope} */
const supplierScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};
const report = async () =>
  /** @type {import('../services/data/types').DataHealthView} */ (
    await mockDataService.procurement.getDataHealth(buyerScope)
  );

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerDataHealth — the planner page', () => {
  it('renders inside the app shell with the SIMULATED engine pill — never Live — and says what is not built', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerDataHealth />, { identity: BUYER, route: '/buyer/data-health' });
    expect(await screen.findByRole('heading', { name: 'Data health' })).toBeInTheDocument();
    // FUX A4 (F-14): the one simulated-data banner replaces the engine pill.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('dh-not-built')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('AC-01: every feed with its owner, last arrival, freshness, record count and check result — the service’s own figures', async () => {
    const r = await report();
    expect(r.provenance.liveness).toBe('SIMULATED');
    renderWithProviders(<BuyerDataHealth />, { identity: BUYER, route: '/buyer/data-health' });
    await screen.findByTestId(`dh-row-${r.feeds[0].feed}`);
    for (const f of r.feeds) {
      expect(screen.getByTestId(`dh-records-${f.feed}`)).toHaveTextContent(formatNumber(f.records));
      expect(screen.getByTestId(`dh-owner-${f.feed}`)).toHaveTextContent(
        f.source === 'mdm' ? 'Master Data Management team' : 'Supplier Hub'
      );
      expect(screen.getByTestId(`dh-fresh-${f.feed}`)).toHaveTextContent(
        f.limitDays === null ? 'No limit' : 'Fresh'
      );
      // F-18: the steps by their page names, never their requirement codes.
      expect(screen.getByTestId(`dh-affects-${f.feed}`)).toHaveTextContent(
        f.affects.map((s) => i18n.t(`dh.step.${s}`)).join(' · ')
      );
      expect(screen.getByTestId(`dh-affects-${f.feed}`).textContent).not.toMatch(/E14-/);
    }
    expect(screen.getByTestId('dh-kpi-feeds')).toHaveTextContent(String(r.feeds.length));
    expect(screen.getByTestId('dh-kpi-stale')).toHaveTextContent('0');
    expect(screen.getByTestId('dh-kpi-checks')).toHaveTextContent(
      String(r.feeds.flatMap((f) => f.checks).filter((c) => !c.passed).length)
    );
  });

  it('opens on the feed with a failing check and drills into its failing records (stock accuracy)', async () => {
    const r = await report();
    const cc = /** @type {import('../services/engine/dataHealth').FeedHealth} */ (
      r.feeds.find((f) => f.feed === 'cycleCounts')
    );
    const flagged = /** @type {import('../services/engine/dataHealth').CheckResult} */ (
      cc.checks.find((c) => c.check === 'stockAccuracy')
    );
    expect(flagged.failures.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerDataHealth />, { identity: BUYER, route: '/buyer/data-health' });
    const detail = await screen.findByTestId('dh-detail');
    expect(within(detail).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Quality checks · Cycle counts'
    );
    expect(within(detail).getByTestId('dh-check-failing-stockAccuracy')).toHaveTextContent(
      String(flagged.failures.length)
    );
    const records = within(detail).getByTestId('dh-records');
    for (const f of flagged.failures)
      expect(within(records).getByTestId(`dh-record-${f.key}`)).toHaveTextContent(f.detail);
    // The engine steps panel names what the flag reaches.
    expect(screen.getByTestId('dh-step-E14-03')).toHaveTextContent('Flagged');
    expect(screen.getByTestId('dh-step-by-E14-03')).toHaveTextContent('Cycle counts');
    expect(screen.getByTestId('dh-step-E14-02')).toHaveTextContent('Clear');
  });

  it('selecting the stock feed shows its checks all passing and the per-warehouse snapshot', async () => {
    const r = await report();
    const stock = /** @type {import('../services/engine/dataHealth').FeedHealth} */ (
      r.feeds.find((f) => f.feed === 'stock')
    );
    renderWithProviders(<BuyerDataHealth />, { identity: BUYER, route: '/buyer/data-health' });
    fireEvent.click(await screen.findByTestId('dh-row-stock'));
    const detail = screen.getByTestId('dh-detail');
    for (const c of stock.checks)
      expect(within(detail).getByTestId(`dh-check-${c.check}`)).toHaveTextContent('Pass');
    expect(within(detail).queryByTestId('dh-records')).toBeNull();
    for (const w of /** @type {NonNullable<typeof stock.warehouses>} */ (stock.warehouses))
      expect(within(detail).getByTestId(`dh-wh-${w.warehouseId}`)).toHaveTextContent('Fresh');
  });

  it('a supplier scope gets nothing (X-03)', async () => {
    expect(await mockDataService.procurement.getDataHealth(supplierScope)).toBeNull();
  });

  it('renders in Bahasa Indonesia from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDataHealth />, { identity: BUYER, route: '/buyer/data-health' });
    expect(await screen.findByRole('heading', { name: 'Kesehatan data' })).toBeInTheDocument();
    expect(screen.getByText('Cara membaca halaman ini')).toBeInTheDocument();
    expect(screen.getByTestId('dh-owner-poLines')).toHaveTextContent('Tim Master Data Management');
  });
});
