import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerDemandForecast from './BuyerDemandForecast';
import { mockDataService } from '../services/data/mock/mockDataService';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { demandForecastEn, demandForecastId } from '../lib/i18n/demandForecast';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 — the planner's Demand forecast page. Figures are read back from
// the service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const view = async () => (await mockDataService.procurement.getDemandForecast(buyerScope))!;

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerDemandForecast — the planner page', () => {
  it('renders in the app shell with the SIMULATED engine pill, and says the main model is not built and SAP’s plan still feeds material plans', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const v = await view();
    expect(v.provenance.liveness).toBe('SIMULATED');
    expect(v.mainModel).toBe('notBuilt');
    expect(v.materialPlanningSource).toBe('sapPlan');
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    expect(await screen.findByRole('heading', { name: 'Demand forecast' })).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('df-main-not-built')).toHaveTextContent('The main model is not built');
    expect(screen.getByTestId('df-source-note')).toHaveTextContent('still run on SAP’s plan');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('AC-01: every SKU is listed with its named method; no row is labelled the main model', async () => {
    const v = await view();
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    await screen.findByTestId(`df-sku-${v.skus[0].skuCode}`);
    for (const s of v.skus) {
      expect(screen.getByTestId(`df-method-${s.skuCode}`)).toHaveTextContent(demandForecastEn[`df.method.${s.method}`]);
      expect(screen.getByTestId(`df-sku-total-${s.skuCode}`)).toHaveTextContent(formatNumber(s.forecast.reduce((a, x) => a + x, 0)));
    }
    expect(screen.queryByText(demandForecastEn['df.method.main'])).toBeNull();
    expect(screen.getByTestId('df-kpi-comb')).toHaveTextContent(String(v.methodCounts.comb));
    expect(screen.getByTestId('df-kpi-skus')).toHaveTextContent(String(v.skus.length - v.methodCounts.discontinued));
  });

  it('AC-02: the total and each brand show the sum of their SKUs', async () => {
    const v = await view();
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    await screen.findByTestId('df-level-total');
    const total = v.skus.reduce((a, s) => a + s.forecast.reduce((x, y) => x + y, 0), 0);
    expect(screen.getByTestId('df-level-forecast-total')).toHaveTextContent(formatNumber(total));
    expect(screen.getByTestId('df-kpi-total')).toHaveTextContent(formatNumber(total));
    for (const b of v.brands) {
      const sum = v.skus.filter((s) => s.brand === b.key).reduce((a, s) => a + s.forecast.reduce((x, y) => x + y, 0), 0);
      expect(screen.getByTestId(`df-level-forecast-${b.key}`)).toHaveTextContent(formatNumber(sum));
    }
    expect(screen.getByTestId('df-kpi-recon-method')).toHaveTextContent('MinT-shrink');
  });

  it('filters SKUs by brand and opens a SKU’s weeks', async () => {
    const v = await view();
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    await screen.findByTestId('df-skus');
    const brand = v.brands[0].key;
    fireEvent.click(within(screen.getByTestId('df-skus')).getByRole('radio', { name: new RegExp(`^${brand}`) }));
    const inBrand = v.skus.filter((s) => s.brand === brand);
    for (const s of v.skus) {
      if (inBrand.includes(s)) expect(screen.getByTestId(`df-sku-${s.skuCode}`)).toBeInTheDocument();
      else expect(screen.queryByTestId(`df-sku-${s.skuCode}`)).toBeNull();
    }
    const pick = inBrand.find((s) => s.method === 'comb')!;
    fireEvent.click(screen.getByTestId(`df-sku-${pick.skuCode}`));
    const detail = screen.getByTestId('df-detail');
    expect(within(detail).getByRole('heading', { level: 2 })).toHaveTextContent(pick.skuCode);
    expect(within(detail).getByTestId(`df-week-forecast-${v.weeks[0]}`)).toHaveTextContent(formatNumber(pick.forecast[0]));
    expect(within(detail).getByTestId('df-detail-method')).toHaveTextContent('Comb: the average');
  });

  it('OEM: the section says none is in this data', async () => {
    const v = await view();
    expect(v.excludedOem).toEqual([]);
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    expect(await screen.findByTestId('df-oem')).toHaveTextContent('No OEM product in this data');
  });

  it('a supplier gets nothing (X-03)', async () => {
    expect(await mockDataService.procurement.getDemandForecast(supplierScope)).toBeNull();
  });

  it('every string exists in EN and ID, and the page renders in Indonesian', async () => {
    expect(Object.keys(demandForecastId).sort()).toEqual(Object.keys(demandForecastEn).sort());
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    expect(await screen.findByRole('heading', { name: 'Prakiraan permintaan' })).toBeInTheDocument();
    expect(screen.getByTestId('df-main-not-built')).toHaveTextContent('Model utama belum dibangun');
  });
});
