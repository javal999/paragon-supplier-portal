import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerForecastBias from './BuyerForecastBias';
import BuyerDemandForecast from './BuyerDemandForecast';
import { mockDataService } from '../services/data/mock/mockDataService';
import { forecastOverrideStore } from '../services/data/mock/stores/forecastOverrideStore';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { forecastBiasEn, forecastBiasId } from '../lib/i18n/forecastBias';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 — the Forecast bias page. Figures are read back from the service
// for the same scope, never restated. The override form is driven end to end:
// the act lands in the ledger and on the Demand forecast page.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const view = async () => (await mockDataService.procurement.getForecastBias(buyerScope))!;

beforeEach(() => forecastOverrideStore.reset());
afterEach(() => {
  forecastOverrideStore.reset();
  void i18n.changeLanguage('en');
});

describe('BuyerForecastBias — the planner page', () => {
  it('renders in the app shell with the SIMULATED engine pill and says overrides do not drive material planning', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const v = await view();
    expect(v.provenance.liveness).toBe('SIMULATED');
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    expect(await screen.findByRole('heading', { name: 'Forecast bias' })).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('fb-source-note')).toHaveTextContent('still run on SAP’s plan');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('BR-01 / AC-01: every SKU shows its signal on the engine and on SAP’s plan; alarm counts match the service', async () => {
    const v = await view();
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    await screen.findByTestId(`fb-sku-${v.skus[0].skuCode}`);
    for (const s of v.skus) {
      expect(screen.getByTestId(`fb-engine-${s.skuCode}`)).toBeInTheDocument();
      expect(screen.getByTestId(`fb-sap-${s.skuCode}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('fb-kpi-sku-engine')).toHaveTextContent(`${v.alarms.skus.engine.total} / ${v.skus.length}`);
    expect(screen.getByTestId('fb-kpi-mat-engine')).toHaveTextContent(`${v.alarms.materials.engine.total} / ${v.materials.length}`);
    const sapAlarm = v.skus.find((s) => s.sap.alarm)!;
    expect(screen.getByTestId(`fb-sap-${sapAlarm.skuCode}`)).toHaveTextContent(forecastBiasEn[`fb.alarm.${sapAlarm.sap.direction}`]);
    // Materials open on "any alarm"; every listed material alarms on one side.
    const listed = v.materials.filter((m) => m.engine.alarm || m.sap.alarm);
    expect(listed.length).toBeGreaterThan(0);
    expect(screen.getByTestId(`fb-mat-${listed[0].materialCode}`)).toBeInTheDocument();
    const quiet = v.materials.find((m) => !m.engine.alarm && !m.sap.alarm);
    if (quiet) expect(screen.queryByTestId(`fb-mat-${quiet.materialCode}`)).toBeNull();
  });

  it('no override history is invented: the ledger and the value report say they are empty', async () => {
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    expect(await screen.findByTestId('fb-ledger-empty')).toHaveTextContent('carries no override history');
    expect(screen.getByTestId('fb-fva-empty')).toHaveTextContent('none is invented');
    expect(screen.getByTestId('fb-review-empty')).toBeInTheDocument();
    expect(screen.getByTestId('fb-kpi-overrides')).toHaveTextContent('0');
    expect(screen.getByTestId('fb-service-note')).toHaveTextContent('built separately');
  });

  it('X-06: a planner records an override through the form; it lands in the ledger with old → new, and on the Demand forecast', async () => {
    const v = await view();
    const sku = v.current.skus.find((s) => s.method === 'comb')!;
    const engine = sku.engineForecast[0];
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    await screen.findByTestId('fb-form');
    fireEvent.change(screen.getByTestId('fb-form-sku'), { target: { value: sku.skuCode } });
    fireEvent.change(screen.getByTestId('fb-form-week'), { target: { value: '0' } });
    expect(screen.getByTestId('fb-form-values')).toHaveTextContent(formatNumber(engine));
    fireEvent.change(screen.getByTestId('fb-form-value'), { target: { value: String(engine + 500) } });
    fireEvent.change(screen.getByTestId('fb-form-reason'), { target: { value: 'promotion' } });
    fireEvent.click(screen.getByTestId('fb-form-submit'));
    await waitFor(() => expect(forecastOverrideStore.all()).toHaveLength(1));
    const [o] = forecastOverrideStore.all();
    expect(o).toMatchObject({ skuCode: sku.skuCode, weekStart: v.current.weeks[0], oldValue: engine, newValue: engine + 500, reasonCode: 'promotion' });
    expect(await screen.findByTestId(`fb-ledger-values-${o.id}`)).toHaveTextContent(`${formatNumber(engine)} → ${formatNumber(engine + 500)}`);
    expect(screen.getByTestId('fb-kpi-overrides')).toHaveTextContent('1');

    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    expect(await screen.findByTestId('df-overrides')).toHaveTextContent('Weeks with a planner override in force: 1.');
  });

  it('BR-03 on the form: an upward override with no reason is refused and nothing is recorded', async () => {
    const v = await view();
    const sku = v.current.skus.find((s) => s.method === 'comb')!;
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    await screen.findByTestId('fb-form');
    fireEvent.change(screen.getByTestId('fb-form-sku'), { target: { value: sku.skuCode } });
    fireEvent.change(screen.getByTestId('fb-form-value'), { target: { value: String(sku.engineForecast[0] + 1) } });
    fireEvent.click(screen.getByTestId('fb-form-submit'));
    expect(await screen.findByTestId('fb-form-refusal')).toHaveTextContent('Override not recorded');
    expect(forecastOverrideStore.all()).toEqual([]);
  });

  it('a PTI seat without the planning lane sees who acts, not the form', async () => {
    renderWithProviders(<BuyerForecastBias />, { identity: { ...BUYER, businessRoles: ['finance'] }, route: '/buyer/forecast-bias' });
    expect(await screen.findByTestId('handoff-forecast-override')).toBeInTheDocument();
    expect(screen.queryByTestId('fb-form')).toBeNull();
  });

  it('X-03: a supplier gets nothing', async () => {
    expect(await mockDataService.procurement.getForecastBias(supplierScope)).toBeNull();
  });

  it('every string has an Indonesian twin, and the page renders in Indonesian', async () => {
    expect(Object.keys(forecastBiasId).sort()).toEqual(Object.keys(forecastBiasEn).sort());
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerForecastBias />, { identity: BUYER, route: '/buyer/forecast-bias' });
    expect(await screen.findByRole('heading', { name: 'Bias prakiraan' })).toBeInTheDocument();
    expect(screen.getByTestId('fb-fva-empty')).toHaveTextContent('tidak ada yang dikarang');
  });
});
