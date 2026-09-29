import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerModelBacktest from './BuyerModelBacktest';
import BuyerDemandForecast from './BuyerDemandForecast';
import { mockDataService } from '../services/data/mock/mockDataService';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import i18n from '../lib/i18n';
import { modelBacktestEn, modelBacktestId } from '../lib/i18n/modelBacktest';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-10 — the planner's Model backtest page. Figures are read back from
// the service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const view = async () => (await mockDataService.procurement.getModelBacktest(buyerScope))!;
const pct = (x: number) => `${Math.round(x * 1000) / 10}`;

// The backtest's heavy half runs once per hub date and is memoised by the
// service; warm it here so no single page test carries its cost.
beforeAll(async () => {
  await view();
}, 60_000);

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerModelBacktest — the planner page', () => {
  it('renders in the app shell with the SIMULATED engine pill, and says material planning stays on SAP’s plan (ENG-B66)', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const v = await view();
    expect(v.provenance.liveness).toBe('SIMULATED');
    expect(v.materialPlanningSource).toBe('sapPlan');
    expect(v.computedInMs).toBeGreaterThanOrEqual(0);
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    expect(await screen.findByRole('heading', { name: 'Model backtest' })).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('mb-not-switched')).toHaveTextContent('Material planning still runs on SAP’s plan');
    expect(screen.getByTestId('mb-main-not-built')).toBeInTheDocument();
    expect(screen.getByTestId('mb-decision-switch')).toHaveTextContent('Switch material planning to the engine forecast?');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('the headline and KPIs are the service’s counts: engine vs SAP’s plan on fill rate and space', async () => {
    const v = await view();
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    await screen.findByTestId('mb-kpis');
    const s = v.summary;
    expect(screen.getByTestId('mb-kpi-skus')).toHaveTextContent(String(s.skusCompared));
    expect(screen.getByTestId('mb-kpi-beats')).toHaveTextContent(`${s.chosenBeatsSap} of ${s.skusCompared}`);
    expect(screen.getByTestId('mb-kpi-materials')).toHaveTextContent(`${s.materialsChosenBeatsSap} of ${s.materialsCompared}`);
    expect(screen.getByTestId('mb-headline-skus')).toHaveTextContent(
      `beats SAP’s plan on both fill rate and warehouse space for ${s.chosenBeatsSap} of ${s.skusCompared} SKUs`,
    );
    for (const p of v.portfolio) expect(screen.getByTestId(`mb-portfolio-fill-${p.scenario}`)).toHaveTextContent(pct(p.fillRate!));
  });

  it('every compared SKU shows its chosen model and each candidate’s fill rate; SAP’s plan is a column, never a choice', async () => {
    const v = await view();
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    await screen.findByTestId('mb-skus');
    for (const s of v.skus) {
      expect(screen.getByTestId(`mb-chosen-${s.skuCode}`)).toHaveTextContent(modelBacktestEn[`mb.candidate.${s.selection.chosen}`]);
      expect(screen.getByTestId(`mb-vs-${s.skuCode}`)).toHaveTextContent(modelBacktestEn[`mb.vs.${s.chosenVersusSap}`]);
      for (const c of s.scores) expect(screen.getByTestId(`mb-score-${s.skuCode}-${c.candidate}`)).toHaveTextContent(pct(c.fillRate!));
    }
    for (const m of v.methods) if (m.candidate !== 'sapPlan') expect(screen.getByTestId(`mb-method-chosen-${m.candidate}`)).toHaveTextContent(String(m.chosenFor));
  });

  it('selecting a SKU shows its candidates with accuracy and bias as diagnostics, and its materials', async () => {
    const v = await view();
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    await screen.findByTestId('mb-skus');
    const pick = v.skus[v.skus.length - 1];
    fireEvent.click(screen.getByTestId(`mb-sku-${pick.skuCode}`));
    const detail = screen.getByTestId('mb-detail');
    expect(within(detail).getByRole('heading', { level: 2 })).toHaveTextContent(pick.skuCode);
    expect(within(detail).getByTestId('mb-detail-sapPlan')).toHaveTextContent('Benchmark, not chosen');
    expect(within(detail).getByTestId(`mb-detail-${pick.selection.chosen}`)).toHaveTextContent('Chosen');
    expect(within(detail).getByTestId('mb-detail-materials')).toHaveTextContent(pick.materials[0]);
  });

  it('origins name their events; the materials filter by warehouse', async () => {
    const v = await view();
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    await screen.findByTestId('mb-origins');
    expect(screen.getByTestId('mb-origin-events-2025-10-27')).toHaveTextContent('Double-date (incl. 11.11)');
    expect(screen.getByTestId('mb-origin-events-2026-02-16')).toHaveTextContent('Ramadan 1447 H');
    const section = screen.getByTestId('mb-materials');
    fireEvent.click(within(section).getByRole('radio', { name: /^Raw material/ }));
    for (const m of v.materials) {
      if (m.kind === 'rawMaterial') expect(screen.getByTestId(`mb-material-${m.materialCode}`)).toBeInTheDocument();
      else expect(screen.queryByTestId(`mb-material-${m.materialCode}`)).toBeNull();
    }
  });

  it('ENG-D13: the MASC spread is shown and the limit reads “not set” (not enforced)', async () => {
    const v = await view();
    expect(v.mascLimit).toBeNull();
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    await screen.findByTestId('mb-masc');
    expect(screen.getByTestId('mb-kpi-limit')).toHaveTextContent('Not set');
    expect(screen.getByTestId('mb-masc-limit')).toHaveTextContent('Limit: not set');
    for (const m of v.mascSpread) expect(screen.getByTestId(`mb-masc-${m.candidate}`)).toBeInTheDocument();
  });

  it('a supplier gets nothing (X-03)', async () => {
    expect(await mockDataService.procurement.getModelBacktest(supplierScope)).toBeNull();
  });

  it('the Demand forecast page links here', async () => {
    renderWithProviders(<BuyerDemandForecast />, { identity: BUYER, route: '/buyer/demand-forecast' });
    const link = within(await screen.findByTestId('df-backtest-link')).getByRole('link');
    expect(link.getAttribute('href')).toMatch(/\/buyer\/model-backtest$/);
  });

  it('every string exists in EN and ID, and the page renders in Indonesian', async () => {
    expect(Object.keys(modelBacktestId).sort()).toEqual(Object.keys(modelBacktestEn).sort());
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerModelBacktest />, { identity: BUYER, route: '/buyer/model-backtest' });
    expect(await screen.findByRole('heading', { name: 'Backtest model' })).toBeInTheDocument();
    expect(screen.getByTestId('mb-not-switched')).toHaveTextContent('Perencanaan material masih berjalan dengan rencana SAP');
  });
});
