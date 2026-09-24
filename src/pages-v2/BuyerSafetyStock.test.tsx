import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { mockDataService } from '../services/data/mock/mockDataService';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { DEFAULT_SETTING_STATE, settingRefusal } from '../services/transitions/hubSettings';
import i18n from '../lib/i18n';
import type { QueryScope } from '../services/data/types';
import { qtyOf } from './materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-04 — the planner's Safety stock page. Figures are read back from the
// service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerSafetyStock — the planner page', () => {
  it('renders inside the app shell with the SIMULATED engine pill and the tier-default note — never Live', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    expect(await screen.findByRole('heading', { name: 'Safety stock and reorder point' })).toBeInTheDocument();
    expect(screen.getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('sst-tier-default-note')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('AC-01: per material, safety stock, SAP value, safety lead time, ROP, target and the default marker — the service’s own figures', async () => {
    const run = (await mockDataService.procurement.getSafetyStock(buyerScope))!;
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    await screen.findByTestId(`sst-row-${run.materials[0].materialCode}`);
    for (const m of run.materials) {
      expect(within(screen.getByTestId(`sst-row-${m.materialCode}`)).getByText(m.materialCode)).toBeInTheDocument();
      expect(screen.getByTestId(`sst-ss-${m.materialCode}`)).toHaveTextContent(qtyOf(m.safetyStock, m.uom));
      expect(screen.getByTestId(`sst-sap-${m.materialCode}`)).toHaveTextContent(qtyOf(m.sapSafetyStock, m.uom));
      expect(screen.getByTestId(`sst-rop-${m.materialCode}`)).toHaveTextContent(qtyOf(m.reorderPoint, m.uom));
      expect(screen.getByTestId(`sst-target-${m.materialCode}`)).toHaveTextContent(`${Math.round(m.target * 1000) / 10}%`);
      expect(screen.getByTestId(`sst-tier-source-${m.materialCode}`)).toHaveTextContent('default');
    }
    expect(screen.getByTestId('sst-kpi-fallback')).toHaveTextContent(String(run.materials.filter((m) => m.source === 'sap').length));
  });

  it('AC-03: selecting a material shows the stored errors its figure was read from', async () => {
    const run = (await mockDataService.procurement.getSafetyStock(buyerScope))!;
    const m = run.materials.find((x) => x.safetyStock > 0 && x.source === 'engine')!;
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    fireEvent.click(await screen.findByTestId(`sst-row-${m.materialCode}`));
    const detail = screen.getByTestId('sst-detail');
    expect(within(detail).getByTestId('sst-detail-engine')).toHaveTextContent(qtyOf(m.engineSafetyStock, m.uom));
    expect(within(detail).getAllByTestId(/^sst-err-/).length).toBe(m.errors.length);
  });

  it('BR-06 (BL-116): each material shows its change since the last run and the cause, read back from the service', async () => {
    const run = (await mockDataService.procurement.getSafetyStock(buyerScope))!;
    const moved = run.materials.filter((m) => m.change.safetyStockDelta !== 0);
    const still = run.materials.filter((m) => m.change.causes.length === 0);
    expect(moved.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    await screen.findByTestId(`sst-row-${run.materials[0].materialCode}`);
    expect(screen.getByTestId('sst-last-run')).toHaveTextContent(`${moved.length} materials’ safety stock changed since the last run`);
    for (const m of moved) {
      const d = m.change.safetyStockDelta;
      expect(screen.getByTestId(`sst-change-ss-${m.materialCode}`)).toHaveTextContent(
        d > 0 ? `+${qtyOf(d, m.uom)}` : `−${qtyOf(-d, m.uom)}`,
      );
      for (const cause of m.change.causes) expect(screen.getByTestId(`sst-cause-${m.materialCode}-${cause}`)).toBeInTheDocument();
    }
    for (const m of still) expect(screen.getByTestId(`sst-change-${m.materialCode}`)).toHaveTextContent('No change');
    // A named cause reads in business language, with its figures.
    expect(run.materials.filter((m) => m.change.causes.includes('tier')).map((m) => m.materialCode)).toEqual([
      'AI-PANTO-6640',
      'RM-EMUL-3320',
    ]);
    expect(screen.getByTestId('sst-cause-RM-EMUL-3320-tier')).toHaveTextContent('Tier changed: High volume → Standard');
    expect(screen.getByTestId('sst-cause-AI-PANTO-6640-tier')).toHaveTextContent('Tier changed: Slow mover → Standard');
  });

  it('a supplier scope gets nothing (X-03)', async () => {
    expect(await mockDataService.procurement.getSafetyStock(supplierScope)).toBeNull();
  });

  it('renders in Bahasa Indonesia from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    expect(await screen.findByRole('heading', { name: 'Stok pengaman dan titik pesan ulang' })).toBeInTheDocument();
    expect(screen.getByText('Cara menghitungnya')).toBeInTheDocument();
  });
});

describe('ENG-D5 targets on the administration page — the tiers stay in order', () => {
  it('known-good: 92% for other materials passes; known-bad: above high-volume, or slow above other, is refused by name', () => {
    expect(settingRefusal('engine.fillRateStandardPct', 92, DEFAULT_SETTING_STATE)).toBeNull();
    expect(settingRefusal('engine.fillRateStandardPct', 96, DEFAULT_SETTING_STATE)).toMatch(/engine\.fillRateStandardPct: other materials may not be held/);
    expect(settingRefusal('engine.fillRateSlowPct', 91, DEFAULT_SETTING_STATE)).toMatch(/engine\.fillRateSlowPct: slow movers may not be held/);
    expect(settingRefusal('engine.safetyLeadTimePercentile', 40, DEFAULT_SETTING_STATE)).toMatch(/at least 50/);
  });

  it('flags a material whose safety stock relies on the order lot alone, in EN and ID — and only those', async () => {
    const run = (await mockDataService.procurement.getSafetyStock(buyerScope))!;
    const flagged = run.materials.filter((m) => m.reliesOnOrderLot);
    expect(flagged.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    await screen.findByTestId(`sst-row-${run.materials[0].materialCode}`);
    for (const m of run.materials) {
      if (m.reliesOnOrderLot) expect(screen.getByTestId(`sst-lot-${m.materialCode}`)).toHaveTextContent('relies on the order lot');
      else expect(screen.queryByTestId(`sst-lot-${m.materialCode}`)).toBeNull();
    }
    await i18n.changeLanguage('id');
    expect(await screen.findByTestId(`sst-lot-${flagged[0].materialCode}`)).toHaveTextContent('mengandalkan lot pesanan');
  });
});
