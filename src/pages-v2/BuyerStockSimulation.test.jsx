// ─────────────────────────────────────────────────────────────────────────────
// Material E2 — the stock simulation page (MR-7 section e; AC-01 to AC-03,
// AC-06): the worked-example row in separate cells, a planner input shown
// with its label and who, the filters kept in the address across a reload,
// "Create call-off" / "Create PO request" opening their forms pre-filled, and
// the stock visibility page still carrying no available figure.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { ActorAttribution } from '@lib/enforcement' */
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

/**
 * Only a test can name a person (F1): the product's actor is always UNATTRIBUTED.
 * @type {ActorAttribution}
 */
const RINA = { kind: 'RESOLVED', person: { personId: 'usr-021', displayName: 'Rina Wijaya' } };
/** @type {CurrentIdentity} */
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer, actor: RINA };
const SAMPLE = 'sup-004-FR-WARD-4410';
const PET = 'sup-007-PK-PETB-8801';
const CASE2 = 'sup-002-RM-EMUL-9430';
const CASE3 = 'sup-007-PK-CART-9910';
/** P-06 — a pair with an agreement line (PO-2025-00102, 6,000 KG left) and free stock. */
const EMUL = 'sup-002-RM-EMUL-9410';
/** P-05 / P-06 — over-called (−121,000 PCS) and no agreement line. */
const PET2 = 'sup-007-PK-PETB-8802';
/** P-06 — free stock but no agreement line. */
const CART = 'sup-008-PK-CART-9901';

beforeEach(() => {
  simulationOverrideStore.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  sdcClock.reset();
});

/**
 * Shows the address the page is at, so a test can "reload" onto it.
 * @type {React.FC}
 */
const Where = () => {
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
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    const row = await screen.findByTestId(`sim-row-${SAMPLE}`);
    expect(within(row).getByTestId(`sim-sample-${SAMPLE}`)).toHaveTextContent(
      stockSimulationEn['sim.sample']
    );
    expect(screen.getByTestId(`sim-available-${SAMPLE}`)).toHaveTextContent(/^8,300 KG$/);
    expect(screen.getByTestId(`sim-calledoff-${SAMPLE}`)).toHaveTextContent(/^3,000 KG$/);
    expect(screen.getByTestId(`sim-free-${SAMPLE}`)).toHaveTextContent(/^5,300 KG$/);
    expect(screen.getByTestId(`sim-pti-${SAMPLE}`)).toHaveTextContent(/^1,200 KG$/);
    // BR-02 — never added: no cell carries 8,300 + 1,200.
    expect(within(row).queryByText(/9,500/)).toBeNull();
    expect(
      within(screen.getByTestId(`sim-flags-${SAMPLE}`)).getByText('Capped by capacity')
    ).toBeInTheDocument();
    // Step 4 — the row opens its 13 weekly buckets.
    fireEvent.click(screen.getByTestId(`sim-toggle-${SAMPLE}`));
    const weeks = await screen.findByTestId(`sim-detail-${SAMPLE}-weeks`);
    expect(within(weeks).getAllByRole('row')).toHaveLength(14);
    expect(within(weeks).getByText('Production finishes')).toBeInTheDocument();
  });

  it('walkthrough case 2 is its own labelled sample row: 1,700 · 2,500 · −800 · 1,500', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation?date=2026-09-01'
    });
    const row = await screen.findByTestId(`sim-row-${CASE2}`);
    expect(within(row).getByTestId(`sim-sample-${CASE2}`)).toHaveTextContent(
      stockSimulationEn['sim.sampleCase2']
    );
    expect(screen.getByTestId(`sim-available-${CASE2}`)).toHaveTextContent(/^1,700 KG$/);
    expect(screen.getByTestId(`sim-calledoff-${CASE2}`)).toHaveTextContent(/^2,500 KG$/);
    // P-05 — a negative free figure reads as a state, not as "−800 KG".
    expect(screen.getByTestId(`sim-free-${CASE2}`)).toHaveTextContent(/^Over-called by 800 KG$/);
    expect(screen.getByTestId(`sim-pti-${CASE2}`)).toHaveTextContent(/^1,500 KG$/);
  });

  it('walkthrough case 3 is its own labelled sample row: 7,000 · 10,000 · −3,000 · 15,000, production date missing', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation?date=2026-09-01'
    });
    const row = await screen.findByTestId(`sim-row-${CASE3}`);
    expect(within(row).getByTestId(`sim-sample-${CASE3}`)).toHaveTextContent(
      stockSimulationEn['sim.sampleCase3']
    );
    expect(screen.getByTestId(`sim-available-${CASE3}`)).toHaveTextContent(/^7,000 PCS$/);
    expect(screen.getByTestId(`sim-calledoff-${CASE3}`)).toHaveTextContent(/^10,000 PCS$/);
    expect(screen.getByTestId(`sim-free-${CASE3}`)).toHaveTextContent(/^Over-called by 3,000 PCS$/);
    expect(screen.getByTestId(`sim-pti-${CASE3}`)).toHaveTextContent(/^15,000 PCS$/);
    expect(
      within(screen.getByTestId(`sim-flags-${CASE3}`)).getByText(
        stockSimulationEn['sim.flag.productionDateMissing']
      )
    ).toBeInTheDocument();
  });

  it('AC-03 — a planner input is dispatched from the inline form and shows "Planner input · <who> · <when>"', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    fireEvent.click(await screen.findByTestId(`sim-input-open-${SAMPLE}-soh`));
    const form = await screen.findByTestId(`sim-input-${SAMPLE}-soh-form`);
    fireEvent.change(within(form).getByLabelText('Quantity (KG)'), { target: { value: '6000' } });
    fireEvent.click(within(form).getByTestId(`sim-input-${SAMPLE}-soh-save`));
    const label = await screen.findByTestId(`sim-input-label-${SAMPLE}`);
    expect(label).toHaveTextContent(/^Planner input · Rina Wijaya · /);
    expect(simulationOverrideStore.all()).toMatchObject([
      {
        supplierId: 'sup-004',
        materialCode: 'FR-WARD-4410',
        field: 'soh',
        value: 6000,
        enteredBy: RINA
      }
    ]);
    await waitFor(() =>
      expect(screen.getByTestId(`sim-available-${SAMPLE}`)).toHaveTextContent(/^9,300 KG/)
    );
    expect(
      within(screen.getByTestId(`sim-row-${SAMPLE}`)).getByText('Includes planner input')
    ).toBeInTheDocument();
  });

  it("the page pre-checks with the verb's rule: a bad input is refused by name and nothing is stored", async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    fireEvent.click(await screen.findByTestId(`sim-toggle-${SAMPLE}`));
    fireEvent.click(await screen.findByTestId(`sim-input-open-${SAMPLE}-inProduction`));
    const form = await screen.findByTestId(`sim-input-${SAMPLE}-inProduction-form`);
    fireEvent.change(within(form).getByLabelText('Quantity (KG)'), { target: { value: '1000' } });
    fireEvent.click(within(form).getByTestId(`sim-input-${SAMPLE}-inProduction-save`));
    expect(
      await within(form).findByTestId(`sim-input-${SAMPLE}-inProduction-refusal`)
    ).toHaveTextContent('Enter the date.');
    expect(simulationOverrideStore.all()).toEqual([]);
  });

  it('a seat without `inventory:simulate` sees the handoff, not the input', async () => {
    /** @type {CurrentIdentity} */
    const procurement = { ...BUYER, businessRoles: ['procurement'] };
    renderWithProviders(<BuyerStockSimulation />, {
      identity: procurement,
      route: '/buyer/stock-simulation'
    });
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

  it('"Create call-off" (P-06: line exists) shows what is left on the line and opens the form on it; nothing is created', async () => {
    const before = callOffStore.all().length;
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    await screen.findByTestId(`sim-row-${EMUL}`);
    expect(screen.getByTestId(`sim-line-${EMUL}`)).toHaveTextContent(
      '6,000 KG left on PO-2025-00102'
    );
    expect(screen.queryByTestId(`sim-noline-${EMUL}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`sim-calloff-${EMUL}`));
    const dialog = await screen.findByRole('dialog');
    const poNumber = /New call-off on (\S+)/.exec(
      within(dialog).getByRole('heading').textContent ?? ''
    )?.[1];
    expect(poNumber).toBe('PO-2025-00102');
    const po = /** @type {import('@services/data/types').PurchaseOrder} */ (
      purchaseOrderStore.all().find((p) => p.poNumber === poNumber)
    );
    expect(po.supplierId).toBe('sup-002');
    expect(po.lineItems.some((l) => l.materialCode === 'RM-EMUL-9410')).toBe(true);
    expect(within(dialog).getByTestId('calloff-new-remaining')).toBeInTheDocument();
    // The prefill params are consumed (removed from the address) once. React
    // Router 7 applies `setSearchParams` inside a React transition, so the
    // cleaned address lands a tick after the dialog opens — wait for it.
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/buyer\/call-offs$/)
    );
    expect(callOffStore.all()).toHaveLength(before);
  });

  it('P-06 — no agreement line: no "Create call-off"; "Create PO request" is the outline action with a grey "No agreement line"', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    await screen.findByTestId(`sim-row-${CART}`);
    expect(screen.queryByTestId(`sim-calloff-${CART}`)).toBeNull();
    expect(screen.getByTestId(`sim-po-${CART}`).className).toMatch(/border-action/);
    expect(screen.getByTestId(`sim-noline-${CART}`)).toHaveTextContent(
      stockSimulationEn['sim.action.noLine']
    );
    // The sample row's pair has no line either.
    expect(screen.queryByTestId(`sim-calloff-${SAMPLE}`)).toBeNull();
    expect(screen.getByTestId(`sim-noline-${SAMPLE}`)).toBeInTheDocument();
  });

  it('P-05 — an over-called row reads "Over-called by N", flags what it means, and offers "Create PO request" only', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    await screen.findByTestId(`sim-row-${PET2}`);
    expect(screen.getByTestId(`sim-free-${PET2}`)).toHaveTextContent(
      /^Over-called by 121,000 PCS$/
    );
    expect(screen.getByTestId(`sim-free-${PET2}`).querySelector('.text-danger')).not.toBeNull();
    expect(screen.getByTestId(`sim-overcalled-${PET2}`)).toHaveTextContent(
      stockSimulationEn['sim.overCalledMeans']
    );
    // Over-called with an agreement line (PK-PETB-8801 has 70,000 left on a line):
    // still no call-off, and no "no line" note — the flag is the reason.
    expect(screen.queryByTestId(`sim-calloff-${PET2}`)).toBeNull();
    expect(screen.queryByTestId(`sim-calloff-${PET}`)).toBeNull();
    expect(screen.getByTestId(`sim-overcalled-${PET}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`sim-noline-${PET}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`sim-po-${PET2}`));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('PK-PETB-8802')).toBeInTheDocument();
  });

  it('P-05 / INV-D9 — an over-called row offers "Ask supplier" for a production date beside "Create PO request"; a row with free stock does not', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    await screen.findByTestId(`sim-row-${PET}`);
    const ask = screen.getByTestId(`sim-ask-${PET}`);
    expect(ask).toHaveAttribute('data-topic', 'productionDate');
    expect(ask).toHaveTextContent(stockSimulationEn['sim.action.askProductionDate']);
    expect(screen.getByTestId(`sim-po-${PET}`)).toBeInTheDocument();
    // PK-PETB-8802 already has an open ask (seeded): the control shows it instead.
    expect(await screen.findByTestId(`sim-ask-${PET2}-existing`)).toBeInTheDocument();
    expect(screen.queryByTestId(`sim-ask-${EMUL}`)).toBeNull();
    expect(screen.queryByTestId(`sim-ask-${CART}`)).toBeNull();
    // The dialog opens on the topic; the click does not open the row's detail.
    fireEvent.click(within(ask).getByTestId(`sim-ask-${PET}-open`));
    expect(await screen.findByTestId(`sim-ask-${PET}-topic`)).toHaveValue('productionDate');
    expect(screen.queryByTestId(`sim-detail-${PET}`)).toBeNull();
  });

  it('P-05 — zero and positive free figures read as figures, with no over-called flag', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    await screen.findByTestId(`sim-row-${EMUL}`);
    expect(screen.getByTestId(`sim-free-${EMUL}`)).toHaveTextContent(/^1,200 KG$/);
    expect(screen.queryByTestId(`sim-overcalled-${EMUL}`)).toBeNull();
  });

  it('P-09 / INV-D7 — dispatched call-offs with no ASN count as shipped: listed once, under "In transit to PTI", marked "Dispatched, no ASN yet"', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    await screen.findByTestId(`sim-row-${PET}`);
    // CO-2026-0002 (15,000) and CO-2026-0005 (10,500) left "not shipped": 193,100 − 25,500.
    expect(screen.getByTestId(`sim-calledoff-${PET}`)).toHaveTextContent(/^167,600 PCS$/);
    expect(screen.getByTestId(`sim-pti-${PET}`)).toHaveTextContent(/^25,500 PCS$/);
    fireEvent.click(screen.getByTestId(`sim-toggle-${PET}`));
    const detail = await screen.findByTestId(`sim-detail-${PET}`);
    const lines = within(detail)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    for (const ref of ['CO-2026-0002', 'CO-2026-0005']) {
      const mine = lines.filter((l) => l.includes(ref));
      expect(mine).toHaveLength(1);
      expect(mine[0]).toMatch(/^In transit to PTI/);
      expect(mine[0]).toContain(stockSimulationEn['sim.event.dispatchOnly']);
    }
  });

  it('"Create PO request" opens the New PR form with the material and a note naming the supplier', async () => {
    renderWithProviders(app, { identity: PLANNER, route: '/buyer/stock-simulation' });
    fireEvent.click(await screen.findByTestId(`sim-po-${PET}`));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('PK-PETB-8801')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(/PT Sample Packaging Indonesia/)).toBeInTheDocument();
  });

  it("a supplier seat reads no rows (the simulation is PTI's estimate)", async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: SUPPLIER,
      route: '/buyer/stock-simulation'
    });
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
