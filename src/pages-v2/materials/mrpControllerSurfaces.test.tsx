import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '../../test/test-utils';
import { mrpControllerStore } from '../../services/transitions/mrpControllerStore';
import { setMyMrpController } from '../../components/layout-v2/mrpControllerSeat';
import BuyerInventory from '../BuyerInventory';
import SupplierInventory from '../SupplierInventory';
import BuyerAlerts from '../BuyerAlerts';
import BuyerCallOffs from '../BuyerCallOffs';
import SupplierCallOffs from '../SupplierCallOffs';
import SupplierShipments from '../SupplierShipments';
import AdminMrpControllers from '../admin/AdminMrpControllers';

// ─────────────────────────────────────────────────────────────────────────────
// Material C4 · the MRP controller (PIC) on every material surface
// (MR-5 BR-02 to BR-04, AC-01 to AC-03), rendered through the real pages.
// ─────────────────────────────────────────────────────────────────────────────

const PACKAGING = 'Packaging planning desk (sample)';
const PLANNER = { ...BUYER, businessRoles: ['planning'] };

beforeEach(() => {
  mrpControllerStore.reset();
  setMyMrpController(null);
});
afterEach(() => setMyMrpController(null));

describe('AC-01 — every surface shows the controller, with the SAP liveness pill', () => {
  it('PTI inventory list: code and name, and the code alone for an unmapped code', async () => {
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    const unmapped = await screen.findByTestId('pti-stock-pic-sup-003-FR-WARD-4410');
    expect(unmapped.textContent).toBe('P13');
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/ }));
    const cell = await screen.findByTestId('pti-stock-pic-sup-007-PK-PETB-8801');
    expect(cell.textContent).toBe(`P12 · ${PACKAGING}`);
    // AR-19 — the header carries the materialMasterSap pill, never "Live".
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThan(0);
  });

  it('PTI alerts: a material alert names its controller', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: BUYER });
    const pic = await screen.findByTestId('alert-pic-coverage|PK-PETB-8802|sup-007');
    expect(pic.textContent).toBe(`P12 · ${PACKAGING}`);
  });

  it('PTI call-offs: each agreement line names its controller', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: BUYER });
    const pics = await screen.findAllByTestId(/^calloff-pic-/);
    expect(pics.some((p) => p.textContent === `P12 · ${PACKAGING}`)).toBe(true);
  });

  it('the inventory detail panel names the controller', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const open = (await screen.findAllByTestId(/^incoming-sup-007-/))[0];
    fireEvent.click(open);
    const panel = await screen.findByTestId('incoming-panel-pic');
    expect(panel.textContent).toContain(PACKAGING);
    expect(panel.textContent).not.toContain('P12');
  });
});

describe('AC-03 — a supplier sees the name, never the code', () => {
  it('supplier inventory', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const cell = await screen.findByTestId('sup-stock-pic-PK-PETB-8801');
    expect(cell.textContent).toBe(PACKAGING);
    expect(screen.queryByText('P12')).toBeNull();
  });

  it('supplier call-offs', async () => {
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    const cell = await screen.findByTestId('supplier-calloff-pic-co-0001');
    expect(cell.textContent).toBe(PACKAGING);
  });

  it('the ASN line', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const expanders = await screen.findAllByRole('button', { name: 'Expand' });
    expanders.forEach((b) => fireEvent.click(b));
    const cell = await screen.findByTestId('asn-line-pic-ASN-2025-00198-PK-ALCP-2450');
    expect(cell.textContent).toBe(PACKAGING);
    expect(cell.textContent).not.toContain('P12');
  });
});

describe('AC-02 — "My materials" for P12 shows only P12\'s materials', () => {
  it('inventory: the packaging list keeps P12 rows; the raw material list is empty', async () => {
    setMyMrpController('P12');
    renderWithProviders(<BuyerInventory />, { identity: BUYER, route: '/buyer/inventory?pic=mine' });
    // Raw material (the default tab) carries no P12 material.
    await screen.findByTestId('pic-filter');
    expect(screen.queryAllByTestId(/^pti-stock-row-/)).toHaveLength(0);
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/ }));
    const pics = await screen.findAllByTestId(/^pti-stock-pic-/);
    expect(pics.length).toBeGreaterThan(0);
    for (const p of pics) expect(p.textContent).toBe(`P12 · ${PACKAGING}`);
    expect(screen.getByTestId('pti-stock-row-sup-007-PK-PETB-8801')).toBeTruthy();
  });

  it('alerts: only P12 alerts remain, and a P10 alert is gone', async () => {
    setMyMrpController('P12');
    renderWithProviders(<BuyerAlerts />, { identity: BUYER, route: '/buyer/alerts?pic=mine' });
    const pics = await screen.findAllByTestId(/^alert-pic-/);
    for (const p of pics) expect(p.textContent).toBe(`P12 · ${PACKAGING}`);
    expect(screen.queryByTestId('alert-coverage|RM-STEAR-7300|sup-002')).toBeNull();
    // The capacity alert names no material, so it is not "mine" either.
    expect(screen.queryByTestId('alert-capacityBelowDemand|MG-20|sup-007')).toBeNull();
  });

  it('with no code chosen, "My materials" shows nothing and says why', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: BUYER, route: '/buyer/alerts?pic=mine' });
    expect(await screen.findByTestId('pic-filter-mine-unset')).toBeTruthy();
    expect(screen.queryAllByTestId(/^alert-pic-/)).toHaveLength(0);
  });

  it('choosing a code in the filter writes it to the page address and filters', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: BUYER, route: '/buyer/alerts' });
    const select = (await screen.findByTestId('pic-filter-select')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'P10' } });
    const pics = await screen.findAllByTestId(/^alert-pic-/);
    for (const p of pics) expect(p.textContent).toMatch(/^P10 · /);
    expect(select.value).toBe('P10');
  });
});

describe('Administration → MRP controllers (MR-5 BR-02)', () => {
  it('lists every code; an unmapped code says so', async () => {
    renderWithProviders(<AdminMrpControllers />, { identity: BUYER });
    const p12 = await screen.findByTestId('mrpc-row-P12');
    expect(within(p12).getByText(PACKAGING)).toBeTruthy();
    const p13 = screen.getByTestId('mrpc-row-P13');
    expect(within(p13).getByText('Not mapped (code only)')).toBeTruthy();
    expect(screen.getByTestId('mrpc-history-empty')).toBeTruthy();
  });

  it('a planner reads the list and gets the wait, not the form', async () => {
    renderWithProviders(<AdminMrpControllers />, { identity: PLANNER });
    expect(await screen.findByTestId('mrpc-gate')).toBeTruthy();
    expect(screen.queryByTestId('mrpc-form')).toBeNull();
    expect(screen.getByTestId('handoff-mrpcontroller-manage')).toBeTruthy();
    expect(screen.getByTestId('mrpc-row-P12')).toBeTruthy();
  });

  it('mapping P13 dispatches the verb and records the change; the submit waits for the shared rule', async () => {
    renderWithProviders(<AdminMrpControllers />, { identity: BUYER });
    fireEvent.click(await screen.findByTestId('mrpc-edit-P13'));
    const submit = screen.getByTestId('mrpc-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true); // no name, no user yet
    fireEvent.change(screen.getByTestId('mrpc-name'), { target: { value: 'Fragrance planning desk' } });
    expect(submit.disabled).toBe(true); // still no hub user (MRP_CONTROLLER_USERS_REQUIRED)
    fireEvent.change(screen.getByTestId('mrpc-users'), { target: { value: 'Material Planner, fragrance' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    const change = await screen.findByTestId('mrpc-change-P13');
    expect(within(change).getByText('Not attributed (no named person in session)')).toBeTruthy();
    expect(mrpControllerStore.get('P13')).toEqual({
      code: 'P13',
      name: 'Fragrance planning desk',
      userLabels: ['Material Planner, fragrance'],
    });
  });
});
