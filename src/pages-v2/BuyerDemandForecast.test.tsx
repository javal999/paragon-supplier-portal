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
import { hubSettingsStore } from '../services/transitions/hubSettingsStore';
import { sharePct } from './demandForecast/DemandRangeSection';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-07 — the planner's Demand forecast page. Figures are read back from
// the service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const view = async () => (await mockDataService.procurement.getDemandForecast(buyerScope))!;

afterEach(() => {
  void i18n.changeLanguage('en');
  hubSettingsStore.reset();
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

  it('demand events: each factor per level, the honest note on the synthetic history, and the approximate Ramadan table', async () => {
    const v = await view();
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const section = await screen.findByTestId('df-events');
    const ramadan = v.events.total.find((f) => f.event === 'ramadan')!;
    expect(within(section).getByTestId('df-event-ramadan-total')).toHaveTextContent(`× ${formatNumber(Math.round(ramadan.factor * 1000) / 1000)}`);
    expect(within(section).getByTestId('df-event-ramadan-total')).toHaveTextContent('Effect seen');
    expect(within(section).getByTestId('df-event-payday-total')).toHaveTextContent('No clear effect');
    for (const b of v.brands) expect(within(section).getByTestId(`df-event-ramadan-${b.key}`)).toBeInTheDocument();
    expect(within(section).getByTestId('df-events-synthetic')).toHaveTextContent('only Ramadan and the weeks before it show an effect');
    expect(within(section).getByTestId('df-ramadan-table')).toHaveTextContent('must be confirmed each year');
    expect(within(section).getByTestId('df-event-preRamadan')).toHaveTextContent(`The ${v.events.lead} weeks before`);
  });

  it('new SKUs are labelled as on SAP’s plan, and their forecast is SAP’s plan', async () => {
    const v = await view();
    const fresh = v.skus.filter((s) => s.method === 'newSkuSap');
    expect(fresh.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    await screen.findByTestId('df-skus');
    for (const s of fresh) {
      expect(screen.getByTestId(`df-method-${s.skuCode}`)).toHaveTextContent('SAP’s plan (new SKU)');
      expect(s.forecast).toEqual(s.sapPlan!.map((x) => Math.round(x ?? 0)));
    }
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

describe('BuyerDemandForecast — the demand range (REQ-E14-09)', () => {
  it('shows P50 and P90 per level, SKU and material for the week chosen, read back from the service', async () => {
    const v = await view();
    const r = v.range;
    expect(r.levels).toEqual([0.5, 0.9]);
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const section = await screen.findByTestId('df-range');
    expect(within(section).getByTestId('df-range-level-total-p50')).toHaveTextContent(formatNumber(r.total.bands[0].values[0]!));
    expect(within(section).getByTestId('df-range-level-total-p90')).toHaveTextContent(formatNumber(r.total.bands[1].values[0]!));
    for (const s of r.skus) {
      expect(within(section).getByTestId(`df-range-sku-${s.key}-p90`)).toHaveTextContent(formatNumber(s.bands[1].values[0]!));
    }
    const mat = r.materials[0];
    expect(within(section).getByTestId(`df-range-mat-${mat.key}-p50`)).toHaveTextContent(formatNumber(mat.bands[0].values[0]!));
    // The week picker moves every figure to that week.
    fireEvent.change(within(section).getByTestId('df-range-week'), { target: { value: '5' } });
    expect(within(section).getByTestId('df-range-level-total-p90')).toHaveTextContent(formatNumber(r.total.bands[1].values[5]!));
    // Known-false: no P95 column unless the administrator adds it.
    expect(within(section).queryByText('P95')).toBeNull();
  });

  it('AC-02 and Experience: how often sales went above P90 (target 10%), per level and in all, from the service', async () => {
    const v = await view();
    const all = v.range.skuExperience.find((x) => x.key === 'total')!.experience;
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const section = await screen.findByTestId('df-range');
    expect(within(section).getByTestId('df-range-kpi-p90')).toHaveTextContent(sharePct(all.above[1], all.checked)!);
    expect(within(section).getByTestId('df-range-kpi-uncorrected')).toHaveTextContent(sharePct(all.aboveUncorrected[1], all.checked)!);
    for (const l of [v.range.total, ...v.range.brands]) {
      expect(within(section).getByTestId(`df-range-level-above-${l.key}`)).toHaveTextContent(`${sharePct(l.experience.above[1], l.experience.checked)} of ${formatNumber(l.experience.checked)}`);
    }
    expect(within(section).getByTestId('df-range-not-published')).toHaveTextContent('It is not published to suppliers');
  });

  it('a new SKU on SAP’s plan says its range comes from SAP’s plan’s errors', async () => {
    const v = await view();
    const fresh = v.range.skus.find((s) => s.method === 'newSkuSap' && s.source[0] === 'own')!;
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const section = await screen.findByTestId('df-range');
    expect(within(section).getByTestId(`df-range-sku-source-${fresh.key}`)).toHaveTextContent('SAP plan’s errors');
  });

  it('the SKU detail carries P50 and P90 beside each week', async () => {
    const v = await view();
    const pick = v.skus.find((s) => s.method === 'comb')!;
    const range = v.range.skus.find((s) => s.key === pick.skuCode)!;
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    fireEvent.click(await screen.findByTestId(`df-sku-${pick.skuCode}`));
    const detail = screen.getByTestId('df-detail');
    expect(within(detail).getByTestId(`df-week-p90-${v.weeks[3]}`)).toHaveTextContent(formatNumber(range.bands[1].values[3]!));
  });

  it('X-05: the administrator’s extra quantile (P95) appears as a column, at or above P90', async () => {
    expect(
      hubSettingsStore.append({ key: 'engine.rangeExtraQuantilePct', value: 95, setBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' }, setAt: '2026-09-29T09:00:00+07:00' }),
    ).toBe(true);
    const v = await view();
    expect(v.range.levels).toEqual([0.5, 0.9, 0.95]);
    const total = v.range.total;
    total.bands[2].values.forEach((p95, i) => expect(p95!).toBeGreaterThanOrEqual(total.bands[1].values[i]!));
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const section = await screen.findByTestId('df-range');
    expect(within(section).getAllByText('P95').length).toBeGreaterThan(0);
    expect(within(section).getByTestId('df-range-level-total-p95')).toHaveTextContent(formatNumber(total.bands[2].values[0]!));
  });
});
