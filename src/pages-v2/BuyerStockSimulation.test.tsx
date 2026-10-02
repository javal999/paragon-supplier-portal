// ─────────────────────────────────────────────────────────────────────────────
// Material E2 — the stock simulation page (MR-7 section e; AC-01 to AC-03,
// AC-06): the worked-example row in separate cells, a planner input shown
// with its label and who, the filters kept in the address across a reload,
// "Create call-off" / "Create PO request" opening their forms pre-filled, and
// the stock visibility page still carrying no available figure.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import type { CurrentIdentity } from '@context/CurrentIdentityContext';
import type { ActorAttribution } from '@lib/enforcement';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { simulationOverrideStore } from '@services/data/mock/stores/simulationOverrideStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { sdcClock } from '@services/sdc';
import { stockSimulationEn, stockSimulationId } from '@lib/i18n/stockSimulation';
import BuyerStockSimulation from './BuyerStockSimulation';
import BuyerCallOffs from './BuyerCallOffs';
import BuyerRequisitions from './BuyerRequisitions';
import BuyerInventory from './BuyerInventory';

/** Only a test can name a person (F1): the product's actor is always UNATTRIBUTED. */
const RINA: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'usr-021', displayName: 'Rina Wijaya' } };
const PLANNER: CurrentIdentity = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer, actor: RINA };
const SAMPLE = 'sup-004-FR-WARD-4410';
const PET = 'sup-007-PK-PETB-8801';

beforeEach(() => {
  simulationOverrideStore.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  sdcClock.reset();
});

/** Shows the address the page is at, so a test can "reload" onto it. */
const Where: React.FC = () => {
  const l = useLocation();
  return <output data-testid="where">{`${l.pathname}${l.search}`}</output>;
};

const app = (
  <>
    <Routes>
      <Route path="/buyer/stock-simulation" element={<BuyerStockSimulation />} />
      <Route path="/buyer/call-offs" element={<BuyerCallOffs />} />
      <Route path="/buyer/purchase-requisition" element={<BuyerRequisitions />} />
    </Routes>
    <Where />
  </>
);

describe('Stock simulation page (MR-7 section e)', () => {
  it('AC-01/AC-02 — the worked-example row shows 8,300 · 3,000 · 5,300 · 1,200 in separate cells, never summed', async () => {
    renderWithProviders(<BuyerStockSimulation />, { identity: PLANNER, route: '/buyer/stock-simulation' });
    const row = await screen.findByTestId(`sim-row-${SAMPLE}`);
    expect(within(row).getByTestId(`sim-sample-${SAMPLE}`)).toHaveTextContent(stockSimulationEn['sim.sample']);
    expect(screen.getByTestId(`sim-available-${SAMPLE}`)).toHaveTextContent(/^8,300 KG$/);
    expect(screen.getByTestId(`sim-calledoff-${SAMPLE}`)).toHaveTextContent(/^3,000 KG$/);
    expect(screen.getByTestId(`sim-free-${SAMPLE}`)).toHaveTextContent(/^5,300 KG$/);
    expect(screen.getByTestId(`sim-pti-${SAMPLE}`)).toHaveTextContent(/^1,200 KG$/);
    // BR-02 — never added: no cell carries 8,300 + 1,200.
    expect(within(row).queryByText(/9,500/)).toBeNull();
    expect(within(screen.getByTestId(`sim-flags-${SAMPLE}`)).getByText('Capped by capacity')).toBeInTheDocument();
    // Step 4 — the row opens its 13 weekly buckets.
    fireEvent.click(screen.getByTestId(`sim-toggle-${SAMPLE}`));
    const weeks = await screen.findByTestId(`sim-detail-${SAMPLE}-weeks`);
    expect(within(weeks).getAllByRole('row')).toHaveLength(14);
    expect(within(weeks).getByText('Production finishes')).toBeInTheDocument();
  });

  it('AC-03 — a planner input is dispatched from the inline form and shows "Planner input · <who> · <when>"', async () => {
    renderWithProviders(<BuyerStockSimulation />, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    fireEvent.click(await screen.findByTestId(`sim-input-open-${SAMPLE}-soh`));
    const form = await screen.findByTestId(`sim-input-${SAMPLE}-soh-form`);
    fireEvent.change(within(form).getByLabelText('Quantity (KG)'), { target: { value: '6000' } });
    fireEvent.click(within(form).getByTestId(`sim-input-${SAMPLE}-soh-save`));
    const label = await screen.findByTestId(`sim-input-label-${SAMPLE}`);
    expect(label).toHaveTextContent(/^Planner input · Rina Wijaya · /);
    expect(simulationOverrideStore.all()).toMatchObject([{ supplierId: 'sup-004', materialCode: 'FR-WARD-4410', field: 'soh', value: 6000, enteredBy: RINA }]);
    await waitFor(() => expect(screen.getByTestId(`sim-available-${SAMPLE}`)).toHaveTextContent(/^9,300 KG/));
    expect(within(screen.getByTestId(`sim-row-${SAMPLE}`)).getByText('Includes planner input')).toBeInTheDocument();
  });

  it('the page pre-checks with the verb\'s rule: a bad input is refused by name and nothing is stored', async () => {
    renderWithProviders(<BuyerStockSimulation />, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    fireEvent.click(await screen.findByTestId(`sim-input-open-${SAMPLE}-inProduction`));
    const form = await screen.findByTestId(`sim-input-${SAMPLE}-inProduction-form`);
    fireEvent.change(within(form).getByLabelText('Quantity (KG)'), { target: { value: '1000' } });
    fireEvent.click(within(form).getByTestId(`sim-input-${SAMPLE}-inProduction-save`));
    expect(await within(form).findByTestId(`sim-input-${SAMPLE}-inProduction-refusal`)).toHaveTextContent('Enter the date.');
    expect(simulationOverrideStore.all()).toEqual([]);
  });

  it('a seat without `inventory:simulate` sees the handoff, not the input', async () => {
    const procurement: CurrentIdentity = { ...BUYER, businessRoles: ['procurement'] };
    renderWithProviders(<BuyerStockSimulation />, { identity: procurement, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    expect(await screen.findByTestId('handoff-stock-simulation-input')).toBeInTheDocument();
    expect(screen.queryByTestId(`sim-input-open-${SAMPLE}-soh`)).toBeNull();
  });

  it('the check date and the filters are kept in the address and survive a reload', async () => {
    const first = renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    await screen.findByTestId(`sim-row-${SAMPLE}`);
    fireEvent.change(screen.getByTestId('sim-date'), { target: { value: '2026-09-01' } });
    fireEvent.change(await screen.findByTestId('sim-supplier'), { target: { value: 'sup-007' } });
    await waitFor(() => expect(screen.queryByTestId(`sim-row-${SAMPLE}`)).toBeNull());
    const address = screen.getByTestId('where').textContent ?? '';
    expect(address).toContain('date=2026-09-01');
    expect(address).toContain('supplier=sup-007');
    first.unmount();

    renderWithProviders(app, { identity: PLANNER, route: address });
    await screen.findByTestId(`sim-row-${PET}`);
    expect(screen.getByTestId('sim-date')).toHaveValue('2026-09-01');
    expect(screen.getByTestId('sim-supplier')).toHaveValue('sup-007');
    expect(screen.queryByTestId(`sim-row-${SAMPLE}`)).toBeNull();
  });

  it('"Create call-off" opens the new call-off form on the supplier\'s agreement line for the material; nothing is created', async () => {
    const before = callOffStore.all().length;
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-calloff-${PET}`));
    const dialog = await screen.findByRole('dialog');
    const poNumber = /New call-off on (\S+)/.exec(within(dialog).getByRole('heading').textContent ?? '')?.[1];
    const po = purchaseOrderStore.all().find((p) => p.poNumber === poNumber)!;
    expect(po.supplierId).toBe('sup-007');
    expect(po.lineItems.some((l) => l.materialCode === 'PK-PETB-8801')).toBe(true);
    expect(within(dialog).getByTestId('calloff-new-remaining')).toBeInTheDocument();
    // The prefill params are consumed (removed from the address) once. React
    // Router 7 applies `setSearchParams` inside a React transition, so the
    // cleaned address lands a tick after the dialog opens — wait for it.
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/buyer\/call-offs$/));
    expect(callOffStore.all()).toHaveLength(before);
  });

  it('"Create call-off" for a pair with no agreement line says so instead of opening a form', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-calloff-${SAMPLE}`));
    expect(await screen.findByTestId('calloff-prefill-no-line')).toHaveTextContent('FR-WARD-4410');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Create PO request" opens the New PR form with the material and a note naming the supplier', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-po-${PET}`));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('PK-PETB-8801')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(/PT Sample Packaging Indonesia/)).toBeInTheDocument();
  });

  it('a supplier seat reads no rows (the simulation is PTI\'s estimate)', async () => {
    renderWithProviders(<BuyerStockSimulation />, { identity: SUPPLIER, route: '/buyer/stock-simulation' });
    expect(await screen.findByTestId('sim-empty')).toBeInTheDocument();
  });

  it('every string exists in EN and ID', () => {
    expect(Object.keys(stockSimulationId).sort()).toEqual(Object.keys(stockSimulationEn).sort());
  });
});

describe('AC-06 — the stock visibility page still shows no available figure (REQ-E08-01 BR-01)', () => {
  it('BuyerInventory has no available column and no free-to-call-off figure', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER, route: '/buyer/inventory' });
    const headers = (await screen.findAllByRole('columnheader')).map((h) => h.textContent ?? '');
    expect(headers.length).toBeGreaterThan(5);
    expect(headers.some((h) => /available|free to call off/i.test(h))).toBe(false);
    expect(screen.queryByText(/available/i)).toBeNull();
  });
});
