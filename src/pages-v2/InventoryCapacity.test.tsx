// ─────────────────────────────────────────────────────────────────────────────
// Inventory & capacity on the screens (REQ-E08-01 to REQ-E08-05): the PTI and
// supplier Stock pages, supplier access, capacity on both sides, alerts, the
// menu and the Home tasks. Every walk that acts ends in the STORE or the READ.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { PTI_NAV, SUPPLIER_NAV } from '../components/layout-v2/navConfig';
import { inventoryCapacityEn, inventoryCapacityId } from '../lib/i18n/inventoryCapacity';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore,
} from '../services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '../services/sdc';
import BuyerInventory from './BuyerInventory';
import SupplierInventory from './SupplierInventory';
import BuyerSupplierAccess from './BuyerSupplierAccess';
import SupplierCapacity from './SupplierCapacity';
import BuyerCapacity from './BuyerCapacity';
import BuyerAlerts from './BuyerAlerts';
import BuyerHome from './BuyerHome';
import SupplierHome from './SupplierHome';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  stockAccessStore.reset();
  capacityStore.reset();
  stockSyncStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const SUP_002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};
const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

describe('menu and copy (section 3.7)', () => {
  it('PTI Inventory & capacity: Inventory, Capacity, Alerts, Supplier access; supplier Planning adds Capacity', () => {
    const inventory = PTI_NAV.find((s) => s.id === 'inventory')!;
    expect(inventory.items.map((i) => i.path)).toEqual(['/buyer/inventory', '/buyer/capacity', '/buyer/alerts', '/buyer/supplier-access']);
    const planning = SUPPLIER_NAV.find((s) => s.id === 'planning')!;
    expect(planning.items.map((i) => i.path)).toEqual(['/supplier/forecasts', '/supplier/inventory', '/supplier/capacity']);
  });

  it('every new string exists in EN and ID', () => {
    expect(Object.keys(inventoryCapacityId).sort()).toEqual(Object.keys(inventoryCapacityEn).sort());
  });
});

describe('PTI Inventory (REQ-E08-01)', () => {
  it('shows supplier SOH, PTI SOH and ROP, supplier ROP ("Not provided"), incoming split, band and stale flag — and no available stock', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    const stear = await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    expect(stear).toHaveTextContent('4,200 KG');
    expect(stear).toHaveTextContent('900 KG');
    expect(stear).toHaveTextContent('2,500 KG');
    expect(stear).toHaveTextContent('5,000 KG');
    expect(within(stear).getByText(/10 days · Critical/)).toBeInTheDocument();
    expect(stear).toHaveTextContent(/In production\s*6,000/);
    const glycerin = screen.getByTestId('pti-stock-row-sup-002-RM-EMUL-3310');
    expect(glycerin).toHaveTextContent('Not provided');
    expect(within(glycerin).getByText('Out of date')).toBeInTheDocument();
    expect(screen.queryByText(/available/i)).toBeNull();
  });

  it('raw material and packaging are separate views (BR-07)', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    expect(screen.queryByTestId('pti-stock-row-sup-007-PK-PETB-8801')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/ }));
    expect(await screen.findByTestId('pti-stock-row-sup-007-PK-PETB-8801')).toBeInTheDocument();
    expect(screen.queryByTestId('pti-stock-row-sup-002-RM-STEAR-7300')).toBeNull();
  });

  it('the incoming figure opens the per-date detail linked to call-offs (AC-04)', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    fireEvent.click(screen.getByRole('tab', { name: /Packaging/ }));
    fireEvent.click(await screen.findByTestId('incoming-sup-007-PK-PETB-8801'));
    const detail = panel().getByTestId('incoming-panel');
    expect(within(detail).getByRole('link', { name: 'CO-2026-0002' })).toHaveAttribute('href', '/buyer/call-offs');
    expect(detail).toHaveTextContent('In production');
  });

  it('Sync: a connected supplier refreshes; a failing one shows the error and keeps figures out of date', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    expect(await screen.findByTestId('api-sync-error-sup-003')).toHaveTextContent('the supplier system did not respond');
    fireEvent.click(screen.getByRole('button', { name: 'Sync stock from PT Sample Oleochemicals' }));
    await waitFor(() => expect(stockSyncStore.all().some((a) => a.supplierId === 'sup-001' && a.outcome === 'success')).toBe(true));
    expect(inventoryDeclarationStore.latestFor('sup-001', 'RM-LAURIC-7200')).toMatchObject({ totalQty: 9000, channel: 'api' });
  });

  it('PTI records stock a supplier sent by WhatsApp: saved as "Entered by PTI"', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    fireEvent.click(await screen.findByTestId('stock-record-open'));
    fireEvent.change(panel().getByLabelText('Supplier'), { target: { value: 'sup-007' } });
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: 'PK-CAPF-8820' } });
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '42000' } });
    fireEvent.click(panel().getByTestId('stock-entry-submit'));
    await waitFor(() => expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-CAPF-8820')).toMatchObject({ totalQty: 42000, channel: 'pti' }));
  });
});

describe('Supplier Stock (REQ-E08-01 SUP, REQ-E08-02, REQ-E08-03)', () => {
  it('sup-007 sees its own materials; PTI stock only on the 2 materials PTI shares', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const bottle = await screen.findByTestId('sup-stock-row-PK-PETB-8801');
    expect(bottle).toHaveTextContent('30,000 PCS'); // PTI stock
    expect(screen.getByRole('columnheader', { name: 'PTI stock' })).toBeInTheDocument();
    expect(screen.getByTestId('sup-stock-row-PK-CAPF-8820')).toHaveTextContent('Not shared');
    expect(screen.getByTestId('sup-pti-access-note')).toHaveTextContent('2 of your materials');
    expect(screen.getByTestId('sup-stock-row-PK-PETB-8810')).toHaveTextContent('Out of date');
    expect(screen.queryByText('PT Sample Specialty Fats')).toBeNull();
  });

  it('a supplier without access has no PTI stock column at all (AC-01)', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUP_002 });
    await screen.findByTestId('sup-stock-row-RM-STEAR-7300');
    expect(screen.queryByRole('columnheader', { name: 'PTI stock' })).toBeNull();
    expect(screen.queryByText('900 KG')).toBeNull();
  });

  it('uploaded template rows are checked one by one: valid rows saved, invalid rows listed with row and reason', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('stock-upload');
    const csv = [
      'Material code,Stock on hand,Unit,Supplier reorder point,In-production quantity,Expected production completion date (YYYY-MM-DD),Batch number,Batch quantity,Expiry date (YYYY-MM-DD)',
      'PK-CAPF-8820,50000,PCS,20000,,,,,',
      'RM-STEAR-7300,10,KG,,,,,,',
      'PK-PETB-8802,1.500,PCS,,,,,,',
    ].join('\n');
    const file = new File([csv], 'stock.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByTestId('stock-upload-file'), { target: { files: [file] } });
    const result = await screen.findByTestId('stock-upload-result');
    expect(within(result).getByTestId('stock-upload-saved')).toHaveTextContent('Materials saved: 1');
    expect(within(result).getByTestId('stock-upload-refused-row-3')).toHaveTextContent('This material is not assigned to you');
    expect(within(result).getByTestId('stock-upload-refused-row-4')).toHaveTextContent('can be read two ways');
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-CAPF-8820')).toMatchObject({ totalQty: 50000, supplierRop: 20000, channel: 'template' });
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8802')!.totalQty).toBe(22000);
  });

  it('manual entry: batches must add up to SOH before Save is offered', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('stock-entry-open'));
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: 'PK-PETB-8810' } });
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '1000' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'B-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '900' } });
    expect(panel().getByTestId('stock-entry-batch-mismatch')).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '1000' } });
    fireEvent.click(panel().getByTestId('stock-entry-submit'));
    await waitFor(() => expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8810')).toMatchObject({ totalQty: 1000, channel: 'manual' }));
  });
});

describe('Supplier access (REQ-E08-03)', () => {
  it('grant access to chosen materials, logged; the supplier then sees PTI stock for them', async () => {
    renderWithProviders(<BuyerSupplierAccess />, { identity: PLANNER });
    expect(await screen.findByTestId('access-row-sup-007')).toHaveTextContent('Materials: 2');
    fireEvent.click(screen.getByRole('button', { name: 'Access to PTI stock for PT Sample Specialty Fats' }));
    fireEvent.click(panel().getByRole('checkbox', { name: /RM-STEAR-7300/ }));
    fireEvent.click(panel().getByTestId('access-grant'));
    await waitFor(() => expect(stockAccessStore.get('sup-002')).toMatchObject({ active: true, materials: ['RM-STEAR-7300'] }));
    await waitFor(() => expect(screen.getAllByTestId('access-log-entry')).toHaveLength(2));
  });

  it('remove access: the change is logged', async () => {
    renderWithProviders(<BuyerSupplierAccess />, { identity: PLANNER });
    fireEvent.click(await screen.findByRole('button', { name: 'Access to PTI stock for PT Sample Packaging Indonesia' }));
    fireEvent.click(panel().getByTestId('access-remove'));
    await waitFor(() => expect(stockAccessStore.get('sup-007')!.active).toBe(false));
    expect(stockAccessStore.get('sup-007')!.log.map((e) => e.action)).toEqual(['grant', 'remove']);
  });

  it('a seat without the planning lane sees the handoff, not the controls', async () => {
    renderWithProviders(<BuyerSupplierAccess />, { identity: { ...BUYER, businessRoles: ['finance'] } });
    await screen.findByTestId('access-row-sup-007');
    expect(screen.getAllByTestId('handoff-stock-access').length).toBeGreaterThan(0);
  });
});

describe('Capacity (REQ-E08-04)', () => {
  it('supplier: a week below demand cannot be submitted without a reason; with one it is saved', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: 'Closures' }));
    const inputs = await screen.findAllByLabelText(/Allocated capacity for the week of/);
    expect(inputs).toHaveLength(13);
    inputs.forEach((input) => fireEvent.change(input, { target: { value: '14000' } }));
    fireEvent.change(inputs[1], { target: { value: '10000' } });
    expect(screen.getByTestId('capacity-refusal')).toHaveTextContent('below PTI demand');
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason for the week of/), { target: { value: 'capacity' } });
    expect(screen.queryByTestId('capacity-refusal')).toBeNull();
    fireEvent.click(screen.getByTestId('capacity-submit'));
    await waitFor(() =>
      expect(capacityStore.all().some((c) => c.supplierId === 'sup-007' && c.materialGroup === 'MG-21' && c.weeks[1].reason === 'capacity')).toBe(true),
    );
  });

  it('PTI: capacity against demand with the gap week highlighted (AC-03)', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER });
    const plan = await screen.findByTestId('capacity-plan-sup-007-MG-20');
    expect(plan).toHaveTextContent('Gap');
    expect(within(plan).getAllByTestId(/capacity-gap-sup-007-MG-20-/)).toHaveLength(1);
    expect(plan).toHaveTextContent('Material');
  });
});

describe('Alerts (REQ-E08-05)', () => {
  it('grouped by supplier, High first; closing needs an action note and moves it to Closed', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER });
    expect(await screen.findByTestId('pti-alerts-banner')).toBeInTheDocument();
    const group = screen.getByTestId('alert-group-sup-002');
    const alert = within(group).getByTestId('alert-ptiBelowRop|RM-STEAR-7300|sup-002');
    expect(alert).toHaveTextContent('PTI stock is below the PTI reorder point');
    expect(within(alert).getByText('High')).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: /Close alert/ }));
    expect(panel().getByTestId('alert-close-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('What was done'), { target: { value: 'Earlier call-off requested' } });
    fireEvent.click(panel().getByTestId('alert-close-submit'));
    await waitFor(() => expect(inventoryAlertLedger.all()).toEqual([expect.objectContaining({ key: 'ptiBelowRop|RM-STEAR-7300|sup-002', kind: 'closed' })]));
    // The hand-written geopolitical banners are not part of the alert experience.
    expect(screen.queryByText(/geopolitic/i)).toBeNull();
  });
});

describe('Home tasks', () => {
  it('PTI: High alerts and capacity gaps', async () => {
    renderWithProviders(<BuyerHome />, { identity: PLANNER });
    expect(await screen.findByTestId('home-task-inventory-high-alerts')).toHaveTextContent('High-risk inventory and capacity alerts');
    expect(await screen.findByTestId('home-task-capacity-gaps')).toHaveTextContent('Suppliers with capacity below demand');
  });

  it('supplier: stale stock, capacity confirmations due, and its own alerts', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-stale-stock')).toHaveTextContent('Stock figures to update');
    expect(await screen.findByTestId('home-task-capacity-due')).toHaveTextContent('Capacity confirmations due');
    const alerts = await screen.findByTestId('supplier-home-alerts');
    expect(alerts).toHaveTextContent('Your stock figures are out of date');
    expect(alerts).not.toHaveTextContent('PTI stock is below');
  });
});
