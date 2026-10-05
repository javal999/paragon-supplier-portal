import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerDemandForecast from './BuyerDemandForecast';
import { demandForecastEn, demandForecastId } from '../lib/i18n/demandForecast';
import { mockDataService } from '../services/data/mock/mockDataService';
import { forecastOverrideStore } from '../services/data/mock/stores/forecastOverrideStore';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { forecastBiasEn, forecastBiasId } from '../lib/i18n/forecastBias';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 — Forecast bias, now the "Bias and overrides" tab of Forecast
// quality (FUX phase 2 B5). Figures are read back from the service for the
// same scope, never restated. The override form is driven end to end: the act
// lands in the ledger and on the "Forecast vs plan" tab.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const BIAS_TAB = '/buyer/demand-forecast?tab=bias';
const view = async () => (await mockDataService.procurement.getForecastBias(buyerScope))!;

// The bias replay re-runs the forecast at 52 past origins; run it once, outside
// the per-test clock (it is memoised for the rest of the file).
beforeAll(async () => {
  await view();
}, 60_000);
beforeEach(() => forecastOverrideStore.reset());
afterEach(() => {
  forecastOverrideStore.reset();
  void i18n.changeLanguage('en');
});

describe('Forecast quality · Bias and overrides tab', () => {
  it('renders in the app shell under the Forecast quality title, with the SIMULATED engine pill, and says overrides do not drive material planning', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const v = await view();
    expect(v.provenance.liveness).toBe('SIMULATED');
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
    expect(await screen.findByRole('heading', { level: 1, name: 'Forecast quality' })).toBeInTheDocument();
    await screen.findByTestId('fb-kpis', {}, { timeout: 15000 });
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('fb-source-note')).toHaveTextContent('still run on SAP’s plan');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('BR-01 / AC-01: every SKU shows its signal on the engine and on SAP’s plan; alarm counts match the service', async () => {
    const v = await view();
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
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
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
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
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
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
    expect(await screen.findByTestId('df-overrides', {}, { timeout: 15000 })).toHaveTextContent('Weeks with a planner override in force: 1.');
  });

  it('BR-03 on the form: an upward override with no reason is refused and nothing is recorded', async () => {
    const v = await view();
    const sku = v.current.skus.find((s) => s.method === 'comb')!;
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
    await screen.findByTestId('fb-form');
    fireEvent.change(screen.getByTestId('fb-form-sku'), { target: { value: sku.skuCode } });
    fireEvent.change(screen.getByTestId('fb-form-value'), { target: { value: String(sku.engineForecast[0] + 1) } });
    fireEvent.click(screen.getByTestId('fb-form-submit'));
    expect(await screen.findByTestId('fb-form-refusal')).toHaveTextContent('Override not recorded');
    expect(forecastOverrideStore.all()).toEqual([]);
  });

  it('a PTI seat without the planning lane sees who acts, not the form', async () => {
    renderWithProviders(<BuyerDemandForecast />, { identity: { ...BUYER, businessRoles: ['finance'] }, route: BIAS_TAB });
    expect(await screen.findByTestId('handoff-forecast-override')).toBeInTheDocument();
    expect(screen.queryByTestId('fb-form')).toBeNull();
  });

  it('X-03: a supplier gets nothing', async () => {
    expect(await mockDataService.procurement.getForecastBias(supplierScope)).toBeNull();
  });

  it('every string has an Indonesian twin, and the page renders in Indonesian', async () => {
    expect(Object.keys(forecastBiasId).sort()).toEqual(Object.keys(forecastBiasEn).sort());
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
    expect(await screen.findByRole('heading', { level: 1, name: 'Kualitas prakiraan' })).toBeInTheDocument();
    await screen.findByTestId('fb-kpis', {}, { timeout: 15000 });
    expect(screen.getByTestId('fb-fva-empty')).toHaveTextContent('tidak ada yang dikarang');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUX phase 2 B5 (F-06, F-12, FUX2-R1) — Forecast quality is one page with two
// tabs. The old route redirects to the bias tab; the tab lives in the address,
// so it survives a reload; both tabs name the plan source.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTER_SRC = fs.readFileSync(path.resolve(__dirname, '..', 'router', 'AppRouter.tsx'), 'utf8');

const LocationProbe: React.FC = () => {
  const loc = useLocation();
  return <output data-testid="location">{`${loc.pathname}${loc.search}`}</output>;
};

const selectedTab = () => within(screen.getByTestId('fq-tabs')).getByRole('tab', { selected: true });

describe('Forecast quality · two tabs (FUX phase 2 B5)', () => {
  it('/buyer/forecast-bias lands on Forecast quality with the bias tab selected', async () => {
    // The redirect is read from AppRouter's own source, so this tests the
    // shipped route and not a copy of it.
    const m = /path="\/buyer\/forecast-bias"\s+element=\{<Navigate\s+to="([^"]+)"\s+replace\s*\/>\}/.exec(ROUTER_SRC);
    expect(m, 'AppRouter must redirect /buyer/forecast-bias').not.toBeNull();
    const target = m![1];
    expect(target).toBe('/buyer/demand-forecast?tab=bias');
    renderWithProviders(
      <Routes>
        <Route path="/buyer/forecast-bias" element={<Navigate to={target} replace />} />
        <Route
          path="/buyer/demand-forecast"
          element={
            <>
              <BuyerDemandForecast />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { identity: BUYER, route: '/buyer/forecast-bias' },
    );
    expect(await screen.findByTestId('fb-form', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/demand-forecast?tab=bias');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Forecast quality');
    expect(selectedTab()).toHaveTextContent('Bias and overrides');
    expect(screen.getByTestId('purpose-header')).toHaveAttribute('data-page', 'forecastQuality');
  });

  it('choosing a tab writes it to the address, and the tab survives a reload', async () => {
    const first = renderWithProviders(
      <>
        <BuyerDemandForecast />
        <LocationProbe />
      </>,
      { identity: BUYER, route: '/buyer/demand-forecast' },
    );
    await screen.findByTestId('df-kpis', {}, { timeout: 15000 });
    expect(selectedTab()).toHaveTextContent('Forecast vs plan');
    expect(screen.queryByTestId('fb-form')).toBeNull();
    fireEvent.click(within(screen.getByTestId('fq-tabs')).getByRole('tab', { name: 'Bias and overrides' }));
    expect(await screen.findByTestId('fb-form', {}, { timeout: 15000 })).toBeInTheDocument();
    const address = screen.getByTestId('location').textContent!;
    expect(address).toBe('/buyer/demand-forecast?tab=bias');
    first.unmount();

    // A reload re-enters at the same address.
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: address });
    expect(await screen.findByTestId('fb-form', {}, { timeout: 15000 })).toBeInTheDocument();
    expect(selectedTab()).toHaveTextContent('Bias and overrides');
    expect(screen.queryByTestId('df-kpis')).toBeNull();
  });

  it('F-12: the override form and its no-effect note render together on the bias tab', async () => {
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: BIAS_TAB });
    const form = await screen.findByTestId('fb-form', {}, { timeout: 15000 });
    const section = screen.getByTestId('fb-override');
    expect(section).toContainElement(form);
    expect(within(section).getByTestId('fb-override-no-effect')).toHaveTextContent(
      'Overrides do not change orders until the engine forecast is switched on.',
    );
  });

  it.each([
    ['forecast', '/buyer/demand-forecast', 'df-kpis'],
    ['bias', BIAS_TAB, 'fb-kpis'],
  ])('F-06: the %s tab states the plan source in English and Indonesian', async (_tab, route, ready) => {
    expect(demandForecastEn['df.planSource']).toContain('SAP’s finished-goods plan');
    expect(demandForecastId['df.planSource']).toContain('rencana barang jadi SAP');
    const en = renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route });
    await screen.findByTestId(ready, {}, { timeout: 15000 });
    expect(screen.getByTestId('fq-plan-source')).toHaveTextContent(demandForecastEn['df.planSource']);
    en.unmount();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route });
    await screen.findByTestId(ready, {}, { timeout: 15000 });
    expect(screen.getByTestId('fq-plan-source')).toHaveTextContent(demandForecastId['df.planSource']);
    expect(selectedTab()).toHaveTextContent(demandForecastId[_tab === 'bias' ? 'df.tab.bias' : 'df.tab.forecast']);
  });
});
