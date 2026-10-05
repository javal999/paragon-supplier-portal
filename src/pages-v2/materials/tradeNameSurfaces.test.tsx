import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { materialNameStore } from '@services/data/mock/stores/materialNameStore';
import SupplierInventory from '../SupplierInventory';
import BuyerInventory from '../BuyerInventory';
import BuyerTradeNames from './BuyerTradeNames';

// ─────────────────────────────────────────────────────────────────────────────
// Material C2 · supplier trade names on the real pages (MR-3 d; BR-02, BR-05;
// AC-03, AC-05): the supplier's "My materials" tab, the planner's Trade names
// page, and the approved name beside PTI's description on the stock rows.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => materialNameStore.reset());

describe('supplier · My materials', () => {
  it('lists the assigned materials with the approved name and a rejection with its reason', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: '/supplier/inventory?tab=materials' });
    expect((await screen.findByTestId('my-mat-approved-PK-PETB-8810')).textContent).toBe('ClearForm PET 100 (sample)');
    expect(screen.getByTestId('my-mat-reason-PK-CAPF-8820').textContent).toContain('Too general');
    expect(screen.getByTestId('my-mat-row-PK-PETB-8801')).toBeTruthy();
    // AC-03 — another supplier's name never reaches this screen.
    expect(screen.queryByText(/Emulsense|OleoMul/)).toBeNull();
  });

  it('the form refuses a 1-character name (BR-05) and submits a valid one, which then awaits approval', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER, route: '/supplier/inventory?tab=materials' });
    fireEvent.click(await screen.findByTestId('my-mat-edit-PK-PETB-8801'));
    const input = screen.getByTestId('my-materials-trade-name');
    fireEvent.change(input, { target: { value: 'B' } });
    expect(screen.getByTestId('my-materials-refusal').textContent).toContain('2 to 80');
    expect((screen.getByTestId('my-materials-submit') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'Bottle PET 250' } });
    fireEvent.click(screen.getByTestId('my-materials-submit'));
    await waitFor(() => expect(screen.getByTestId('my-mat-state-PK-PETB-8801').textContent).toBe('Awaiting approval'));
  });

  it('the stock row shows the approved name beside PTI’s description', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    expect((await screen.findByTestId('sup-stock-trade-name-PK-PETB-8810')).textContent).toContain('ClearForm PET 100 (sample)');
    expect(screen.queryByTestId('sup-stock-trade-name-PK-PETB-8801')).toBeNull();
  });
});

describe('Material Planning · Trade names', () => {
  it('opens on Awaiting approval; a rejection needs a reason (AC-05); approving moves the name', async () => {
    renderWithProviders(<BuyerTradeNames />, { identity: BUYER, route: '/buyer/materials/trade-names' });
    expect(await screen.findByTestId('tn-row-smn-0004')).toBeTruthy();
    expect(screen.queryByTestId('tn-row-smn-0001')).toBeNull();

    fireEvent.click(screen.getByTestId('tn-reject-smn-0004'));
    const confirm = screen.getByTestId('tn-reject-confirm-smn-0004') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('tn-reject-reason-smn-0004'), { target: { value: '   ' } });
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByText('Cancel'));

    fireEvent.click(screen.getByTestId('tn-approve-smn-0004'));
    await waitFor(() => expect(materialNameStore.get('smn-0004')?.state).toBe('Approved'));
  });

  it('the approved name shows beside PTI’s description on the PTI stock row', async () => {
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    const tab = await screen.findByRole('tab', { name: /Packaging/ });
    fireEvent.click(tab);
    expect((await screen.findByTestId('pti-stock-trade-name-sup-007-PK-PETB-8810')).textContent).toContain('ClearForm PET 100');
  });
});
