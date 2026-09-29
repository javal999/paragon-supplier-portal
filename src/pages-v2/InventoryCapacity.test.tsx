// ─────────────────────────────────────────────────────────────────────────────
// Inventory & capacity on the screens (REQ-E08-01 to REQ-E08-05): the PTI and
// supplier Stock pages, supplier access, capacity on both sides, alerts, the
// menu and the Home tasks. Every walk that acts ends in the STORE or the READ.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useLocation } from 'react-router-dom';
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
import { reasonCodeStore } from '../services/transitions/reasonCodes';
import { STOCK_TEMPLATE_FIELDS, type StockTemplateField } from '../services/transitions/inventoryRules';
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
    expect(planning.items.map((i) => i.path)).toEqual(['/supplier/forecasts', '/supplier/fs-reconcile', '/supplier/inventory', '/supplier/capacity']);
  });

  it('every new string exists in EN and ID', () => {
    expect(Object.keys(inventoryCapacityId).sort()).toEqual(Object.keys(inventoryCapacityEn).sort());
  });
});

describe('PTI Inventory (REQ-E08-01)', () => {
  it('shows supplier SOH, PTI SOH and ROP, supplier ROP ("Not provided"), incoming split, risk class with its basis and stale flag — and no available stock', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    const stear = await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    expect(stear).toHaveTextContent('4,200 KG');
    expect(stear).toHaveTextContent('900 KG');
    expect(stear).toHaveTextContent('2,500 KG');
    expect(stear).toHaveTextContent('5,000 KG');
    // PREMISE CHANGED (BL-46, CR-24): the cell showed the CR-02 band ("10 days ·
    // Critical"). It now shows the risk class against the supplier lead time and
    // says which basis decided it.
    expect(within(stear).getByText(/10 days · High/)).toBeInTheDocument();
    expect(within(stear).getByText('Lead time 21 days')).toBeInTheDocument();
    expect(stear).toHaveTextContent(/In production\s*6,000/);
    const glycerin = screen.getByTestId('pti-stock-row-sup-002-RM-EMUL-3310');
    expect(glycerin).toHaveTextContent('Not provided');
    expect(within(glycerin).getByText('Out of date')).toBeInTheDocument();
    expect(screen.queryByText(/available/i)).toBeNull();
  });

  it('BL-46 — each row says which basis decided its risk: lead time, or the fallback bands', async () => {
    renderWithProviders(<BuyerInventory />, { identity: PLANNER });
    await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    const fallback = screen.getByTestId('risk-sup-010-RM-EMUL-9430');
    expect(fallback).toHaveTextContent('6 days · High');
    expect(fallback).toHaveTextContent('No lead time · day bands: Critical');
    // Known-false: a lead-time row never claims the fallback.
    expect(screen.getByTestId('risk-sup-002-RM-STEAR-7300')).not.toHaveTextContent('day bands');
    expect(screen.getByTestId('pti-inventory-banner-lead-time')).toHaveTextContent(
      'Materials with no supplier lead time on record, using the day bands: 1',
    );
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

describe('One stock entry (BL-60, REQ-E08-02 BR-06, BR-09, BR-10, AC-04, AC-05)', () => {
  // The manual form's label for each template field. The material is chosen
  // from a list and the unit is the material's (shown in every label), so those
  // two template columns have no typed counterpart — everything else must match.
  const MANUAL_LABEL: Record<StockTemplateField, RegExp | null> = {
    materialCode: /^Material$/,
    soh: /^Stock on hand \(PCS\)$/,
    unit: null,
    supplierRop: /^Supplier reorder point \(PCS\)$/,
    inProductionQty: /^In production \(PCS\)$/,
    productionCompletionDate: /^Expected production completion$/,
    batchNumber: /^Batch number$/,
    batchQty: /^Quantity$/,
    manufacturingDate: /^Manufacturing date$/,
    expiryDate: /^Expiry date$/,
  };

  const openManual = async (material = 'PK-PETB-8801') => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('stock-entry-open'));
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: material } });
  };

  it('AC-04: the manual form carries every template field, and nothing the template lacks', async () => {
    await openManual();
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    for (const f of STOCK_TEMPLATE_FIELDS) {
      const label = MANUAL_LABEL[f.field];
      if (label) expect(panel().getByLabelText(label), f.field).toBeInTheDocument();
    }
    // Every typeable control in the panel maps to a template field. The material
    // picker's search box (Material C3, MR-3 BR-04) only narrows the Material
    // list — it records nothing — so it is part of the materialCode field.
    const search = panel().getByTestId('stock-entry-material-search');
    const controls = [...document.querySelectorAll('aside[role="dialog"] input, aside[role="dialog"] select')].filter(
      (c) => !search.contains(c),
    );
    expect(search.querySelectorAll('input')).toHaveLength(1);
    expect(controls).toHaveLength(STOCK_TEMPLATE_FIELDS.filter((f) => MANUAL_LABEL[f.field] !== null).length);
  });

  it('manufacturing date: after expiry or in the future blocks Save; a valid one is saved', async () => {
    await openManual();
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '500' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'MD-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '500' } });
    fireEvent.change(panel().getByLabelText('Expiry date'), { target: { value: '2027-01-31' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), { target: { value: '2027-02-01' } });
    expect(panel().getByTestId('stock-entry-batch-date-0')).toHaveTextContent('cannot be after the expiry date');
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Expiry date'), { target: { value: '' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), { target: { value: '2099-01-01' } });
    expect(panel().getByTestId('stock-entry-batch-date-0')).toHaveTextContent('cannot be in the future');
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    const made = sdcClock.now().slice(0, 10);
    fireEvent.change(panel().getByLabelText('Manufacturing date'), { target: { value: made } });
    expect(panel().queryByTestId('stock-entry-batch-date-0')).toBeNull();
    fireEvent.click(panel().getByTestId('stock-entry-submit'));
    await waitFor(() =>
      expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-PETB-8801')!.batches).toEqual([
        { batchNumber: 'MD-1', qty: 500, uom: 'PCS', manufacturingDate: made },
      ]),
    );
  });

  it('AC-05: in transit sits beside in production, read-only, naming its call-offs', async () => {
    await openManual();
    const transit = panel().getByTestId('stock-entry-in-transit');
    expect(within(transit).getByTestId('stock-entry-in-transit-qty').textContent).not.toBe('0');
    expect(within(transit).getByTestId('stock-entry-in-transit-source')).toHaveTextContent(/CO-\d{4}-\d{4}/);
    // Not a control of any kind — it cannot be typed.
    expect(transit.querySelector('input, select, textarea, [contenteditable]')).toBeNull();
    expect(panel().queryByLabelText(/In transit/)).toBeNull();
  });

  it('template: in transit shown read-only per material, and a manufacturing date column is saved', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const incoming = await screen.findByTestId('stock-upload-incoming');
    const bottle = within(incoming).getByTestId('stock-upload-in-transit-PK-PETB-8801');
    expect(within(bottle).getByTestId('stock-upload-in-transit-PK-PETB-8801-source')).toHaveTextContent(/CO-/);
    expect(incoming.querySelector('input, select, textarea')).toBeNull();
    const made = sdcClock.now().slice(0, 10);
    const csv = [
      'Material code,Stock on hand,Unit,Batch number,Batch quantity,Manufacturing date (YYYY-MM-DD),Expiry date (YYYY-MM-DD)',
      `PK-CAPF-8820,300,PCS,T-1,300,${made},2028-01-01`,
      'PK-PETB-8802,300,PCS,T-2,300,2099-01-01,',
    ].join('\n');
    fireEvent.change(screen.getByTestId('stock-upload-file'), { target: { files: [new File([csv], 's.csv', { type: 'text/csv' })] } });
    const result = await screen.findByTestId('stock-upload-result');
    expect(within(result).getByTestId('stock-upload-saved')).toHaveTextContent('Materials saved: 1');
    expect(within(result).getByTestId('stock-upload-refused-row-3')).toHaveTextContent('The manufacturing date is in the future');
    expect(inventoryDeclarationStore.latestFor('sup-007', 'PK-CAPF-8820')!.batches).toEqual([
      { batchNumber: 'T-1', qty: 300, uom: 'PCS', manufacturingDate: made, expiryDate: '2028-01-01' },
    ]);
  });
});

describe('Supplier-triggered sync and PTI refresh (BL-59, REQ-E08-02 BR-03, BR-11, AC-02, AC-06)', () => {
  const seat = (supplierId: string, supplierName: string): CurrentIdentity => ({
    personaType: 'supplier',
    supplierId,
    supplierName,
    businessRoles: SEEDED_SEAT_ROLES.supplier,
    actor: NO_PERSON,
  });

  it('an API-connected supplier syncs its own stock; the result is stored and the time shown', async () => {
    renderWithProviders(<SupplierInventory />, { identity: seat('sup-001', 'PT Sample Oleochemicals') });
    const erp = await screen.findByTestId('sup-sync-erp');
    expect(within(erp).getByTestId('sample-data-badge')).toBeInTheDocument();
    expect(within(erp).getByTestId('sup-sync-status')).toHaveTextContent('Not synced yet');
    fireEvent.click(within(erp).getByTestId('sup-sync-button'));
    await waitFor(() => expect(stockSyncStore.all().some((a) => a.supplierId === 'sup-001' && a.outcome === 'success')).toBe(true));
    expect(inventoryDeclarationStore.latestFor('sup-001', 'RM-LAURIC-7200')).toMatchObject({ totalQty: 9000, channel: 'api' });
    await waitFor(() => expect(within(erp).getByTestId('sup-sync-status')).toHaveTextContent('Last synced'));
  });

  it('a failed sync shows the error and time, and the previous figures stay, marked out of date', async () => {
    renderWithProviders(<SupplierInventory />, { identity: seat('sup-003', 'PT Sample Fragrance House') });
    expect(await screen.findByTestId('sup-sync-error')).toHaveTextContent('the supplier system did not respond');
    expect(screen.getByTestId('sup-sync-error')).toHaveTextContent('previous figures kept and marked out of date');
    expect(screen.getByTestId('sup-stock-row-FR-WARD-4410')).toHaveTextContent('Out of date');
  });

  it('a supplier that is not API-connected has no Sync', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('sup-stock-row-PK-PETB-8801');
    expect(screen.queryByTestId('sup-sync-erp')).toBeNull();
    expect(screen.queryByTestId('sup-sync-button')).toBeNull();
  });

  it('a supplier with a PTI grant refreshes PTI stock for the granted materials only', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('sup-pti-refresh-button'));
    const result = await screen.findByTestId('sup-pti-refresh-result');
    const listed = [...result.querySelectorAll('[data-testid^="sup-pti-refresh-"]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter((id) => id !== 'sup-pti-refresh-result');
    expect(listed).toEqual(['sup-pti-refresh-PK-PETB-8801', 'sup-pti-refresh-PK-PETB-8802']);
    expect(within(result).getByTestId('sup-pti-refresh-PK-PETB-8801')).toHaveTextContent('30,000 PCS');
    expect(within(result).queryByTestId('sup-pti-refresh-PK-CAPF-8820')).toBeNull();
  });

  it('without a grant the PTI refresh is not offered at all', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUP_002 });
    await screen.findByTestId('sup-stock-row-RM-STEAR-7300');
    expect(screen.queryByTestId('sup-pti-refresh')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh PTI stock' })).toBeNull();
  });

  it('a removed grant removes the refresh on the next load', async () => {
    stockAccessStore.reset();
    const grant = stockAccessStore.get('sup-007')!;
    stockAccessStore.put({ ...grant, active: false, materials: [] });
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('sup-stock-row-PK-PETB-8801');
    expect(screen.queryByTestId('sup-pti-refresh')).toBeNull();
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
  it('supplier: a week below the LTP cannot be submitted without a reason; with one it is saved', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
    const inputs = await screen.findAllByLabelText(/Allocated capacity for the week of/);
    expect(inputs).toHaveLength(13);
    // 80,000 covers every week's LTP for rigid plastics (the highest is 77,900).
    inputs.forEach((input) => fireEvent.change(input, { target: { value: '80000' } }));
    expect(screen.queryByTestId('capacity-refusal')).toBeNull();
    fireEvent.change(inputs[1], { target: { value: '10000' } });
    expect(screen.getByTestId('capacity-refusal')).toHaveTextContent('below the LTP');
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason for the week of/), { target: { value: 'capacity' } });
    expect(screen.queryByTestId('capacity-refusal')).toBeNull();
    fireEvent.click(screen.getByTestId('capacity-submit'));
    await waitFor(() =>
      expect(capacityStore.all().some((c) => c.supplierId === 'sup-007' && c.materialGroup === 'MG-20' && c.weeks[1].reason === 'capacity')).toBe(true),
    );
  });

  it('PTI: capacity against demand with the gap week highlighted (AC-03)', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER });
    const plan = await screen.findByTestId('capacity-plan-sup-007-MG-20');
    expect(plan).toHaveTextContent('Gap');
    expect(within(plan).getAllByTestId(/capacity-gap-sup-007-MG-20-/)).toHaveLength(1);
    expect(plan).toHaveTextContent('Material');
  });

  it('BL-62 / owner 2026-09-29: "Additional capacity", explained on both sides with BE; the old labels are gone', async () => {
    const sup = renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER });
    expect(await screen.findByRole('columnheader', { name: /^Additional capacity \(/ })).toBeInTheDocument();
    expect(screen.getByTestId('capacity-upside-help')).toHaveTextContent('above the capacity you allocate');
    expect(screen.getByTestId('capacity-upside-help')).toHaveTextContent('BE = capacity + additional capacity');
    expect(screen.getAllByLabelText(/^Additional capacity for the week of/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Upside/)).toBeNull();
    expect(screen.queryByText(/Extra capacity if requested/)).toBeNull();
    // One demand figure: the LTP column, and no "PTI demand" column beside it.
    expect(screen.getByRole('columnheader', { name: /^LTP, current forecast \(/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /PTI demand/ })).toBeNull();
    sup.unmount();
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER });
    const plan = await screen.findByTestId('capacity-plan-sup-007-MG-20');
    expect(within(plan).getByRole('columnheader', { name: /^Additional capacity \(/ })).toBeInTheDocument();
    expect(within(plan).getByTestId('capacity-upside-help-sup-007-MG-20')).toHaveTextContent('above its allocation');
    expect(within(plan).queryByRole('columnheader', { name: /PTI demand/ })).toBeNull();
    expect(screen.queryByText(/Upside/)).toBeNull();
    expect(screen.queryByText(/Extra capacity if requested/)).toBeNull();
    // ID wording as ruled.
    expect(inventoryCapacityId['inv.capacity.col.upside']).toBe('Kapasitas tambahan ({{uom}})');
  });

});

describe('Planner capacity filters (BL-63, REQ-E08-04 BR-07, AC-04)', () => {
  let search = '';
  const LocationProbe: React.FC = () => {
    search = useLocation().search;
    return null;
  };
  const renderAt = (query = '') =>
    renderWithProviders(
      <>
        <BuyerCapacity />
        <LocationProbe />
      </>,
      { identity: PLANNER, route: `/buyer/capacity${query}` },
    );
  const planIds = () =>
    screen.queryAllByTestId(/^capacity-plan-/).map((el) => el.getAttribute('data-testid')!.replace('capacity-plan-', ''));

  it('supplier, material group and material narrow the view and are written to the address', async () => {
    renderAt();
    await screen.findByTestId('capacity-plan-sup-007-MG-20');
    // BL-133 — a supplier with an LTP in a group has a capacity plan for it, so
    // sup-012 (MG-20) and sup-005 (MG-02) join from the current forecast.
    expect(planIds()).toHaveLength(15);
    expect(planIds()).toEqual(expect.arrayContaining(['sup-012-MG-20', 'sup-005-MG-02']));
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'sup-002' } });
    expect(planIds().sort()).toEqual(['sup-002-MG-02', 'sup-002-MG-03', 'sup-002-MG-10']);
    expect(new URLSearchParams(search).get('supplier')).toBe('sup-002');
    fireEvent.change(screen.getByLabelText('Material group'), { target: { value: 'MG-02' } });
    expect(planIds()).toEqual(['sup-002-MG-02']);
    expect(new URLSearchParams(search).get('materialGroup')).toBe('MG-02');
    fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Material group'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Material'), { target: { value: 'RM-EMUL-3310' } });
    expect(planIds().sort()).toEqual(['sup-002-MG-03', 'sup-005-MG-03']);
    expect(new URLSearchParams(search).get('materialCode')).toBe('RM-EMUL-3310');
    expect(new URLSearchParams(search).has('supplier')).toBe(false);
  });

  it('gap weeks only: only plans with a gap, and only their gap weeks', async () => {
    renderAt();
    await screen.findByTestId('capacity-plan-sup-007-MG-20');
    fireEvent.click(screen.getByTestId('capacity-filter-gaps'));
    expect(planIds()).toEqual(['sup-007-MG-20']);
    expect(new URLSearchParams(search).get('gapsOnly')).toBe('1');
    const rows = within(screen.getByTestId('capacity-plan-sup-007-MG-20')).getAllByRole('row');
    expect(rows).toHaveLength(2); // the header row and the one gap week
    expect(within(screen.getByTestId('capacity-plan-sup-007-MG-20')).getAllByTestId(/capacity-gap-/)).toHaveLength(1);
  });

  it('a filtered address reloads to the same view, and composes with the status chips', async () => {
    renderAt('?supplier=sup-002');
    await screen.findByTestId('capacity-plan-sup-002-MG-02');
    expect(planIds()).toHaveLength(3);
    expect(screen.getByLabelText('Supplier')).toHaveValue('sup-002');
    fireEvent.click(screen.getByRole('radio', { name: /^Confirmed \(1\)$/ }));
    expect(planIds()).toEqual(['sup-002-MG-02']);
  });

  it('composes with the Order summary PO filter', async () => {
    renderAt('?po=po-007&from=order-summary&gapsOnly=1');
    await screen.findByTestId('po-filter-banner');
    expect(planIds()).toEqual(['sup-007-MG-20']);
  });

  it('an empty result says so and offers to clear the filters, which restores every plan', async () => {
    renderAt('?supplier=sup-010&gapsOnly=1');
    const empty = await screen.findByTestId('capacity-filters-empty');
    expect(empty).toHaveTextContent('No supplier material group matches these filters.');
    expect(planIds()).toEqual([]);
    fireEvent.click(within(empty).getByTestId('capacity-filters-empty-clear'));
    await waitFor(() => expect(planIds()).toHaveLength(15));
    expect(search).toBe('');
  });
});

describe('Alerts (REQ-E08-05)', () => {
  it('grouped by supplier, High first; closing needs a reason, "Other" needs a note, and it moves to Closed', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER });
    expect(await screen.findByTestId('pti-alerts-banner')).toBeInTheDocument();
    const group = screen.getByTestId('alert-group-sup-002');
    const alert = within(group).getByTestId('alert-ptiBelowRop|RM-STEAR-7300|sup-002');
    expect(alert).toHaveTextContent('PTI stock is below the PTI reorder point');
    expect(within(alert).getByText('High')).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: /Close alert/ }));
    // MR-9 BR-04 — no reason: the page's pre-check (the verb's rule) holds the button.
    expect(panel().getByTestId('alert-close-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Reason'), { target: { value: 'other' } });
    expect(panel().getByTestId('alert-close-submit')).toBeDisabled(); // "Other" without a note (AC-02)
    fireEvent.change(panel().getByLabelText('What was done'), { target: { value: 'Earlier call-off requested' } });
    fireEvent.click(panel().getByTestId('alert-close-submit'));
    await waitFor(() =>
      expect(inventoryAlertLedger.all()).toEqual([
        expect.objectContaining({ key: 'ptiBelowRop|RM-STEAR-7300|sup-002', kind: 'closed', closeReason: 'other' }),
      ]),
    );
    // BL-46 — the class says why: cover against the lead time.
    expect(within(alert).getByTestId('alert-basis-ptiBelowRop|RM-STEAR-7300|sup-002')).toHaveTextContent(
      'Cover 10 days · Lead time 21 days',
    );
    // …and the one material with no lead time raises its own alert, on the fallback.
    const missing = screen.getByTestId('alert-leadTimeMissing|RM-EMUL-9430|sup-010');
    expect(missing).toHaveTextContent('No supplier lead time on record');
    expect(missing).toHaveTextContent('Cover 6 days · No lead time · day bands: Critical');
    // The hand-written geopolitical banners are not part of the alert experience.
    expect(screen.queryByText(/geopolitic/i)).toBeNull();
  });
});

describe('Alert close reasons (MR-9 BR-04 to BR-06)', () => {
  const STEAR = 'ptiBelowRop|RM-STEAR-7300|sup-002';
  const STALE = 'staleData|PK-PETB-8810|sup-007';
  const CAPACITY = 'capacityBelowDemand|MG-20|sup-007';
  let search = '';
  const LocationProbe: React.FC = () => {
    search = useLocation().search;
    return null;
  };
  const renderAt = (query = '') =>
    renderWithProviders(
      <>
        <BuyerAlerts />
        <LocationProbe />
      </>,
      { identity: PLANNER, route: `/buyer/alerts${query}` },
    );

  beforeEach(() => {
    reasonCodeStore.reset();
    const at = sdcClock.now();
    inventoryAlertLedger.append([
      { key: STEAR, kind: 'closed', at, closeReason: 'risk-accepted', actor: NO_PERSON },
      { key: STALE, kind: 'closed', at, closeReason: 'supplier-updated', actor: NO_PERSON },
      // Recorded before reasons existed: a note only. It reads, and counts, as Other.
      { key: CAPACITY, kind: 'closed', at, note: 'Second shift agreed', actor: NO_PERSON },
    ]);
  });

  it('a retired reason is no longer offered, and a closure that used it still shows it (AC-03)', async () => {
    reasonCodeStore.append({
      list: 'alertClose',
      code: 'risk-accepted',
      labelEn: 'Risk accepted',
      labelId: 'Risiko diterima',
      active: false,
      setBy: NO_PERSON,
      setAt: sdcClock.now(),
    });
    renderAt('?reason=risk-accepted');
    // The address opens the Closed tab, filtered to that reason.
    expect(await screen.findByTestId(`alert-closure-${STEAR}`)).toHaveTextContent('Risk accepted (retired)');
    expect(screen.queryByTestId(`alert-${STALE}`)).toBeNull();
    // Closing an open alert: the retired code is not in the picker.
    fireEvent.click(screen.getByRole('tab', { name: /^Open/ }));
    const open = screen.getAllByRole('button', { name: /Close alert/ })[0];
    fireEvent.click(open);
    const offered = within(panel().getByLabelText('Reason')).getAllByRole('option').map((o) => o.getAttribute('value'));
    expect(offered).not.toContain('risk-accepted');
    expect(offered).toContain('po-raised');
  });

  it('the Closed tab counts per rule per reason, and the reason filter is kept in the address (AC-04, BR-06)', async () => {
    renderAt();
    await screen.findByTestId('pti-alerts-banner');
    fireEvent.click(screen.getByRole('tab', { name: /^Closed/ }));
    const counts = screen.getByTestId('alert-reason-counts');
    expect(within(counts).getByTestId('alert-reason-count-ptiBelowRop-risk-accepted')).toHaveTextContent(
      'PTI stock is below the PTI reorder pointRisk accepted1',
    );
    expect(within(counts).getByTestId('alert-reason-count-staleData-supplier-updated')).toHaveTextContent('Supplier updated its data1');
    // The note-only closure counts as Other, and keeps its note.
    expect(within(counts).getByTestId('alert-reason-count-capacityBelowDemand-other')).toHaveTextContent('Other (note required)1');
    expect(screen.getByTestId(`alert-closure-${CAPACITY}`)).toHaveTextContent('Other (note required): Second shift agreed');
    fireEvent.change(screen.getByLabelText('Close reason'), { target: { value: 'other' } });
    expect(new URLSearchParams(search).get('reason')).toBe('other');
    expect(screen.getByTestId(`alert-${CAPACITY}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`alert-${STEAR}`)).toBeNull();
    fireEvent.change(screen.getByLabelText('Close reason'), { target: { value: '' } });
    expect(new URLSearchParams(search).has('reason')).toBe(false);
    expect(screen.getByTestId(`alert-${STEAR}`)).toBeInTheDocument();
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
